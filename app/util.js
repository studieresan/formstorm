const { validationResult } = require('express-validator');
const crypto = require('crypto');

function parseExpressValidatorErr(msg) {
  errStr = "";
  msg.forEach((elem) => {
    if (typeof elem === "string") {
      errStr += elem + "\n";
    } else if (typeof elem === "object" && "msg" in elem && "param" in elem) {
      errStr += elem.msg + ": " + elem.param + ", ";
    }
  });
  if (errStr.endsWith(', '))
    errStr = errStr.slice(0, -2);
  return errStr;
}

class InternalError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.rawMsg = message;
    this.name = "InternalError";
  }

  processErr() {
    if (this.code === 500) {
      module.exports.err(this.rawMsg);
      return 'Internal server error';
    } else if (typeof this.rawMsg === "string") {
      return this.rawMsg;
    } else if (Array.isArray(this.rawMsg)) {
      return parseExpressValidatorErr(this.rawMsg);
    }
  }
}

module.exports.InternalError = InternalError;

module.exports.checkValidation = function(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new InternalError(400, errors.array());
  }
};

module.exports.log = function(msg) {
  console.log(new Date(), msg);
};

module.exports.err = function(msg) {
  console.error(new Date(), '\x1b[31m', 'Error:', '\x1b[0m');
  console.error(msg);
};

module.exports.processErr = function(errObj) {
  if (typeof errObj === 'object' && errObj instanceof InternalError) {
    return errObj.processErr();
  } else {
    module.exports.err(errObj);
    return 'Internal server error';
  }
};

// Same as above, but instead of returning error string, send the error via 'res'
module.exports.sendErr = function(res, errObj) {
  if (typeof errObj === 'object' && errObj instanceof InternalError) {
    let msg = errObj.processErr();
    res.status(errObj.code).send(msg);
  } else {
    module.exports.err(errObj);
    res.status(500).send('Internal server error');
  }
};

module.exports.pastPost = function(event) {
  let eventD = new Date(event.date * 1000);
  eventD.setHours(eventD.getHours() + parseInt(process.env.EVENT_DURATION));
  let nowD = new Date();
  return nowD >= eventD;
};

module.exports.generateInternalId = async function() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(20, function(err, buffer) {
      if (err) {
        reject(err);
      } else {
        resolve(buffer.toString('hex'));
      }
    });
  });
};

module.exports.convertToStringDate = function(events, locale='sv-SE', options={}) {
  for (let i = 0; i < events.length; i++) {
    events[i].date = new Date(events[i].date * 1000).toLocaleString(locale, options);
  }
};

module.exports.blockUnauthorized = function(req, res, next) {
  if (process.env.PASSWORD !== '' && req.session.loggedIn !== true) {
    res.status(401).send('Unauthorized');
  } else {
    next();
  }
};

module.exports.getFormUrl = function(internalId, prepost) {
  return new URL(`form?internal_id=${internalId}&prepost=${prepost}`, process.env.URL).href;
};
