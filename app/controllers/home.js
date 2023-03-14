const db = require('../services/db');
const util = require('../util');

function getAccessInfo(req) {
  return {
    event: util.checkLoggedInEvent(req),
    info: util.checkLoggedInInfo(req)
  };
}

module.exports.home = function(req, res) {
  try {
    let accessInfo = getAccessInfo(req);
    res.render('home', {accessInfo});
  } catch(err) {
    util.sendErr(res, err);
  }
};
