const express = require('express');
const controller = require('../controllers/all-forms');
const { query, body } = require('express-validator');

const router = express.Router();

router.get('/', controller.allForms);

router.get('/set-default',
  query('form_type_id').not().isEmpty(),
  controller.setDefault
);

router.post('/update-name',
  body('form_type_id').not().isEmpty(),
  body('name').not().isEmpty(),
  controller.updateName
);

router.post('/create-form',
  body('name').not().isEmpty(),
  body('clone').not().isEmpty().isBoolean().toBoolean(),
  body('prepost').not().isEmpty().isInt({min: 0, max: 1}).toInt(),
  controller.createForm
);

router.get('/delete-form',
  query('form_type_id').not().isEmpty(),
  controller.deleteForm
);

module.exports = router;
