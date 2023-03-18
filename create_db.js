const sqlite3 = require('better-sqlite3');
const fs = require('fs');
require('dotenv').config()

const db = sqlite3(process.env.SQLITE3_DB_FILE);
db.pragma('journal_mode = WAL');

function createFormTemplate(json, name, prepost) {
  let res = db.prepare('INSERT INTO form_types (name, prepost) VALUES (?, ?)').run(name, prepost);
  let id = res.lastInsertRowid;  
  
  json.forEach((q) => {
    let sql = `INSERT INTO form_questions (form_type_id, question_number, value, type, mandatory) VALUES (?, ?, ?, ?, ?);`;
    db.prepare(sql).run(id, q.question_number, JSON.stringify(q.value), q.type, q.mandatory);
  });

  return id;
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
      slack_user_id  TEXT PRIMARY KEY,
      event          INTEGER,
      info           INTEGER
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

    CREATE TABLE default_form_types (
      form_type_id  INTEGER,
      prepost       INTEGER
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

const defaultPreFormJson = fs.readFileSync('defaultPre.json');
const defaultPostFormJson = fs.readFileSync('defaultPost.json');

createSchema();

let pre_id = createFormTemplate(JSON.parse(defaultPreFormJson), "Pre v1", 0);
let post_id = createFormTemplate(JSON.parse(defaultPostFormJson), "Post v1", 1);

db.prepare('INSERT INTO default_form_types (form_type_id, prepost) VALUES (?, ?)').run(pre_id, 0);
db.prepare('INSERT INTO default_form_types (form_type_id, prepost) VALUES (?, ?)').run(post_id, 1);
