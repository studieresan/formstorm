const sqlite3 = require("better-sqlite3");
const util = require("../util");

const db = sqlite3(process.env.SQLITE3_DB_FILE);
db.pragma("journal_mode = WAL");

module.exports.db = function () {
  return db;
};

/* ---------------- */
/*    Interface:    */
/* ---------------- */

module.exports.getAttendeeByInternalId = function (internalId) {
  let res = db
    .prepare("SELECT * FROM attendees WHERE internal_id=?")
    .all(internalId);
  if (res.length > 1) {
    throw new InternalError(
      500,
      "ERROR: Duplicate internal_ids: " + internalId
    );
  } else if (res.length === 0) {
    return undefined;
  } else {
    return res[0];
  }
};

module.exports.getAttendeeBySlackUserIdAndEventId = function (
  slackUserId,
  eventId
) {
  let stmt = db.prepare(
    "SELECT * FROM attendees WHERE slack_user_id=? AND event_id=?"
  );
  return stmt.get(slackUserId, eventId);
};

module.exports.getAttendeeBySubstituteIdAndEventId = function (
  substituteSlackId,
  eventId
) {
  let stmt = db.prepare(
    "SELECT * FROM attendees WHERE substitute_slack_id=? AND event_id=?"
  );
  return stmt.get(substituteSlackId, eventId);
};

module.exports.getAttendeesByEventId = function (eventId) {
  return {
    self: db
      .prepare("SELECT * FROM attendees WHERE event_id=? AND status=0")
      .all(eventId),
    sub: db
      .prepare("SELECT * FROM attendees WHERE event_id=? AND status=1")
      .all(eventId),
    none: db
      .prepare("SELECT * FROM attendees WHERE event_id=? AND status=2")
      .all(eventId),
  };
};

module.exports.getAttendeesWithSubstitutesByEventId = function (eventId) {
  return db
    .prepare("SELECT * FROM attendees WHERE event_id=? AND status=1")
    .all(eventId);
};

module.exports.getAttendeesAndUserDataByEventId = function (eventId) {
  let sql = `
    SELECT * FROM
      attendees
      LEFT JOIN
      (SELECT slack_user_id AS reg_user_id, real_name AS reg_name FROM user_data) ON attendees.slack_user_id=reg_user_id
      LEFT JOIN
      (SELECT slack_user_id AS sub_user_id, real_name AS sub_name FROM user_data) ON attendees.substitute_slack_id=sub_user_id
    WHERE event_id=?`;
  return db.prepare(sql).all(eventId);
};

module.exports.getNonPostAnsweredAttendees = function (eventId) {
  let stmt = db.prepare(
    "SELECT * FROM attendees WHERE event_id=? AND has_filled_post=0 AND status != 2"
  );
  return stmt.all(eventId);
};

module.exports.getAllAttendeesBySlackUserId = function (slackUserId) {
  let sql = `
    SELECT * FROM (
      SELECT * FROM attendees WHERE slack_user_id=? OR (substitute_slack_id=? AND status=1)
    ) AS attendees INNER JOIN (
      company_events
    ) ON attendees.event_id = company_events.event_id;
  `;
  let stmt = db.prepare(sql);
  return stmt.all(slackUserId, slackUserId);
};

module.exports.getSubstituteAttendeesByEventId = function (eventId) {
  let sql = `
    SELECT * FROM
      attendees
      INNER JOIN
      user_data
      ON substitute_slack_id=user_data.slack_user_id
    WHERE event_id=? AND status=1;`;
  return db.prepare(sql).all(eventId);
};

module.exports.setAttendeeHasFilledPre = function (value, internalId) {
  var stmt = db.prepare(
    "UPDATE attendees SET has_filled_pre=? WHERE internal_id=?"
  );
  stmt.run(value, internalId);
};

module.exports.setAttendeeHasFilledPost = function (value, internalId) {
  var stmt = db.prepare(
    "UPDATE attendees SET has_filled_post=? WHERE internal_id=?"
  );
  stmt.run(value, internalId);
};

module.exports.resetAttendee = function (slackUserId, eventId, internalId) {
  let sql = `UPDATE attendees SET status=0, substitute_slack_id=NULL, has_filled_pre=0, has_filled_post=0, internal_id=?
               WHERE slack_user_id=? AND event_id=?`;
  var stmt = db.prepare(sql);
  stmt.run(internalId, slackUserId, eventId);
};

