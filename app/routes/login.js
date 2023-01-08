const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/login');

const router = express.Router();

router.get('/login', controller.loginGet);

router.get('/logout', controller.logout);

router.post('/login',
  body('password').not().isEmpty(),
  controller.loginPost
);

module.exports = router;
