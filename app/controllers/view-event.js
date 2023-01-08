const db = require('../services/db');
const util = require('../util');
const csvExport = require('../csv-export');
const common = require('./common');

function getEventAndCheck(eventId) {
  let event = db.getEvent(eventId);
  if (!event)
    throw new InternalError(400, 'No such event!');
  return event;
}

function getFormTypes(preId, postId) {
  return {
    pre:  db.getFormType(preId),
    post: db.getFormType(postId)
  };
}

function updateEvent(body) {
  let autoRemind = 0;
  if ('auto_remind' in body)
    autoRemind = 1;
  let d = Math.floor((new Date(body.date)) / 1000);
  db.updateEvent(body.event_id, body.company_name, d, autoRemind);
}

async function toggleParticipate(eventId, slackUserId) {
  let attendee = db.getAttendeeBySlackUserIdAndEventId(slackUserId, eventId);
  if (attendee.status === 2) {
    db.setAttendeeStatus(eventId, slackUserId, 0);
  } else {
    let clearRes = await common.clearAnswersAndSub(slackUserId, eventId);
    if (clearRes !== 2)
      db.setAttendeeStatus(eventId, slackUserId, 2);
  }
  await common.allAnsweredCheck(eventId);
}

module.exports.viewEvent = function(req, res) {
  try {
    util.checkValidation(req);
    let event = getEventAndCheck(req.query.event_id);
    let formTypes = getFormTypes(event.pre_form, event.post_form);
    let attendees = db.getAttendeesAndUserDataByEventId(req.query.event_id);
    util.convertToStringDate([event]);
    res.render('view-event', {event: event, attendees: attendees, formTypes: formTypes});
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.updateEvent = function(req, res) {
  try {
    util.checkValidation(req);
    updateEvent(req.body);
    res.redirect(`/event/view?event_id=${req.body.event_id}`);
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.exportForm = function(req, res) {
  try {
    util.checkValidation(req);
    let fileName = csvExport.exportAnswers(req.body.event_id, req.body.prepost);
    res.download(fileName);
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.toggleParticipate = async function(req, res) {
  try {
    util.checkValidation(req);
    await toggleParticipate(req.body.event_id, req.body.slack_user_id);
    res.redirect(`/event/view?event_id=${req.body.event_id}`);
  } catch(err) {
    util.sendErr(res, err);
  }
};
