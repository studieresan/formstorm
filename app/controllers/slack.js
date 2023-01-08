const db = require('../services/db');
const slack = require('../services/slack');
const util = require('../util');
const common = require('./common');

function checkUserIsInProjectGroup(slackUserId) {
  let member = db.getProjectGroupMember(slackUserId);
  return member !== undefined;
}

function checkUserAlreadySubstitute(substituteSlackId, eventId) {
  let attendee = db.getAttendeeBySubstituteIdAndEventId(substituteSlackId, eventId);
  return attendee !== undefined;
}

async function memberJoined(data) {
  if (!('inviter' in data)) // check that the user was invited by somebody
    return;
  if (!checkUserIsInProjectGroup(data.inviter)) // check inviteR is in the project group
    return;
  if (checkUserIsInProjectGroup(data.user)) // check inviteD is not in the project group
    return;

  let event = db.getEventBySlackChannelId(data.channel);

  if (event === undefined) // check so that this channel corresponds to an actual event
    return;
  if (checkUserAlreadySubstitute(data.user, event.event_id)) // check user is not already substitute for this event
    return;

  // Get attendee before any modifications
  let attendee = db.getAttendeeBySlackUserIdAndEventId(data.inviter, event.event_id);

  // Clear answers and, if it exists, substitute
  let clearRes = await common.clearAnswersAndSub(attendee.slack_user_id, event.event_id);

  // if inviteR already had substitute for this event, notify that one:
  if (attendee.status === 1)
    await common.logAndNotifySubstituteRemoved(attendee.substitute_slack_id, event, clearRes, attendee);
  
  if (clearRes !== 2)
    db.setSubstitute(data.user, data.inviter, event.event_id);

  await common.logAndNotifySubstituteAdded(data, event, clearRes);
}

async function memberLeft(data) {
  if (checkUserIsInProjectGroup(data.user)) // check user is not in the project group
    return;

  let event = db.getEventBySlackChannelId(data.channel);

  if (event === undefined) // check so that this channel corresponds to an actual event
    return;

  let attendee = db.getAttendeeBySubstituteIdAndEventId(data.user, event.event_id);

  if (attendee === undefined) // check user is a substitute for this event
    return;
  
  let clearRes = await common.clearAnswersAndSub(attendee.slack_user_id, event.event_id);
  await common.logAndNotifySubstituteRemoved(data.user, event, clearRes, attendee);
}

function getChannelIdFromCommandStr(str) {
  let res = str.match(/^<#(.*)\|.*>$/);
  if (res && typeof res[1] !== 'undefined')
    return res[1];
  else
    return false;
}

function getSubstitutes(slackChannelId) {
  let event = db.getEventBySlackChannelId(slackChannelId);
  if (event === undefined)
    return 'No such event';

  let subs = db.getSubstituteAttendeesByEventId(event.event_id);
  subs = subs.map((x) => x.real_name);
  if (subs.length > 0)
    return `Substitutes for ${event.company_name}:\n` + subs.join('\n');
  else
    return `No substitutes for ${event.company_name}.`;
}

async function sendFirstJoin(slackUserId) {
  return slack.sendMessage(slackUserId, common.slackMsgFuncs.firstSlackJoinMessage());
}

/* ---------------- */
/*      ROUTES      */
/* ---------------- */

module.exports.teamJoin = async function({event, client}) {
  try {
    util.log('New user joined, adding to db...');
    common.updateUserInDB(event.user);
    await sendFirstJoin(event.user);
    util.log('Done.');
  } catch (err) {
    util.err(err);
  }
};

module.exports.userProfileChanged = async function({event, client}) {
  try {
    util.log('User profile updated, updating DB...');
    common.updateUserInDB(event.user);
    util.log('Done.');
  } catch (err) {
    util.err(err);
  }
};

module.exports.appHomeOpened = async function({event, client}) {
  try {
    await common.updateAppHome(event.user);
  } catch (err) {
    util.err(err);
  }
};

module.exports.memberJoined = async function({event, client}) {
  try {
    await memberJoined(event);
  } catch (err) {
    util.err(err);
  }
};

module.exports.memberLeft = async function({event, client}) {
  try {
    await memberLeft(event);
  } catch (err) {
    util.err(err);
  }
};

module.exports.subCommand = async ({ command, ack, respond }) => {
  try {
    await ack();
    let channelId = getChannelIdFromCommandStr(command.text);
    if (!channelId) {
      await respond('No such event');
    } else {
      let str = getSubstitutes(channelId);   
      await respond(str);
    }
  } catch (err) {
    util.err(err);
  }
};
