const db = require('../services/db');
const util = require('../util');
const path = require('path');
const common = require('./common');
const formValidator = require('../form-question-validation');

const minAnsLengthMandatoryQuestion = 5;

function getFormType(formTypeId) {
  let formType = db.getFormType(formTypeId);
  if (formType === undefined)
    throw new util.InternalError(400, 'Error: No such form_type_id.');
  return formType;
}

function getAttendeeByInternalId(internalId) {
  let attendee = db.getAttendeeByInternalId(internalId);
  if (attendee === undefined) {
    throw new util.InternalError(400, 'no such internal_id');
  } else if (attendee.status === 2) {
    throw new util.InternalError(400, 'user not participating');
  }
  return attendee;
}

function getUserDataByAttendee(attendee) {
  if (attendee.status === 0) {
    var slackUserId = attendee.slack_user_id;
  } else if (attendee.status === 1) {
    var slackUserId = attendee.substitute_slack_id;
  } else {
    throw new util.InternalError(500, `This stage should not be possible to reach`);
  }

  return db.getUserDataOrDummy(slackUserId);
}

function getHasAlreadySubmitted(attendee, prepost) {
  return (prepost === 0 && attendee.has_filled_pre === 1 ||
          prepost === 1 && attendee.has_filled_post === 1);
}

function checkHasNotAlreadySubmitted(attendee, prepost) {
  if (getHasAlreadySubmitted(attendee, prepost)) {
    throw new util.InternalError(400, 'You have already answered this form!');
  }
}

function checkWrongPrePostOrder(attendee, prepost) {
  if (prepost === 1 && attendee.has_filled_pre === 0) {
    throw new util.InternalError(400, 'You must fill the pre-form before you fill the post-form!');
  }
}

function checkPostEventHasPassed(attendee, prepost) {
  if (prepost === 0)
    return;

  let event = db.getEvent(attendee.event_id);
  if (!util.pastPost(event)) {
    throw new util.InternalError(400, 'You cannot fill the post-form before the event has passed!');
  }
}

function getFormTypeId(eventId, prepost) {
  let form = prepost === 0 ? 'pre_form' : 'post_form';
  let event = db.getEvent(eventId);
  return event[form];
}

function validateFormSubmission(attendee, data) {
  if (!Array.isArray(data.answers))
    throw new util.InternalError(400, 'Incorrect form parameters!');

  let formTypeId = getFormTypeId(attendee.event_id, data.prepost);
  let formQuestions = db.getFormQuestions(formTypeId);

  if (formQuestions.length !== data.answers.length)
    throw new util.InternalError(400, 'Too few/too many answers in submission!');

  for (let i = 0; i < formQuestions.length; i++) {
    let question = formQuestions[i];
    let answer = data.answers[question.question_number - 1];
    validateSubmissionAnswer(answer, question);
  }
}

// a == answer, q == question
function validateSubmissionAnswer(a, q) {
  if (a === null || a === undefined || typeof a !== 'string')
    throw new util.InternalError(400, 'Incorrect form parameters!');

  if (q.mandatory === 1) {
    if (a === '')
      throw new util.InternalError(400, `Question number ${q.question_number} is mandatory!`);
  }

  let qData = q.value;

  switch (q.type) {
    case 0:
      if (q.mandatory === 1 && a.length < minAnsLengthMandatoryQuestion)
        throw new util.InternalError(400, `Answer too short on question number ${q.question_number}!`);
      break;
    case 1:
      if (a !== '' && !qData.alternatives.includes(a)) {
        throw new util.InternalError(400, 'Incorrect form parameters!');
      }
      break;
    case 2:
      if (a === '')
        return;
      let aNum = parseInt(a);
      if (isNaN(aNum))
        throw new util.InternalError(400, 'Incorrect form parameters!');
      let maxNum = qData.range;
      if (aNum < 1 || aNum > maxNum)
        throw new util.InternalError(400, 'Incorrect form parameters!');
      break;
  }
}

function storeFormSubmission(attendee, data) {
  let sqlDate = Math.round((new Date()).getTime() / 1000);
  let queryInfo = db.storeForm(attendee.event_id, data.prepost, sqlDate, data.internal_id);
  let formId = queryInfo.lastInsertRowid;
  
  for (let i = 0; i < data.answers.length; i++) {
    db.storeFormSubmissionAnswer(formId, i + 1, data.answers[i]);
  }

  storeHasAnswered(data.internal_id, data.prepost);
}

function storeHasAnswered(internalId, prepost) {
  if (prepost === 0)
    db.setAttendeeHasFilledPre(1, internalId);
  else
    db.setAttendeeHasFilledPost(1, internalId);
}

async function updateHomeAfterFormSubmit(attendee) {
  await common.updateAppHome(attendee.slack_user_id);
  if (attendee.status === 1)
    await common.updateAppHome(attendee.substitute_slack_id);
}

module.exports.getForm = function(req, res) {
  res.sendFile('form.html', {root: path.join(__dirname, '../views')});
};

module.exports.apiGetForm = function(req, res) {
  try {
    util.checkValidation(req);
    let formType = getFormType(req.query.form_type_id);
    let formQuestions = db.getFormQuestions(req.query.form_type_id);
    res.send({formType: formType, formQuestions: formQuestions});
  } catch(err) {
    util.sendErr(res, err);
  }  
};

module.exports.apiGetUserData = function(req, res) {
  try {
    util.checkValidation(req);
    let attendee = getAttendeeByInternalId(req.query.internal_id);
    let event = db.getEvent(attendee.event_id);
    let userData = getUserDataByAttendee(attendee);
    let hasSubmitted = getHasAlreadySubmitted(attendee, req.query.prepost);
    res.send({event, userData, hasSubmitted});
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.apiSubmitForm = async function(req, res) {
  try {
    util.checkValidation(req);
    let attendee = getAttendeeByInternalId(req.body.internal_id);
    checkHasNotAlreadySubmitted(attendee, req.body.prepost);
    checkWrongPrePostOrder(attendee, req.body.prepost);
    checkPostEventHasPassed(attendee, req.body.prepost);
    validateFormSubmission(attendee, req.body);
    storeFormSubmission(attendee, req.body);
    await updateHomeAfterFormSubmit(attendee);
    await common.allAnsweredCheck(attendee.event_id);
    res.send("Success");
  } catch (err) {
    util.sendErr(res, err);
  }
};

module.exports.apiChangeQuestions = async function(req, res) {
  try {
    util.checkValidation(req);
    if (!util.checkLoggedIn(req)) {
      util.sendErr(res, new util.InternalError(400, 'You are not logged in'));
    } else {
      formValidator.validateForm(req.body.data);
      db.replaceFormQuestions(req.body.form_type_id, req.body.data);
      res.send("Success");
    }
  } catch (err) {
    util.sendErr(res, err);
  }
};
