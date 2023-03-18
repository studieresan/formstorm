const db = require('../services/db');
const util = require('../util');
const csvExport = require('../csv-export');

function convertNumEvents(forms) {
  forms.forEach((form) => {
    if (form.prepost === 0) {
      form.count = form.cnt_pre;
    } else if (form.prepost === 1) {
      form.count = form.cnt_post;
    }

    if (form.count === null)
      form.count = 0;
  });
}

function setDefaultForm(formTypeId) {
  let form = db.getFormType(formTypeId);
  db.setDefaultForm(formTypeId, form.prepost);
}

function getDefaultForms() {
  let defaultForms = db.getDefaultForms();
  return defaultForms.map((form) => form.form_type_id);
}

function checkFormNameNotExists(formName) {
  let res = db.getFormTypeByName(formName);
  if (res !== undefined)
    throw new util.InternalError(400, `Form with name '${formName}' already exists!`);
}

function getFormType(req) {
  if (req.body.form_type_id === undefined)
    throw new util.InternalError(400, 'form_type_id not supplied!');

  let res = db.getFormType(req.body.form_type_id);

  if (res === undefined)
    throw new util.InternalError(400, 'no such form_type_id!');

  return res;
}

function cloneQuestions(newFormId, oldFormId) {
  let questions = db.getFormQuestions(oldFormId);
  questions.forEach((q) => {
    q.form_type_id = newFormId;
  });
  db.replaceFormQuestions(newFormId, questions);
}

function createDefaultQuestion(newFormTypeId) {
  let q = [{
    "question_number": 1,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "Example question",
      "small_text": ""
    }
  }];
  db.replaceFormQuestions(newFormTypeId, q);
}

function createForm(req) {
  checkFormNameNotExists(req.body.name);
  if (req.body.clone) {
    let formTypeToClone = getFormType(req);
    let newFormTypeId = db.createFormType(req.body.name, req.body.prepost);
    cloneQuestions(newFormTypeId, formTypeToClone.form_type_id);
  } else {
    let newFormTypeId = db.createFormType(req.body.name, req.body.prepost);
    createDefaultQuestion(newFormTypeId);
  }
}

function deleteForm(formTypeId) {
  let formType = db.getFormType(formTypeId);
  if (formType === undefined)
    throw new util.InternalError(400, 'No such form!');
  let events = db.getEventsByFormTypeId(formTypeId);
  if (events.length > 0)
    throw new util.InternalError(400, 'There are events using this form, it cannot be deleted!');
  
  db.replaceFormQuestions(formTypeId, []);
  db.deleteFormType(formTypeId);
}

module.exports.allForms = function(req, res) {
  try {
    let forms = db.getAllFormTypes();
    let defaultForms = getDefaultForms();
    convertNumEvents(forms);
    if (req.query.infoMsg === undefined)
      req.query.infoMsg = '';
    let infoMsg = req.query.infoMsg;
    res.render('all-forms', {forms, defaultForms, infoMsg});
  } catch(err) {
    let msg = util.processErr(err);
    res.render('all-forms', {forms: [], defaultForms: [], infoMsg: msg});
  }
};

module.exports.exportFormsGet = function(req, res) {
  try {
    util.checkValidation(req);
    let event = db.getEvent(req.query.event_id);
    if (event === undefined)
      throw new util.InternalError(400, 'No such event!');
    res.render('export-forms', {event});
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.exportFormsPost = function(req, res) {
  try {
    util.checkValidation(req);
    let fileName = csvExport.exportAnswers(req.body.event_id, req.body.prepost);
    res.download(fileName);
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.setDefault = function(req, res) {
  try {
    util.checkValidation(req);
    setDefaultForm(req.query.form_type_id)
    res.redirect('/info');
  } catch(err) {
    let msg = encodeURIComponent(util.processErr(err));
    res.redirect(`/info?infoMsg=${msg}`);
  }
};

module.exports.updateName = function(req, res) {
  try {
    util.checkValidation(req);
    db.updateFormName(req.body.form_type_id, req.body.name)
    res.redirect('/info');
  } catch(err) {
    let msg = encodeURIComponent(util.processErr(err));
    res.redirect(`/info?infoMsg=${msg}`);
  }
};

module.exports.createForm = function(req, res) {
  try {
    util.checkValidation(req);
    createForm(req);
    res.redirect(`/info?infoMsg=Form successfully created!`);
  } catch(err) {
    let msg = encodeURIComponent(util.processErr(err));
    res.redirect(`/info?infoMsg=${msg}`);
  }
};

module.exports.deleteForm = function(req, res) {
  try {
    util.checkValidation(req);
    deleteForm(req.query.form_type_id);
    res.redirect(`/info?infoMsg=Form successfully deleted!`);
  } catch(err) {
    let msg = encodeURIComponent(util.processErr(err));
    res.redirect(`/info?infoMsg=${msg}`);
  }
};
