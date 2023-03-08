const util = require('./util');

function validateForm(data) {
  if (!Array.isArray(data))
    throw new util.InternalError(400, 'The data is not an array');

  let i = 0;

  for (let elem of data) {
    i++;
    validateQuestion(elem, i);
  }
}

function validateQuestion(q, i) {
  if (
    !q.hasOwnProperty('question_number') ||
    !q.hasOwnProperty('type') ||
    !q.hasOwnProperty('mandatory') ||
    !q.hasOwnProperty('value')
  ) {
    throw new util.InternalError(400, `Missing property on question number ${i}`);
  }

  let qNumber = parseInt(q.question_number);

  if (isNaN(qNumber))
    throw new util.InternalError(400, `Malformed question_number`);

  if (qNumber !== i)
    throw new util.InternalError(400, `Question number not in correct order`);

  qType = parseInt(q.type);

  if (isNaN(qType))
    throw new util.InternalError(400, `Malformed 'type' on question ${i}`);

  if (qType < 0 || qType > 2)
    throw new util.InternalError(400, `'type' must be in interval [0, 2] (question ${i})`);

  mandatory = parseInt(q.mandatory);

  if (isNaN(mandatory))
    throw new util.InternalError(400, `Malformed 'mandatory' on question ${i}`);

  if (mandatory !== 0 && mandatory !== 1)
    throw new util.InternalError(400, `'mandatory' must be either 0 or 1 (question ${i})`);

  switch (qType) {
    case 0: validateType0(q.value, i); break;
    case 1: validateType1(q.value, i); break;
    case 2: validateType2(q.value, i); break;
  }
}

function validateType0(qValue, i) {
  if (
    !qValue.hasOwnProperty('question') ||
    !qValue.hasOwnProperty('small_text')
  ) {
    throw new util.InternalError(400, `Missing property inside 'value' on question number ${i}`);
  }

  if (
    typeof qValue.question !== 'string' ||
    typeof qValue.small_text !== 'string'
  ) {
    throw new util.InternalError(400, `Incorrect type inside 'value' on question number ${i}`);
  }
}

function validateType1(qValue, i) {
  if (
    !qValue.hasOwnProperty('question') ||
    !qValue.hasOwnProperty('alternatives')
  ) {
    throw new util.InternalError(400, `Missing property inside 'value' on question number ${i}`);
  }

  if (
    typeof qValue.question !== 'string' ||
    !Array.isArray(qValue.alternatives)
  ) {
    throw new util.InternalError(400, `Incorrect type inside 'value' on question number ${i}`);
  }

  if (qValue.alternatives.length < 1 || qValue.alternatives.length > 25)
    throw new util.InternalError(400, `The number of alternatives must be in range [1, 25] (question number ${i})`);

  for (let elem of qValue.alternatives) {
    if (typeof elem !== 'string') {
      throw new util.InternalError(400, `Alternatives must be strings (question number ${i})`);
    }
  }
}

function validateType2(qValue, i) {
  if (
    !qValue.hasOwnProperty('question') ||
    !qValue.hasOwnProperty('left') ||
    !qValue.hasOwnProperty('right') ||
    !qValue.hasOwnProperty('range')
  ) {
    throw new util.InternalError(400, `Missing property inside 'value' on question number ${i}`);
  }

  if (
    typeof qValue.question !== 'string' ||
    typeof qValue.left !== 'string' ||
    typeof qValue.right !== 'string' ||
    typeof qValue.range !== 'number'
  ) {
    throw new util.InternalError(400, `Incorrect type inside 'value' on question number ${i}`);
  }

  qRange = parseInt(qValue.range);

  if (isNaN(qRange))
    throw new util.InternalError(400, `Malformed 'range' on question ${i}`);

  if (qRange < 1 || qRange > 10)
    throw new util.InternalError(400, `'range' must be in interval [1, 10] (question ${i})`);
}

module.exports.validateForm = validateForm;
