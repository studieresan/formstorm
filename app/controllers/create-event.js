const db = require("../services/db");
const slack = require("../services/slack");
const util = require("../util");

function validateSlackChannelName(name) {
  if (!/^([a-z0-9-]+)$/.test(name)) {
    throw new util.InternalError(400, "Invalid format of slack channel name");
  }
}

async function checkIfChannelExists(name) {
  let res = await slack.getAllChannels();
  if (
    res.channels.filter((elem) => {
      return elem.name === name;
    }).length > 0
  ) {
    throw new util.InternalError(400, "Slack channel already exists");
  }
}

function getDefaultForms() {
  let defaultForms = db.getDefaultForms();
  return {
    pre: defaultForms
      .filter((x) => x.prepost === 0)
      .map((x) => x.form_type_id)[0],
    post: defaultForms
      .filter((x) => x.prepost === 1)
      .map((x) => x.form_type_id)[0],
  };
}

async function createEventDB(data, projectGroup) {
  let d = Math.floor(new Date(data.date) / 1000);
  let defaultForms = getDefaultForms();
  let info = db.createEvent(
    d,
    data.company_name,
    data.description,
    data.pre_form || defaultForms.pre,
    data.post_form || defaultForms.post
  );
  let eventId = info.lastInsertRowid;

  for (let i = 0; i < projectGroup.length; i++) {
    let slackId = projectGroup[i].slack_user_id;
    let id = await util.generateInternalId();
    db.createAttendee(eventId, slackId, id);
  }

  return eventId;
}

async function addProjectGroupToChannel(projectGroup, channelId) {
  projectGroup = projectGroup.map((x) => x.slack_user_id);
  return slack.inviteToChannel(projectGroup.join(), channelId);
}

async function postNewEventMessage(channelId) {
  return slack.sendMessage(channelId, "Click on me to fill the forms!");
}

module.exports.createEventGet = function (req, res) {
  // Get all per and post forms
  let forms = db.getForms();
  let pre = forms.filter((x) => x.prepost === 0);
  let post = forms.filter((x) => x.prepost === 1);

  res.render("create-event", {
    infoMsg: "",
    data: {
      preForms: pre,
      postForms: post,
    },
  });
};

module.exports.createEventPost = async function (req, res) {
  try {
    util.checkValidation(req);
    validateSlackChannelName(req.body.channel_name);
    let channelName = "event-" + req.body.channel_name;
    await checkIfChannelExists(channelName);
    let projectGroup = db.getProjectGroup();
    let eventId = await createEventDB(req.body, projectGroup);
    let createResponse = await slack.createEventSlack(channelName);
    await addProjectGroupToChannel(projectGroup, createResponse.channel.id);
    db.setEventChannelId(eventId, createResponse.channel.id);
    await postNewEventMessage(createResponse.channel.id);
    let forms = db.getForms();
    res.render("create-event", {
      infoMsg: "Event created!",
      data: {
        preForms: forms.filter((x) => x.prepost === 0),
        postForms: forms.filter((x) => x.prepost === 1),
      },
    });
  } catch (err) {
    let msg = util.processErr(err);
    let forms = db.getForms();
    res.render("create-event", {
      infoMsg: msg,
      data: {
        ...req.body,
        preForms: forms.filter((x) => x.prepost === 0),
        postForms: forms.filter((x) => x.prepost === 1),
      },
    });
  }
};
