const path = require('path');
const crypto = require('crypto');
const express = require('express');
const sessions = require('express-session');
require('dotenv').config();

const homeRoutes = require('./routes/home');
const viewEventRoutes = require('./routes/view-event');
const createEventRoutes = require('./routes/create-event');
const formRoutes = require('./routes/form');
const loginRoutes = require('./routes/login');

const db = require('./services/db');
const util = require('./util');
const common = require('./controllers/common');

// Must be required here for code to run:
require('./routes/slack');
require('./scheduled-tasks');

const slackService = require('./services/slack');
const slackController = require('./controllers/slack');

const webApp = express();
const webPort = process.env.EXPRESS_PORT;
const oneDay = 1000 * 60 * 60 * 24;
const sessionSecret = crypto.randomBytes(32).toString('hex');

webApp.use(sessions({
  secret: sessionSecret,
  saveUninitialized: true,
  cookie: { maxAge: oneDay },
  resave: false 
}));

webApp.use(express.json());
webApp.use(express.urlencoded({ extended: true }));

webApp.set('view engine', 'ejs');
webApp.set('views', path.join(__dirname, 'views'));
webApp.use(express.static(path.join(__dirname, 'public')))

webApp.use('/event', util.blockUnauthorized);

webApp.use('/', homeRoutes);
webApp.use('/event', viewEventRoutes);
webApp.use('/event', createEventRoutes);
webApp.use('/', formRoutes);
webApp.use('/', loginRoutes);

/* Returns the property if it exists, if not,
   returns default value if it's defined, if not,
   returns empty string.
   Function is visible in the view (.ejs) files. */
webApp.locals.getp = function(obj, prop, def) {
  if (prop in obj) {
    return obj[prop];
  } else if (typeof def !== 'undefined') {
    return def;
  } else {
    return "";
  }
};

async function loadProjectGroup() {
  db.clearProjectGroup();
  let res = await slackService.getProjectGroup();
  let counter = 0;
  res.members.forEach((slackUserId) => {
    if (!process.env.EXCLUDE_IDS.split(',').includes(slackUserId)) {
      counter++;
      db.addToProjectGroup(slackUserId);
    }
  });
  util.log(`Project group consisting of ${counter} members.`);
}

(async () => {
  try {
    await slackService.start();

    // Note: During development, when the server is often restarted, it can be a good idea to comment out
    // updateUserDB after the first start, so that the slack api tier limit isn't reached.
    util.log('Updating user db...');
    await common.updateUserDB();

    util.log('Loading project group...');
    await loadProjectGroup();

    util.log('Starting web server...');
    webApp.listen(webPort, () => {
      util.log(`Web server started: listening on port ${webPort}`);
    });
  } catch (err) {
    util.err(err);
    process.exit(1);
  }
})();
