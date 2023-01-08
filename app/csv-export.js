const db = require('./services/db');
const fs = require('fs');
const path = require('path');

function rowToTxt(row) {
  str = '';
  row.forEach((elem) => {
    elem = elem.replaceAll('"', '”');
    elem = '"' + elem + '"';
    str += elem + ',';
  });
  str = str.slice(0, -1);
  return str;
}

function addQuestionsToOutput(questions, outputRows) {
  questions.sort((a, b) => (a.question_number > b.question_number) ? 1 : -1);
  questions = questions.map((q) => {
    return JSON.parse(q.value).question;
  });
  outputRows.push(rowToTxt(questions));
}

function addAllFormsToOutput(forms, outputRows) { 
  forms.forEach((form) => {
    let answers = db.getFormAnswers(form.form_id);
    answers.sort((a, b) => (a.question_number > b.question_number) ? 1 : -1);
    answers = answers.map((q) => q.value);
    outputRows.push(rowToTxt(answers));
  });
}

function saveCsv(outputRows, event, prepost) {
  let str = outputRows.join('\n');
  let fileName = [
    event.company_name.replaceAll(/[^a-z0-9]/ig, ''),
    prepost === 0 ? '-pre-' : '-post-',
    Math.round((new Date()).getTime() / 1000),
    '.csv'
  ].join('');
  let filePath = path.join(process.env.UPLOAD_FOLDER, fileName);
  fs.writeFileSync(filePath, str);
  return filePath;
}

module.exports.exportAnswers = function(eventId, prepost) {
  let outputRows = [];
  let event = db.getEvent(eventId);
  let formTypeId = prepost === 0 ? event.pre_form : event.post_form;
  let questions = db.getFormQuestions(formTypeId);
  let forms = db.getFormsByEvent(eventId, prepost);
  addQuestionsToOutput(questions, outputRows);
  addAllFormsToOutput(forms, outputRows);
  return saveCsv(outputRows, event, prepost);
};
