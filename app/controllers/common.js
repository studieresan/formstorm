const db = require('../services/db');
const slack = require('../services/slack');
const util = require('../util');
const slackBlocks = require('../slack-blocks');

const slackMsgFuncs = {
  subAddToInviterRes0: function(userId, companyName) {
    return `You've added <@${userId}> as substitute for event ${companyName}.`;
  },
  subAddToInviterRes1: function(userId, companyName) {
    return `You've added <@${userId}> as substitute for event ${companyName}, your pre answer was deleted.`;
  },
  subAddToInviterRes2: function(companyName) {
    return `You cannot add a substitute for event ${companyName} as you already have answered both forms!`;
  },
  subAddToInvited: function(inviterId, companyName, channelId) {
    return `You are now replacing <@${inviterId}> for event ${companyName}. ` +
      `See <#${channelId}> for information about the event, and remember to fill the forms :-)`;
  },
  subRemoveToInvitedRes0: function(companyName) {
    return `You are no longer substitute for event ${companyName}, no forms were filled.`;
  },
  subRemoveToInvitedRes1: function(companyName) {
    return `You are no longer substitute for event ${companyName}, deleted pre form answer.`;
  },
  subRemoveToInviterRes0: function(userId, companyName) {
    return `<@${userId}> is no longer substitute for event ${companyName}.`;
  },
  subRemoveToInviterRes1: function(userId, companyName) {
    return `<@${userId}> is no longer substitute for event ${companyName}, ` +
      `and their pre form answer has been deleted.`;
  },
  firstEventMessage: function() {
    return `I see this is your first event as substitute 2023, congratulations! Remember: you can find the forms by clicking the Home tab above. Also, take a look in <#${process.env.GENERAL_CHANNEL_ID}> for some important general event information.`;
  },
  firstSlackJoinMessage: function() {
    return `Welcome to the Studs 2023 Event Slack! I'm making sure you're filling out the pre and post event forms, which should be done before and after each event. You can find them by clicking the Home tab above.\n\n* Please log in to this workspace on your phone and enable *notifications* for DMs, so that you don't miss substitute requests and form reminders.\n\n* For substitutes: give reactions to the events you are/not are interested in attending in <#${process.env.REACTION_CHANNEL_ID}>!\n\n* Please take a look in <#${process.env.GENERAL_CHANNEL_ID}> for some important information about the events.\n\n* If you have any questions, e.g. about events or a question/bug report about this automated form system, please provide it in <#${process.env.SUPPORT_CHANNEL_ID}>.`;
  },
  checkNamesMessage: function() {
    return 'Please set your *Full name* in your profile properly! (first name and last name)';
  },
  allAnsweredMessage: function(stat) {
    return 'Now everyone has answered the forms, well done! Some statistics:\n' +
      `Event satisfaction: ${stat[0]}/10\n` +
      `Activities: ${stat[1]}/5\n` +
      `Food: ${stat[2]}/5\n`;
  }
};

module.exports.slackMsgFuncs = slackMsgFuncs;

/* --------------------- */
/*       USER DATA       */
/* --------------------- */

async function checkNames() {
  let allUsers = db.getAllUsers();
  allUsers.forEach(async (user) => {
    if (!user.real_name.match(/\p{L}+ \p{L}+/giu)) {
      await slack.sendMessage(user.slack_user_id, slackMsgFuncs.checkNamesMessage());
    }
  });
}

function updateUserEntry(slackUser, dbUser) {
  if (slackUser.real_name !== dbUser.real_name) {
    util.log(`    Updating user name from ${dbUser.real_name} to ${slackUser.real_name}`);
    db.updateUserName(slackUser.id, slackUser.real_name);
  }
}

module.exports.updateUserDB = async function() {
  let slackData = await slack.app().client.users.list();
  for (let i = 0; i < slackData.members.length; i++) {
    let slackUser = slackData.members[i];
    module.exports.updateUserInDB(slackUser);
  }
  await checkNames();
};

module.exports.updateUserInDB = function(slackUser) {
  let user = db.getUserData(slackUser.id);

  if (slackUser.real_name === undefined)
    return;

  if (user === undefined) {
    util.log(`    Creating new user: ${slackUser.real_name}`);
    db.createUser(slackUser.id, slackUser.real_name);
  } else {
    updateUserEntry(slackUser, user);
  }
};

/* --------------------- */
/*    SLACK HOME PAGE    */
/* --------------------- */

function genBlockEntry(slackUserId, attendee) {
  let event = db.getEvent(attendee.event_id);
  let header = slackBlocks.header(event);

  if (attendee.status === 2) {
    return [header, slackBlocks.notParticipating()];
  } else if (attendee.status === 1 && attendee.substitute_slack_id !== slackUserId) {
    let name = db.getUserDataOrDummy(attendee.substitute_slack_id).real_name;
    return [header, slackBlocks.substitute(name, attendee)];
  }

  let pre = {};
  let post = {};
  
  if (attendee.has_filled_pre === 1) {
    pre = slackBlocks.preFilled();
  } else {
    pre = slackBlocks.preNotFilled(attendee.internal_id);
  }

  if (attendee.has_filled_post === 1) {
    post = slackBlocks.postFilled();
  } else if (!util.pastPost(event)) {
    post = slackBlocks.postNotFilledPending();
  } else if (attendee.has_filled_pre === 0) {
    post = slackBlocks.postNotFilledPreNotFilled();
  } else {
    post = slackBlocks.postNotFilled(attendee.internal_id);
  }

  return [header, pre, post];
}

