module.exports.header = function(companyName) {
  return {
    "type": "section",
    "text": {
      "text": `:studs:  *${companyName}*`,
      "type": "mrkdwn"
    }
  };
};

module.exports.notParticipating = function() {
  return {
    "type": "section",
    "text": {
      "text": `Not participating`,
      "type": "mrkdwn"
    }
  };
};

module.exports.substitute = function(name, attendee) {
  let filledPreText = attendee.has_filled_pre === 0 ? 'no' : 'yes';
  let filledPostText = attendee.has_filled_post === 0 ? 'no' : 'yes';
  return {
    'type': 'section',
    'text': {
      'text': `Substitute: ${name}. Has filled pre: ${filledPreText}. Has filled post: ${filledPostText}.`,
      'type': 'mrkdwn'
    }
  };
};

module.exports.preFilled = function() {
  return {
    "type": "section",
    "text": {
      "text": "`Pre form: `  :filled:",
      "type": "mrkdwn"
    }
  };
};

module.exports.preNotFilled = function(internalId) {
  return {
    'type': 'section',
    'text': {
      'text': `\`Pre form: \`  :not-filled:  <${process.env.URL}/form?internal_id=${internalId}&prepost=0|Link to form>`,
      'type': 'mrkdwn'
    }
  };
};

module.exports.postFilled = function() {
  return {
    "type": "section",
    "text": {
      "text": "`Post form:`  :filled:",
      "type": "mrkdwn"
    }
  };
};

module.exports.postNotFilled = function(internalId) {
  return {
    'type': 'section',
    'text': {
      'text': `\`Post form:\`  :not-filled:  <${process.env.URL}/form?internal_id=${internalId}&prepost=1|Link to form>`,
      'type': 'mrkdwn'
    }
  };
};

module.exports.postNotFilledPending = function() {
  return {
    "type": "section",
    "text": {
      "text": "`Post form:`  :not-filled:  Pending...",
      "type": "mrkdwn"
    }
  };
};

module.exports.postNotFilledPreNotFilled = function() {
  return {
    "type": "section",
    "text": {
      "text": "`Post form:`  :not-filled:  You must fill the pre form first",
      "type": "mrkdwn"
    }
  };
};

module.exports.homeBlock = function(blocks) {
  return {
    type: 'home',
    title: {
      type: 'plain_text',
      text: 'asdf'
    },
    blocks: blocks
  }
};
