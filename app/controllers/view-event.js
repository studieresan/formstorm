const db = require('../services/db');
const util = require('../util');
const csvExport = require('../csv-export');
const common = require('./common');
const schedTasks = require('../scheduled-tasks');

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
  let d = Math.floor((new Date(body.date)) / 1000);
  db.updateEvent(body.event_id, body.company_name, d);
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

function setLastSent(event) {
  if (event.last_remind_time === null) {
    event.last_sent = 'Never sent';
    return;
  }

  let d = new Date(event.last_remind_time * 1000).toLocaleString('sv-SE', {dateStyle: "short", timeStyle: "short"});
  let people = event.no_last_reminded;
  event.last_sent = `${d}: Sent to ${people} people`;
}

function toggleAutoRemind(eventId) {
  let event = db.getEvent(eventId);
  let newRemind = event.auto_remind === 1 ? 0 : 1;
  db.updateAutoRemind(eventId, newRemind);
}

function shouldRemind(event) {
  if (event.last_remind_time === null)
    return true;

  let lastSent = new Date(event.last_remind_time * 1000);
  let now = new Date();
  let minutesDiff = Math.floor(((now - lastSent) / 1000) / 60);
  return minutesDiff >= 15;
}

function remindNow(eventId) {
  let event = db.getEvent(eventId);

  if (shouldRemind(event))
    schedTasks.remindIndividualEvent(event);
  else
    throw new util.InternalError(400, 'You must wait 15 minutes between reminders!');
}

module.exports.viewEvent = function(req, res) {
  try {
    util.checkValidation(req);
    let event = getEventAndCheck(req.query.event_id);
    let formTypes = getFormTypes(event.pre_form, event.post_form);
    let attendees = db.getAttendeesAndUserDataByEventId(req.query.event_id);
    util.convertToStringDate([event]);
    setLastSent(event);
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

module.exports.toggleAutoRemind = function(req, res) {
  try {
    util.checkValidation(req);
    toggleAutoRemind(req.body.event_id);
    res.redirect(`/event/view?event_id=${req.body.event_id}`);
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.remindNow = function(req, res) {
  try {
    util.checkValidation(req);
    remindNow(req.body.event_id);
    res.redirect(`/event/view?event_id=${req.body.event_id}`);
  } catch(err) {
    util.sendErr(res, err);
  }
};

