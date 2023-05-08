const util = require('../util');
const slack = require('../services/slack');
const db = require('../services/db');

async function checkIfBotInChannel(channel, invoker) {
  let channels = await slack.getBotChannels();
  channels = channels.channels.map((x) => x.id);
  if (channels.includes(channel)) {
    return true;
  } else {
    await slack.sendMessage(invoker, 'Please invite me to the channel the message is in first!');
    return false;
  }
}

function excludeNonParticipants(members, channel) {
  let event = db.getEventBySlackChannelId(channel);

  if (event === undefined) {
    // This is not an event channel, so there are no potential users to exclude:
    return members;
  } else {
    let attendees = db.getAttendeesWithSubstitutesByEventId(event.event_id);
    let idsToRemove = attendees.map((x) => x.slack_user_id);
    return members.filter((x) => !idsToRemove.includes(x));
  }
}

// If this is the company reaction channel, exclude those who are 
// in the project group:
function excludeCompanyReaction(members, channel) {
  if (channel !== process.env.REACTION_CHANNEL_ID) {
    return members;
  } else {
    let projectGroupIds = db.getProjectGroup();
    let idsToRemove = projectGroupIds.map((x) => x.slack_user_id);
    return members.filter((x) => !idsToRemove.includes(x));
  }
}

async function getNotReacted(reactions, channel) {
  if (reactions === undefined)
    var reactUsers = [];
  else
    var reactUsers = reactions.map((r) => r.users).flat(1);
  let uniqueReactUsers = [...new Set(reactUsers)];
  let channelMembers = (await slack.getChannelMembers(channel)).members;
  let notReacted = channelMembers.filter(x => !uniqueReactUsers.includes(x) && !process.env.EXCLUDE_IDS.includes(x));
  notReacted = excludeNonParticipants(notReacted, channel);
  return excludeCompanyReaction(notReacted, channel);
}

async function remindDm(shortcut) {
  if (shortcut.channel === undefined || shortcut.message_ts === undefined) {
    await slack.sendMessage(shortcut.user.id, 'You must use this shortcut on a message in some channel!');
    return;
  }

  let channel = shortcut.channel.id;
  let messageTs = shortcut.message_ts;
  let invoker = shortcut.user.id;

  let admin = db.getAdmin(invoker);

  if (!admin.event) {
    await slack.sendMessage(invoker, 'You must have event admin permission to use the remind action! :stuck_out_tongue:');
    return;
  }

  let channelCheck = await checkIfBotInChannel(channel, invoker);
  if (!channelCheck)
    return;
  
  let reactions = (await slack.getReactions(channel, messageTs)).message.reactions;
  let notReacted = await getNotReacted(reactions, channel);
  let messageLink = (await slack.getPermalink(channel, messageTs)).permalink;

  for (let userId of notReacted) {  
    await slack.sendMessage(userId, `Beep beep! You haven't reacted to <${messageLink}|this message>!`);
  }

  if (notReacted.length > 0) {
    let formattedUsers = notReacted.map((id) => `<@${id}>`).join(', ');
    await slack.sendMessage(invoker, `I sent reminders to the following (${notReacted.length}) users: ${formattedUsers}.`);
  } else {
    await slack.sendMessage(invoker, `Everybody has reacted to the message!`);
  }
}

async function listNotReacted(shortcut) {
  if (shortcut.channel === undefined || shortcut.message_ts === undefined) {
    await slack.sendMessage(shortcut.user.id, 'You must use this shortcut on a message in some channel!');
    return;
  }

  let channel = shortcut.channel.id;
  let messageTs = shortcut.message_ts;
  let invoker = shortcut.user.id;

  let channelCheck = await checkIfBotInChannel(channel, invoker);
  if (!channelCheck)
    return;

  let reactions = (await slack.getReactions(channel, messageTs)).message.reactions;
  let notReacted = await getNotReacted(reactions, channel);

  if (notReacted.length > 0) {
    let formattedUsers = notReacted.map((id) => `<@${id}>`).join(', ');
    await slack.sendMessage(invoker, `The following users (${notReacted.length}) have not reacted: ${formattedUsers}.`);
  } else {
    await slack.sendMessage(invoker, `Everybody has reacted to the message!`);
  }
}

module.exports.remindDmShortcut = async function({shortcut, ack}) {
  try {
    await ack();
    await remindDm(shortcut);
  } catch (err) {
    util.err(err);
  }
};

module.exports.listNotReactedShortcut = async function({shortcut, ack}) {
  try {
    await ack();
    await listNotReacted(shortcut);
  } catch (err) {
    util.err(err);
  }
};
