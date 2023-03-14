const express = require('express');
const controller = require('../controllers/all-events');

const router = express.Router();

router.get('/', controller.allEvents);

module.exports = router;
