const controller = require('../controllers/slack');
const reactionController = require('../controllers/slack-reaction');
const slackApp = require('../services/slack').app();

slackApp.message('hello', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  // await say(`Hey there <@${message.user}>!`);
  await say(`hello`);
});

slackApp.event('team_join', controller.teamJoin);

slackApp.event('user_profile_changed', controller.userProfileChanged);

slackApp.event('app_home_opened', controller.appHomeOpened);

slackApp.event('member_joined_channel', controller.memberJoined);

slackApp.event('member_left_channel', controller.memberLeft);

slackApp.command('/sub', controller.subCommand);

slackApp.command('/admin', controller.adminCommand);

slackApp.shortcut('remind_dm', reactionController.remindDmShortcut);

slackApp.shortcut('list_not_reacted', reactionController.listNotReactedShortcut);

slackApp.action('refresh', controller.refreshAppHome);

slackApp.action('admin', controller.openAdminPages);
