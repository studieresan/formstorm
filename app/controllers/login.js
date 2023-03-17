const util = require('../util');

function redirect(req, res) {
  if (req.query.redirect) {
    let url = new URL(req.query.redirect, process.env.URL).href;
    res.redirect(url);
  } else {
    res.redirect('/');
  }
}

module.exports.performLoginGet = function(req, res) {
  try {
    util.checkValidation(req);
    if (req.query.token === util.loginTokenEvent) {
      req.session.loggedInEvent = true;
      redirect(req, res);
    } else if (req.query.token === util.loginTokenInfo) {
      req.session.loggedInInfo = true;
      redirect(req, res);
    } else if (req.query.token === util.loginTokenBoth) {
      req.session.loggedInEvent = true;
      req.session.loggedInInfo = true;
      redirect(req, res);
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