module.exports.updateAppHome = async function(slackUserId) {
  let attendees = db.getAllAttendeesBySlackUserId(slackUserId);
  attendees.reverse(); // the latest added event should be on top
  let blocks = [
    slackBlocks.topBlock(),
    { type: 'divider' }
  ];

  for (let i = 0; i < attendees.length; i++) {
    let newBlocks = genBlockEntry(slackUserId, attendees[i]);
    blocks = [...blocks, ...newBlocks];
    if (i !== attendees.length - 1) {
      blocks.push({ type: 'divider' });
    }
  }

  let view = slackBlocks.homeBlock(blocks);
  return slack.publishView(slackUserId, view);
};

/* --------------------- */
/*      SUBSTITUTES      */
/* --------------------- */

// Returns true if there was a form to be deleted
function deleteFormAndAnswers(internalId, prepost) {
  let submittedForm = db.getFormByInternalId(internalId, prepost);
  if (submittedForm === undefined)
    return;
  db.deleteSubmittedAnswers(submittedForm.form_id);
  let info = db.deleteSubmittedForm(submittedForm.form_id);
  return (info.changes > 0);
}

// Clears possible answers and/or substitute.
// Return codes: 0 == did clear and no forms deleted
//               1 == did clear and 1 form (pre) deleted
//               2 == did not clear because pre and post were both filled
module.exports.clearAnswersAndSub = async function(slackUserId, eventId) {
  let attendee = db.getAttendeeBySlackUserIdAndEventId(slackUserId, eventId);

  // If the user has filled both pre and post, it should not be possible to reset the user:
  if (attendee.has_filled_pre === 1 && attendee.has_filled_post === 1)
    return 2;

  let deletedPre = deleteFormAndAnswers(attendee.internal_id, 0); // 0 === pre
  let internalId = await util.generateInternalId();
  db.resetAttendee(slackUserId, eventId, internalId);

  if (deletedPre)
    return 1;
  else
    return 0;
};

module.exports.logAndNotifySubstituteAdded = async function(data, event, clearRes) {
  let inviterUserData = db.getUserDataOrDummy(data.inviter);
  let invitedUserData = db.getUserDataOrDummy(data.user);
  let inviterName = inviterUserData.real_name;
  let invitedName = invitedUserData.real_name;

  util.log(`${inviterName} added ${invitedName} as substitute for event ${event.company_name}, clearRes = ${clearRes}.`);

  if (clearRes === 0)
    await slack.sendMessage(data.inviter, slackMsgFuncs.subAddToInviterRes0(data.user, event.company_name));
  else if (clearRes === 1)
    await slack.sendMessage(data.inviter, slackMsgFuncs.subAddToInviterRes1(data.user, event.company_name));
  else
    await slack.sendMessage(data.inviter, slackMsgFuncs.subAddToInviterRes2(event.company_name));

  if (clearRes !== 2)
    await slack.sendMessage(data.user, slackMsgFuncs.subAddToInvited(data.inviter, event.company_name, event.channel_id));
  
  if (invitedUserData.has_experience === 0) {
    db.setExperience(data.user, 1);
    await slack.sendMessage(data.user, slackMsgFuncs.firstEventMessage());
  }
};

module.exports.logAndNotifySubstituteRemoved = async function(userRemoved, event, clearRes, attendee) {
  let userName = db.getUserDataOrDummy(userRemoved).real_name;

  util.log(`${userName} is no longer substitute for event ${event.company_name}, clearRes = ${clearRes}.`);
  
  if (clearRes === 0) {
    await slack.sendMessage(userRemoved, slackMsgFuncs.subRemoveToInvitedRes0(event.company_name));
    await slack.sendMessage(attendee.slack_user_id, slackMsgFuncs.subRemoveToInviterRes0(userRemoved, event.company_name));
  } else if (clearRes === 1) {
    await slack.sendMessage(userRemoved, slackMsgFuncs.subRemoveToInvitedRes1(event.company_name));
    await slack.sendMessage(attendee.slack_user_id, slackMsgFuncs.subRemoveToInviterRes1(userRemoved, event.company_name));
  }
};

/* --------------------- */
/*     ALL ANSWERED      */
/* --------------------- */

function getStat(eventId, prepost, questionNumber) {
  let answers = db.getAnswersForQuestion(eventId, prepost, questionNumber);
  answers = answers.filter((a) => {
    return !isNaN(parseInt(a.value));
  });
  let sum = answers.map((a) => {
    return parseInt(a.value);
  }).reduce((prev, curr) => {
    return prev + curr;
  }, 0);
  let len = Math.max(answers.length, 1);
  return sum/len;
}

// Note!
// The following function depends on how the forms are currently constructed.
async function sendAllAnswered(event) {
  let stat = [
    getStat(event.event_id, 1, 6),
    getStat(event.event_id, 1, 9),
    getStat(event.event_id, 1, 10)
  ];
  await slack.sendMessage(event.channel_id, slackMsgFuncs.allAnsweredMessage(stat));
}

module.exports.allAnsweredCheck = async function(eventId) {
  let event = db.getEvent(eventId);

  if (event.all_answered === 1)
    return;
  
  let nonPostAttendees = db.getNonPostAnsweredAttendees(eventId);

  if (nonPostAttendees.length === 0) {
    db.setAllAnswered(eventId);
    await sendAllAnswered(event);
  }
};
