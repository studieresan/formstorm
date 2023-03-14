const util = require('../util');

module.exports.performLoginPost = function(req, res) {
  try {
    util.checkValidation(req);
    if (req.body.password === process.env.PASSWORD_EVENT) {
      req.session.loggedInEvent = true;
      res.redirect('/');
    } else {
      let msg = 'Wrong password';
      res.render('login', {infoMsg: msg});
    }
  } catch(err) {
    util.sendErr(res, err);
  }
};

module.exports.performLoginGet = function(req, res) {
  try {
    util.checkValidation(req);
    if (req.query.token === util.loginToken) {
      req.session.loggedIn = true;
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
  res.render('login', {infoMsg: ''});
};

module.exports.logout = function(req, res) {
  req.session.destroy();
  res.redirect('/login');
};
