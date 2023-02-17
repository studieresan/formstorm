const cron = require('node-cron');
const db = require('./services/db');
const slack = require('./services/slack');
const util = require('./util');
const common = require('./controllers/common');

// Events starting within this many hours should be reminded about:
const remindThreshold = 32;

class ReminderSender {
  persons = {};
  statistics = {
    persons: 0,
    forms: 0
  };

  addEntry(slackUserId, companyName, prepost) {
    if (!(slackUserId in this.persons))
      this.persons[slackUserId] = [];
    this.persons[slackUserId].push({companyName, prepost});
    this.statistics.forms++;
  }

  sendToAll() {
    for (const slackUserId in this.persons) {
      this.sendToPerson(slackUserId);
      this.statistics.persons++;
    }
    return this.statistics;
  }

  sendToPerson(slackUserId) {
    let msg = 'You have the following unanswered forms:\n';
    let entries = this.persons[slackUserId];
    entries.forEach((entry) => {
      let prepost = entry.prepost === 0 ? 'Pre' : 'Post';
      msg += `${entry.companyName}: ${prepost}\n`;
    });
    let demonstrative = entries.length === 1 ? 'this form' : 'these forms';
    msg += `Please fill ${demonstrative} as soon as possible!`;
    slack.sendMessage(slackUserId, msg);
  }
}

function shouldRemindPre(event) {
  let eventD = new Date(event.date * 1000);
  let nowD = new Date();
  nowD.setHours(nowD.getHours() + remindThreshold);
  return nowD >= eventD;
}

function sendFormReminders() {
  let reminderSender = new ReminderSender();
  let events = db.getAllRemindEvents().filter(shouldRemindPre);
  events.forEach((event) => {
    attendees = db.getAttendeesByEventId(event.event_id);
    attendees.self.forEach((attendee) => {
      remindAttendee(reminderSender, attendee.slack_user_id, attendee, event);
    });
    attendees.sub.forEach((attendee) => {
      remindAttendee(reminderSender, attendee.substitute_slack_id, attendee, event);
    });
  });
  return reminderSender.sendToAll();
}

function remindAttendee(reminderSender, slackUserId, attendee, event) {
  if (attendee.has_filled_pre === 0)
    reminderSender.addEntry(slackUserId, event.company_name, 0);
  if (attendee.has_filled_post === 0 && util.pastPost(event))
    reminderSender.addEntry(slackUserId, event.company_name, 1);
}

// 15.00 each day
cron.schedule('0 15 * * *', () => {
  let stat = sendFormReminders();
  util.log(`Reminders have been sent to ${stat.persons} persons concerning ${stat.forms} forms.`);
});

// 09.00 each day
cron.schedule('0 9 * * *', async () => {
  util.log('Updating user db...');
  await common.updateUserDB();
});