module.exports.setSubstitute = function (
  substituteSlackId,
  slackUserId,
  eventId
) {
  let sql = `UPDATE attendees SET status=1, substitute_slack_id=?
               WHERE slack_user_id=? AND event_id=?`;
  var stmt = db.prepare(sql);
  stmt.run(substituteSlackId, slackUserId, eventId);
};

module.exports.setAttendeeStatus = function (eventId, slackUserId, status) {
  let sql = `UPDATE attendees SET status=? WHERE slack_user_id=? AND event_id=?`;
  var stmt = db.prepare(sql);
  stmt.run(status, slackUserId, eventId);
};

module.exports.createAttendee = function (eventId, slackId, id) {
  let sql = `INSERT INTO attendees (event_id, status, slack_user_id, substitute_slack_id, has_filled_pre, has_filled_post, internal_id)
               VALUES (?, 0, ?, NULL, 0, 0, ?)`;
  let stmt = db.prepare(sql);
  stmt.run(eventId, slackId, id);
};

// adminType: 1 === event, 2 === info
module.exports.addAdmin = function (slackUserId, adminType) {
  let stmt = db.prepare(
    "INSERT OR IGNORE INTO admins (slack_user_id, event, info) VALUES (?, 0, 0)"
  );
  stmt.run(slackUserId);

  if (adminType === 1)
    stmt = db.prepare("UPDATE admins SET event=1 WHERE slack_user_id=?");
  else if (adminType === 2)
    stmt = db.prepare("UPDATE admins SET info=1 WHERE slack_user_id=?");
  else return new util.InternalError(500, "No such adminType!");
  stmt.run(slackUserId);
};

// returns: {event: true/false, info: true/false}
module.exports.getAdmin = function (slackUserId) {
  let stmt = db.prepare("SELECT * FROM admins WHERE slack_user_id=?");
  let res = stmt.get(slackUserId);
  let perm = { event: false, info: false };

  if (res === undefined) return perm;

  if (res.event === 1) perm.event = true;
  if (res.info === 1) perm.info = true;

  return perm;
};

module.exports.getEvent = function (eventId) {
  let stmt = db.prepare("SELECT * FROM company_events WHERE event_id=?");
  return stmt.get(eventId);
};

module.exports.getEventBySlackChannelId = function (channelId) {
  let stmt = db.prepare("SELECT * FROM company_events WHERE channel_id=?");
  return stmt.get(channelId);
};

module.exports.getEventsByFormTypeId = function (formTypeId) {
  let stmt = db.prepare(
    "SELECT * FROM company_events WHERE pre_form=? OR post_form=?"
  );
  return stmt.all(formTypeId, formTypeId);
};

module.exports.getAllEvents = function () {
  let stmt = db.prepare("SELECT * FROM company_events");
  return stmt.all();
};

module.exports.getAllRemindEvents = function () {
  let stmt = db.prepare(
    "SELECT * FROM company_events WHERE all_answered=0 AND auto_remind=1"
  );
  return stmt.all();
};

module.exports.createEvent = function (
  date,
  companyName,
  description,
  preForm,
  postForm
) {
  let sql = `INSERT INTO company_events
             (date, company_name, description, pre_form, post_form, all_answered, auto_remind, last_remind_time, no_last_reminded)
             VALUES (?, ?, ?, ?, ?, 0, 1, NULL, NULL)`;
  let stmt = db.prepare(sql);
  return stmt.run(date, companyName, description, preForm, postForm);
};

module.exports.getForms = function () {
  let stmt = db.prepare("SELECT * FROM form_types");
  return stmt.all();
};

module.exports.setEventChannelId = function (eventId, channelId) {
  let stmt = db.prepare(
    "UPDATE company_events SET channel_id=? WHERE event_id=?"
  );
  stmt.run(channelId, eventId);
};

module.exports.setAllAnswered = function (eventId) {
  let stmt = db.prepare(
    "UPDATE company_events SET all_answered=1 WHERE event_id=?"
  );
  stmt.run(eventId);
};

