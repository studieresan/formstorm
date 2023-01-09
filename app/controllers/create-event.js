const db = require('../services/db');
const slack = require('../services/slack');
const util = require('../util');

function validateSlackChannelName(name) {
  if (!(/^([a-z0-9-]+)$/.test(name))) {
    throw new util.InternalError(400, 'Invalid format of slack channel name');
  }
}

async function checkIfChannelExists(name) {
  let res = await slack.getAllChannels();
  if (res.channels.filter((elem) => {return elem.name === name}).length > 0) {
    throw new util.InternalError(400, 'Slack channel already exists');
  }
}

async function createEventDB(data, projectGroup) {
  let d = Math.floor((new Date(data.date)) / 1000);
  let info = db.createEvent(d, data.company_name, data.description, data.pre_form, data.post_form);
  let eventId = info.lastInsertRowid;

  for (let i = 0; i < projectGroup.length; i++) {
    let slackId = projectGroup[i].slack_user_id;
    let id = await util.generateInternalId();
    db.createAttendee(eventId, slackId, id);
  }

  return eventId;
}

async function addProjectGroupToChannel(projectGroup, channelId) {
  projectGroup = projectGroup.map((x) => x.slack_user_id);
  return slack.inviteToChannel(projectGroup.join(), channelId);
}

module.exports.createEventGet = function(req, res) {  
  res.render('create-event', {infoMsg: '', data: {}});
};

module.exports.createEventPost = async function(req, res) {
  try {
    util.checkValidation(req);
    validateSlackChannelName(req.body.channel_name);
    let channelName = 'event-' + req.body.channel_name;
    await checkIfChannelExists(channelName);
    let projectGroup = db.getProjectGroup();
    let eventId = await createEventDB(req.body, projectGroup);
    let createResponse = await slack.createEventSlack(channelName);
    await addProjectGroupToChannel(projectGroup, createResponse.channel.id);
    db.setEventChannelId(eventId, createResponse.channel.id);
    res.render('create-event', {infoMsg: 'Event created!', data: {}});
  } catch(err) {
    let msg = util.processErr(err);
    res.render('create-event', {infoMsg: msg, data: req.body});
  }
};
