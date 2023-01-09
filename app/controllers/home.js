const db = require('../services/db');
const util = require('../util');

function getSubstitutes() {
  let substitutes = db.getAllSubstitutes();

  // Filter out Slackbot and the event bot:
  substitutes = substitutes.filter((x) => {
    if (x.real_name.toLowerCase() === 'slackbot')
      return false;
    if (process.env.EXCLUDE_IDS.split(',').includes(x.slack_user_id))
      return false;
    
    return true;
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
