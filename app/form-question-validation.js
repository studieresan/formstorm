const util = require('./util');
const Ajv = require('ajv');

const ajv = new Ajv();

// The schema for the form questions:
const schema = {
  type: 'array',
  minItems: 1,
  maxItems: 100,
  items: {
    type: 'object',
    required: ['question_number', 'mandatory', 'type', 'value'],
    properties: {
      question_number: {type: 'integer'},
      mandatory: {type: 'integer', minimum: 0, maximum: 1},
      type: {type: 'integer'},
      value: {type: 'object'}
    },
    oneOf: [
      // Text questions (type 0):
      {
        properties: {
          type: {const: 0},
          value: {
            type: 'object',
            required: ['question', 'small_text'],
            properties: {
              question: {type: 'string'},
              small_text: {type: 'string'}
            }
          }
        }
      },
      // Radio box question (type 1):
      {
        properties: {
          type: {const: 1},
          value: {
            type: 'object',
            required: ['question', 'alternatives'],
            properties: {
              question: {type: 'string'},
              alternatives: {
                type: 'array',
                minItems: 1,
                maxItems: 25,
                items: {type: 'string'}
              }
            }
          }
        }
      },
      // Range question (type 2):
      {
        properties: {
          type: {const: 2},
          value: {
            type: 'object',
            required: ['question', 'left', 'right', 'range'],
            properties: {
              question: {type: 'string'},
              left: {type: 'string'},
              right: {type: 'string'},
              range: {type: 'integer', minimum: 1, maximum: 10}
            }
          }
        }
      }
    ]
  }
};

function validateForm(data) {
  let validate = ajv.compile(schema);
  let valid = validate(data);

  if (!valid) {
    util.err('Incorrect form question data:');
    util.err(validate.errors);
    throw new util.InternalError(400, `The submitted data does not have the correct format.`);
  }
  
  data.forEach((elem, i) => {
    let qNumber = parseInt(elem.question_number);
    if (qNumber !== i + 1) {
      throw new util.InternalError(400, `Question numbers not in correct order`);
    }
  }); 
}

module.exports.validateForm = validateForm;
