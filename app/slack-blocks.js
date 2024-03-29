const util = require('./util');

function getLoginToken(adminInfo) {
  if (adminInfo.event && adminInfo.info)
    return util.loginTokenBoth;
  else if (adminInfo.event)
    return util.loginTokenEvent;
  else if (adminInfo.info)
    return util.loginTokenInfo;
  else
    return '';
}

function addLoginElem(actionsElements, adminInfo) {
  if (adminInfo.event || adminInfo.info) {
    let loginToken = getLoginToken(adminInfo);

    actionsElements.push({
      'type': 'button',
      'text': {
        'type': 'plain_text',
        'text': 'Open admin pages'
      },
      'action_id': 'admin',
      'url': new URL(`login-with-token?token=${loginToken}`, process.env.URL).href
    });
  }
}

function addCreateEventElem(actionsElements, adminInfo) {
  if (adminInfo.event) {
    let loginToken = getLoginToken(adminInfo);

    actionsElements.push({
      'type': 'button',
      'text': {
        'type': 'plain_text',
        'text': 'Create event'
      },
      'action_id': 'create_event',
      'url': new URL(`login-with-token?token=${loginToken}&redirect=/event/create`, process.env.URL).href
    });
  }
}

module.exports.topBlock = function(adminInfo) {
  let actionsElements = [
    {
      'type': 'button',
      'text': {
        'type': 'plain_text',
        'text': 'Refresh'
      },
      'style': 'primary',
      'action_id': 'refresh',
    }
  ];

  addLoginElem(actionsElements, adminInfo);
  addCreateEventElem(actionsElements, adminInfo);

  return {
    'type': 'actions',
    'elements': actionsElements
  };
};

/* Important information about the links below:
   There are two links, one to open a specific event (if logged in as event admin), and one to download
   the forms (if logged in as info admin). Slack has a bug such that, if the link text only contains one
   word or if contains any emojis, the link cannot be clicked on mobile devices (at least Android). So that
   is why the "event" link has a dash (-) followed by a space in front of it. The "forms" link has the text
   "Get forms". The original idea was to have a document emoji representing a form instead to make it more
   compact, but that does not work (as explained above). */
module.exports.header = function(event, adminInfo) {
  let dateEventObj = {date: event.date}; // copy the date value to new object
  util.convertToStringDate([dateEventObj], 'en-UK', {dateStyle: 'medium', timeStyle: 'short'});

  let eventText = `*${event.company_name}*`;
  let infoText = '';
  let loginToken = getLoginToken(adminInfo);

  if (adminInfo.event) {
    let redirectLink = `/event/view?event_id=${event.event_id}`;
    let loginLink = new URL(`login-with-token?token=${loginToken}&redirect=${redirectLink}`, process.env.URL).href;
    eventText = `<${loginLink}|*- ${event.company_name}*>`;
  }

  if (adminInfo.info) {
    let redirectLink = `/info/export-forms?event_id=${event.event_id}`;
    let loginLink = new URL(`login-with-token?token=${loginToken}&redirect=${redirectLink}`, process.env.URL).href;
    infoText = `| <${loginLink}|Get forms>`; // :page_facing_up:
  }

  let text = `:studs:  ${eventText}  ${infoText}  ${dateEventObj.date}`;

  return {
    'type': 'section',
    'text': {
      'text': text,
      'type': 'mrkdwn'
    }
  };
};

module.exports.notParticipating = function() {
  return {
    'type': 'section',
    'text': {
      'text': 'Not participating',
      'type': 'mrkdwn'
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
    'type': 'section',
    'text': {
      'text': '`Pre form: `  :filled:',
      'type': 'mrkdwn'
    }
  };
};

module.exports.preNotFilled = function(internalId) {
  return {
    'type': 'section',
    'text': {
      'text': `\`Pre form: \`  :not-filled:  <${util.getFormUrl(internalId, 0)}|Link to form>`,
      'type': 'mrkdwn'
    }
  };
};

module.exports.postFilled = function() {
  return {
    'type': 'section',
    'text': {
      'text': '`Post form:`  :filled:',
      'type': 'mrkdwn'
    }
  };
};

module.exports.postNotFilled = function(internalId) {
  return {
    'type': 'section',
    'text': {
      'text': `\`Post form:\`  :not-filled:  <${util.getFormUrl(internalId, 1)}|Link to form>`,
      'type': 'mrkdwn'
    }
  };
};

module.exports.postNotFilledPending = function() {
  return {
    'type': 'section',
    'text': {
      'text': '`Post form:`  :not-filled:  Pending...',
      'type': 'mrkdwn'
    }
  };
};

module.exports.postNotFilledPreNotFilled = function() {
  return {
    'type': 'section',
    'text': {
      'text': '`Post form:`  :not-filled:  You must fill the pre form first',
      'type': 'mrkdwn'
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
