const express = require('express');
const controller = require('../controllers/view-event');
const { query, body } = require('express-validator');
const util = require('../util');

const router = express.Router();

router.get('/view',
  query('event_id').not().isEmpty().toInt(),
  controller.viewEvent
);

router.post('/export-forms',
  body('event_id').not().isEmpty(),
  body('prepost').not().isEmpty().toInt(),
  controller.exportForm
)

router.post('/update',
  body('event_id').not().isEmpty().toInt(),
  body('date').not().isEmpty(),
  body('company_name').not().isEmpty(),
  controller.updateEvent
);

router.post('/toggle-participate',
  body('event_id').not().isEmpty().toInt(),
  body('slack_user_id').not().isEmpty(),
  controller.toggleParticipate
);

router.post('/toggle-auto-remind',
  body('event_id').not().isEmpty().toInt(),
  controller.toggleAutoRemind
);

router.post('/remind-now',
  body('event_id').not().isEmpty().toInt(),
  controller.remindNow
);

module.exports = router;
