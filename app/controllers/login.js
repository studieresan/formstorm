const util = require('../util');

module.exports.loginPost = function(req, res) {
  try {
    util.checkValidation(req);
    if (req.body.password === process.env.PASSWORD) {
      req.session.loggedIn = true;
      res.redirect('/');
    } else {
      let msg = 'Wrong password';
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
