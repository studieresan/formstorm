const sqlite3 = require('better-sqlite3');
require('dotenv').config()

const db = sqlite3(process.env.SQLITE3_DB_FILE);
db.pragma('journal_mode = WAL');

function createFormTemplate(json, name, prepost) {
  let res = db.prepare("INSERT INTO form_types (name, prepost) VALUES (?, ?)").run(name, prepost);
  let id = res.lastInsertRowid;
  
  json.forEach((q) => {
    let sql = `INSERT INTO form_questions (form_type_id, question_number, value, type, mandatory) VALUES (?, ?, ?, ?, ?);`;
    db.prepare(sql).run(id, q.question_number, JSON.stringify(q.value), q.type, q.mandatory);
  });
}

function createSchema() {
  let sql = `
    CREATE TABLE attendees (
      event_id             INTEGER,
      status               INTEGER,
      slack_user_id        TEXT,
      substitute_slack_id  TEXT,
      has_filled_pre       INTEGER,
      has_filled_post      INTEGER,
      internal_id          TEXT
    );

    CREATE TABLE admins (
      slack_user_id  TEXT PRIMARY KEY
    );

    CREATE TABLE company_events (
      event_id          INTEGER PRIMARY KEY,
      channel_id        TEXT,
      date              INTEGER,
      company_name      TEXT,
      description       TEXT,
      pre_form          INTEGER,
      post_form         INTEGER,
      all_answered      INTEGER,
      auto_remind       INTEGER,
      last_remind_time  INTEGER,
      no_last_reminded  INTEGER
    );

    CREATE TABLE form_questions (
      form_type_id     INTEGER,
      question_number  INTEGER,
      value            TEXT,
      type             INTEGER,
      mandatory        INTEGER,
      PRIMARY KEY(form_type_id, question_number)
    );

    CREATE TABLE form_types (
      form_type_id  INTEGER PRIMARY KEY,
      name          TEXT,
      prepost       INTEGER
    );

    CREATE TABLE project_group (
      slack_user_id  TEXT
    );

    CREATE TABLE submitted_answers (
      form_id          INTEGER,
      question_number  INTEGER,
      value            TEXT,
      PRIMARY KEY(form_id, question_number)
    );
    
    CREATE TABLE submitted_forms (
      form_id        INTEGER PRIMARY KEY,
      event_id       INTEGER,
      prepost        INTEGER,
      date           INTEGER,
      internal_id    TEXT
    );

    CREATE TABLE user_data (
      slack_user_id   TEXT,
      real_name       TEXT,
      has_experience  INTEGER
    );
  `;

  db.exec(sql);
}

const defaultPreFormJson = `
[
  {
    "question_number": 1,
    "type": 1,
    "mandatory": 1,
    "value": {
      "question": "Do you know what the company does?",
      "alternatives": ["Yes", "Somewhat", "No"]
    }
  },
  {
    "question_number": 2,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "How interested are you in writing your Master's thesis/working at this company?",
      "left": "Not interested",
      "right": "Very interested",
      "range": 5
    }
  },
  {
    "question_number": 3,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "What is your general view of the company?",
      "left": "Not interested",
      "right": "Very interested",
      "range": 5
    }
  },
  {
    "question_number": 4,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "For the company: If you are not interested in working at the company, why is that?",
      "small_text": "Your answer here will be sent to the company, so without censuring, think about what you are writing. For example not interested in the business area, the tasks are not in my interest, the company culture, does not provide opportunities to work abroad etc. If you have no opinion, leave blank."
    }
  },
  {
    "question_number": 5,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "For STUDS: If you are not interested in working at the company, why is that?",
      "small_text": "Your answer here will only be visible for STUDS, if you have nothing to add to the previous answer you can leave it blank. For example not interested in the business area, the tasks are not in my interest, the company culture, does not provide opportunities to work abroad etc. If you have no opinion, leave blank."
    }
  },
  {
    "question_number": 6,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "What is your general opinion/view of the company? If you are interested in working at the company, why is that?",
      "small_text": ""
    }
  }
]
`;

const defaultPostFormJson = `
[
  {
    "question_number": 1,
    "type": 1,
    "mandatory": 1,
    "value": {
      "question": "How did the event affect your opinion / view of the company?",
      "alternatives": ["More positive", "No change", "More negative"]
    }
  },
  {
    "question_number": 2,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "How interested are you in writing your dissertation at this company? (whether or not you already have one)",
      "left": "Not interested",
      "right": "Very interested",
      "range": 5
    }
  },
  {
    "question_number": 3,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "What is your general view of the company?",
      "left": "Not interested",
      "right": "Very interested",
      "range": 5
    }
  },
  {
    "question_number": 4,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "For the company: If you are not interested in working at the company, why is that?",
      "small_text": "Your answer here will be sent to the company, so without censuring, think about what you are writing. For example not interested in the business area, the tasks are not in my interest, the company culture, does not provide opportunities to work abroad etc. If you have no opinion, leave blank."
    }
  },
  {
    "question_number": 5,
    "type": 0,
    "mandatory": 0,
    "value": {
      "question": "For STUDS: If you are not interested in working at the company, why is that?",
      "small_text": "Your answer here will only be visible for STUDS, if you have nothing to add to the previous answer you can leave it blank. For example not interested in the business area, the tasks are not in my interest, the company culture, does not provide opportunities to work abroad etc. If you have no opinion, leave blank."
    }
  },
  {
    "question_number": 6,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "For STUDS: Apart from the specific company, how satisfied are you with the event?",
      "left": "I am super dissatisfied",
      "right": "I am super satisfied",
      "range": 10
    }
  },
  {
    "question_number": 7,
    "type": 1,
    "mandatory": 1,
    "value": {
      "question": "Do you feel qualified to work at this company?",
      "alternatives": ["Yes", "No"]
    }
  },
  {
    "question_number": 8,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "How was the atmosphere for this event?",
      "left": "Not good",
      "right": "Very good",
      "range": 5
    }
  },
  {
    "question_number": 9,
    "type": 2,
    "mandatory": 1,
    "value": {
      "question": "What did you think of the activities for this event?",
      "left": "Not good",
      "right": "Very good",
      "range": 5
    }
  },
  {
    "question_number": 10,
    "type": 2,
    "mandatory": 0,
    "value": {
      "question": "How was the food at the company?",
      "left": "Not good",
      "right": "Very good",
      "range": 5
    }
  },
  {
    "question_number": 11,
    "type": 0,
    "mandatory": 1,
    "value": {
      "question": "What did you appreciate most about this event?",
      "small_text": ""
    }
  },
  {
    "question_number": 12,
    "type": 0,
    "mandatory": 1,
    "value": {
      "question": "What could be improved? Try to give constructive feedback.",
      "small_text": "Your answer will be given to the company and used to improve future events."
    }
  }
]
`;

createSchema();
createFormTemplate(JSON.parse(defaultPreFormJson), "Pre v1", 0);
createFormTemplate(JSON.parse(defaultPostFormJson), "Post v1", 1);