module.exports.updateEvent = function (eventId, companyName, date) {
  let stmt = db.prepare(
    "UPDATE company_events SET company_name=?, date=? WHERE event_id=?"
  );
  stmt.run(companyName, date, eventId);
};

module.exports.updateAutoRemind = function (eventId, newRemind) {
  let stmt = db.prepare(
    "UPDATE company_events SET auto_remind=? WHERE event_id=?"
  );
  stmt.run(newRemind, eventId);
};

module.exports.updateLastRemind = function (eventId, remindTime, noPersons) {
  let stmt = db.prepare(
    "UPDATE company_events SET last_remind_time=?, no_last_reminded=? WHERE event_id=?"
  );
  stmt.run(remindTime, noPersons, eventId);
};

module.exports.getDefaultForms = function () {
  let stmt = db.prepare("SELECT * FROM default_form_types");
  return stmt.all();
};

module.exports.setDefaultForm = function (formTypeId, prepost) {
  let stmt = db.prepare(
    "UPDATE default_form_types SET form_type_id=? WHERE prepost=?"
  );
  stmt.run(formTypeId, prepost);
};

module.exports.getFormQuestions = function (formTypeId) {
  let stmt = db.prepare("SELECT * FROM form_questions WHERE form_type_id=?");
  let rows = stmt.all(formTypeId);
  rows.forEach((elem) => {
    elem.value = JSON.parse(elem.value);
  });
  return rows;
};

module.exports.replaceFormQuestions = function (formTypeId, data) {
  let stmt = db.prepare("DELETE FROM form_questions WHERE form_type_id=?");
  stmt.run(formTypeId);

  data.forEach((q) => {
    let sql = `INSERT INTO form_questions (form_type_id, question_number, value, type, mandatory) VALUES (?, ?, ?, ?, ?)`;
    db.prepare(sql).run(
      formTypeId,
      q.question_number,
      JSON.stringify(q.value),
      q.type,
      q.mandatory
    );
  });
};

module.exports.getFormType = function (formTypeId) {
  let stmt = db.prepare("SELECT * FROM form_types WHERE form_type_id=?");
  return stmt.get(formTypeId);
};

module.exports.getFormTypeByName = function (name) {
  let stmt = db.prepare("SELECT * FROM form_types WHERE name=?");
  return stmt.get(name);
};

module.exports.getAllFormTypes = function () {
  let sql = `
    SELECT * FROM
    form_types
    LEFT JOIN (
      SELECT COUNT(event_id) AS cnt_pre, pre_form
      FROM company_events
      GROUP BY pre_form
    ) AS pre
    ON form_types.form_type_id = pre.pre_form
    LEFT JOIN (
      SELECT COUNT(event_id) AS cnt_post, post_form
      FROM company_events
      GROUP BY post_form
    ) AS post
    ON form_types.form_type_id = post.post_form;
  `;
  let stmt = db.prepare(sql);
  return stmt.all();
};

module.exports.createFormType = function (name, prepost) {
  let res = db
    .prepare("INSERT INTO form_types (name, prepost) VALUES (?, ?)")
    .run(name, prepost);
  return res.lastInsertRowid;
};

module.exports.deleteFormType = function (formTypeId) {
  db.prepare("DELETE FROM form_types WHERE form_type_id=?").run(formTypeId);
};

module.exports.updateFormName = function (formTypeId, name) {
  let stmt = db.prepare("UPDATE form_types SET name=? WHERE form_type_id=?");
  return stmt.run(name, formTypeId);
};

module.exports.getProjectGroupMember = function (slackUserId) {
  let stmt = db.prepare("SELECT * FROM project_group WHERE slack_user_id=?");
  return stmt.get(slackUserId);
};

module.exports.getProjectGroup = function () {
  let stmt = db.prepare("SELECT * FROM project_group");
  return stmt.all();
};

module.exports.addToProjectGroup = function (slackUserId) {
  let stmt = db.prepare("INSERT INTO project_group (slack_user_id) VALUES (?)");
  return stmt.run(slackUserId);
};

module.exports.clearProjectGroup = function () {
  let stmt = db.prepare("DELETE FROM project_group");
  return stmt.run();
};

module.exports.getFormAnswers = function (formId) {
  let stmt = db.prepare("SELECT * FROM submitted_answers WHERE form_id=?");
  return stmt.all(formId);
};

