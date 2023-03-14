const db = require('../services/db');
const util = require('../util');

module.exports.allEvents = function(req, res) {
  try {
    let events = db.getAllEvents();
    util.convertToStringDate(events);
    res.render('all-events', {events});
  } catch(err) {
    util.sendErr(res, err);
  }
};
