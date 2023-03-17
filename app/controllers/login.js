const util = require('../util');

module.exports.performLoginGet = function(req, res) {
  try {
    util.checkValidation(req);
    if (req.query.token === util.loginTokenEvent) {
      req.session.loggedInEvent = true;
      res.redirect('/');
    } else if (req.query.token === util.loginTokenInfo) {
      req.session.loggedInInfo = true;
      res.redirect('/');
    } else if (req.query.token === util.loginTokenBoth) {
      req.session.loggedInEvent = true;
      req.session.loggedInInfo = true;
      res.redirect('/');
    } else {
      let msg = 'Wrong login token';
      res.render('login', {infoMsg: msg});
    }
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.loginGet = function(req, res) {
  res.render('login', {infoMsg: 'Please log in via Slack!'});
};

module.exports.logout = function(req, res) {
  req.session.destroy();
  res.redirect('/login');
};
