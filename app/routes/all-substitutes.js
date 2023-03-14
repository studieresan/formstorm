const express = require('express');
const controller = require('../controllers/all-substitutes');

const router = express.Router();

router.get('/substitutes', controller.allSubstitutes);

module.exports = router;
