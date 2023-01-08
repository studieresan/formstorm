const db = require('../services/db');
const util = require('../util');

function getSubstitutes() {
  let substitutes = db.getAllSubstitutes();

  // Filter out Slackbot and the event bot:
  substitutes = substitutes.filter((x) => {
    return (x.real_name.toLowerCase() !== 'slackbot') &&
      (x.slack_user_id !== process.env.BOT_MEMBER_ID);
  });

  // Sort:
  substitutes.sort((a, b) => {
    return a.real_name.localeCompare(b.real_name);
  });

  return substitutes;
}

module.exports.home = function(req, res) {
  if (process.env.PASSWORD !== '' && req.session.loggedIn !== true) {
    res.redirect('/login');
    return;
  }

  try {
    let events = db.getAllEvents();
    util.convertToStringDate(events);
    let substitutes = getSubstitutes();
    res.render('home', {events, substitutes});
  } catch(err) {
    util.sendErr(res, err);
  }
};
