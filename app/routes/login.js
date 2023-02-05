const express = require('express');
const { body, query } = require('express-validator');
const controller = require('../controllers/login');

const router = express.Router();

router.get('/login', controller.loginGet);

router.get('/logout', controller.logout);

router.post('/login',
  body('password').not().isEmpty(),
  controller.performLoginPost
);

router.get('/login-with-token',
  query('token').not().isEmpty(),
  controller.performLoginGet
);

module.exports = router;
