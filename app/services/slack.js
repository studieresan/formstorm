const { App } = require('@slack/bolt');
const util = require('../util');

const slackApp = new App({
  socketMode: true,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN
});

module.exports.start = async function() {
  util.log('Starting slack app...');
  await slackApp.start();
};

module.exports.app = function() {
  return slackApp;
};

/* ---------------- */
/*    Interface:    */
/* ---------------- */

module.exports.getAllChannels = async function() {
  return slackApp.client.conversations.list({types: 'public_channel, private_channel'});
};

module.exports.getProjectGroup = async function() {
  return slackApp.client.conversations.members({channel: process.env.PROJECT_GROUP_CHANNEL_ID});
};

module.exports.createEventSlack = async function(channelName) {
  return slackApp.client.conversations.create({name: channelName, is_private: false});
};

module.exports.inviteToChannel = async function(users, channel) {
  return slackApp.client.conversations.invite({users: users, channel: channel});
};

module.exports.getChannelMembers = async function(channel) {
  return slackApp.client.conversations.members({channel: channel});
};

module.exports.publishView = async function(slackUserId, view) {
  return slackApp.client.views.publish({user_id: slackUserId, view: view});
};

module.exports.getReactions = async function(channel, timestamp) {
  return slackApp.client.reactions.get({channel: channel, timestamp: timestamp});
};

module.exports.getBotChannels = async function() {
  return slackApp.client.users.conversations({types: 'public_channel, private_channel'});
};

module.exports.getPermalink = async function(channel, timestamp) {
  return slackApp.client.chat.getPermalink({channel: channel, message_ts: timestamp});
};

// Used for sending both to regular channels and DM:s
module.exports.sendMessage = async function(channelOrUserId, msg) {
  return slackApp.client.chat.postMessage({channel: channelOrUserId, text: msg});
};