module.exports.getAnswersForQuestion = function (
  eventId,
  prepost,
  questionNumber
) {
  let sql = `
    SELECT value FROM
      submitted_forms AS a
      INNER JOIN
      submitted_answers AS b
      ON a.form_id = b.form_id
    WHERE event_id=? AND prepost=? AND question_number=?;`;
  return db.prepare(sql).all(eventId, prepost, questionNumber);
};

module.exports.storeFormSubmissionAnswer = function (
  formId,
  questionNumber,
  answer
) {
  let stmt = db.prepare(
    "INSERT INTO submitted_answers (form_id, question_number, value) VALUES (?, ?, ?)"
  );
  stmt.run(formId, questionNumber, answer);
};

module.exports.deleteSubmittedAnswers = function (formId) {
  let stmt = db.prepare("DELETE FROM submitted_answers WHERE form_id=?");
  stmt.run(formId);
};

module.exports.getFormsByEvent = function (eventId, prepost) {
  let stmt = db.prepare(
    "SELECT * FROM submitted_forms WHERE event_id=? AND prepost=?"
  );
  return stmt.all(eventId, prepost);
};

module.exports.getFormByInternalId = function (internalId, prepost) {
  let stmt = db.prepare(
    "SELECT * FROM submitted_forms WHERE internal_id=? AND prepost=?"
  );
  return stmt.get(internalId, prepost);
};

module.exports.storeForm = function (eventId, prepost, date, internalId) {
  let stmt = db.prepare(
    "INSERT INTO submitted_forms (event_id, prepost, date, internal_id) VALUES (?, ?, ?, ?)"
  );
  return stmt.run(eventId, prepost, date, internalId);
};

module.exports.deleteSubmittedForm = function (formId) {
  let stmt = db.prepare("DELETE FROM submitted_forms WHERE form_id=?");
  return stmt.run(formId);
};

module.exports.getUserData = function (slackUserId) {
  let res = db
    .prepare("SELECT * FROM user_data WHERE slack_user_id=?")
    .all(slackUserId);
  if (res.length > 1) {
    throw new InternalError(500, "ERROR: Duplicate user_data: " + slackUserId);
  } else if (res.length === 0) {
    return undefined;
  } else {
    return res[0];
  }
};

// Useful if there would be some kind of bug that causes missing user_data:
module.exports.getUserDataOrDummy = function (slackUserId) {
  let userData = module.exports.getUserData(slackUserId);
  if (userData === undefined) {
    util.err(
      `WARNING: The user with slack_user_id = ${slackUserId} does not exist in user_data!`
    );
    return {
      real_name: "Unknown",
      slack_user_id: slackUserId,
      has_experience: 0,
    };
  } else {
    return userData;
  }
};

module.exports.getAllUsers = function () {
  return db.prepare("SELECT * FROM user_data").all();
};

module.exports.getAllSubstitutes = function () {
  let sql = `
    SELECT fst.slack_user_id, real_name, count FROM
    (SELECT slack_user_id FROM user_data EXCEPT SELECT slack_user_id FROM project_group) AS fst
    INNER JOIN
    user_data AS snd
    ON fst.slack_user_id = snd.slack_user_id
    LEFT JOIN (
      SELECT COUNT(ROWID) as count, substitute_slack_id
      FROM attendees
      GROUP BY substitute_slack_id
    ) as trd
    ON trd.substitute_slack_id = fst.slack_user_id`;
  return db.prepare(sql).all();
};

module.exports.createUser = function (slackUserId, realName) {
  let stmt = db.prepare(
    "INSERT INTO user_data (slack_user_id, real_name, has_experience) VALUES (?, ?, 0)"
  );
  stmt.run(slackUserId, realName);
};

module.exports.setExperience = function (slackUserId, hasExperience) {
  let stmt = db.prepare(
    "UPDATE user_data SET has_experience=? WHERE slack_user_id=?"
  );
  stmt.run(hasExperience, slackUserId);
};

module.exports.updateUserName = function (slackUserId, realName) {
  let stmt = db.prepare(
    "UPDATE user_data SET real_name=? WHERE slack_user_id=?"
  );
  stmt.run(realName, slackUserId);
};
