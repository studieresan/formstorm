const express = require('express');
const { body, query } = require('express-validator');
const controller = require('../controllers/form');
const util = require('../util');

const router = express.Router();

router.get('/form', controller.getForm);

router.get('/api/form/get-form',
  query('form_type_id').not().isEmpty().toInt(),
  controller.apiGetForm
);

router.get('/api/form/get-user-data',
  query('internal_id').not().isEmpty(),
  query('prepost').not().isEmpty().isInt({min: 0, max: 1}).toInt(),
  controller.apiGetUserData
);

router.post('/api/form/submit-form',
  body('internal_id').not().isEmpty(),
  body('prepost').not().isEmpty().isInt({min: 0, max: 1}).toInt(),
  body('answers'),
  controller.apiSubmitForm  
);

module.exports = router;
