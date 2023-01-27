# formstorm

Slack and web app for filling out event forms in Studs.

Features:
* Answer pre and post forms.
* Get reminders.
* Add subtitutes that receive the forms instead of the default member.
* Web UI for managing events.
* Slack integration.

## Usage

You must have nodejs and npm installed.

1. Follow the Slack Workspace preparations (see below)
2. Create the Slack app on api.slack.com (see below)
3. Download this repo and `cd` into it
4. `npm install`
5. `cp .env.example .env`
6. Configure the options in `.env` (see below)
7. `node create_db.js`
8. `npm run build`
9. `npm start`

If you need to reset the whole DB, simply stop the server, delete the files that are called db.sqlite3*, re-run create_db.js and start the server again.

## Slack Workspace preparations

Create a slack workspace (if you already don't have one) suitable for inviting the project group and all substitutes. A free version of Slack is sufficient, called for example "Studs 2023 Event".

Open Workspace settings, and go to the Permissions tab. Under "Channel Management" the following permission **must** be configured correctly for the system to work:

* People who can create public channels: "Everyone, except guests"

Now, go to the slack workspace and add the following channels:

* An ask-it channel.
* An ask-event channel.
* A project-group channel. Make it a private channel and add everybody in the project group to this channel **before creating the first event**. When everyone is added, restart the server.

Finally, add these emojis:

* :studs: (Displayed next to each company name on the forms page on slack)
* :filled: (Indicating filled forms)
* :not-filled: (Indicating not filled forms)

## Create slack app

Go to api.slack.com -> Your Apps. Press "Create New App" and choose "From an app manifest". When prompted, paste the contents of `slack-manifest.yaml` into the text area. When the app has been created, go to the following menus:

Basic information -> Generate app-level token. Name it to anything, press Add Scope, and choose "connections:write". Then click Generate. This App-Level Token should be pasted later in the server config.

OAuth & Permisssions -> OAuth Tokens for Your Workspace. Note the Bot User OAuth Token, it should be pasted later in the server config.

App Home -> Show Tabs. Make sure "Home Tab" and "Messages Tab" are active.

## Options in `.env`:

|Option|Description|
|-|-|
|`SQLITE3_DB_FILE`|Where the database file is stored/where it will be created by create_db.js.|
|`EXPRESS_PORT`|The port of the web server (for the web UI).|
|`PASSWORD`|Password for the web UI. Leave blank if no password should be required.|
|`SLACK_BOT_TOKEN`|The Bot User OAuth Token, should begin with `xoxb-`|
|`SLACK_APP_TOKEN`|The App-Level Token, should begin with `xapp-`|
|`PROJECT_GROUP_CHANNEL_ID`|ID of channel that contains the Studs project group, e.g. `C04BF4L46F9` and NOT e.g. `#project-group`|
|`GENERAL_CHANNEL_ID`|ID of general channel.|
|`REACTION_CHANNEL_ID`|ID of channel for reacting to events substitutes are interested in.|
|`SUPPORT_CHANNEL_ID`|ID of channel for asking questions about the events or the IT system.|
|`EXCLUDE_IDS`|IDs of slack users that shouldn't participate in the system. It's strongly recommended to add the slack id of the bot here. Separate multiple IDs with comma, no whitespace.|
|`URL`|The base url for the web interface. E.g. "https://event.studs.se" or "http://localhost".|
|`EVENT_DURATION`|Event duration in hours. Before the event is over, users cannot answer the post forms.|
|`UPLOAD_FOLDER`|When users export the forms in the web UI, they will be stored here. Specify an absolute path, e.g. "/home/it/form-storage" (and not a relative path that begins with "./").|

You can find the slack tokens in the slack app configuration menus on api.slack.com. All IDs for the channels and the bot user can be found in the Slack workspace itself.

## Development

### Technologies

* Written in JavaScript.
* SQLite is used as database, no SQL server setup is required. Instead, the whole DB is stored in a file.
* [Express](https://expressjs.com/) as web backend framework.
* [ejs templates](https://ejs.co/) used for most part of the front-end.
* React used for the form.
* Slack Bolt. See documentation [here](https://slack.dev/bolt-js/concepts). Note: Socket Mode is used in this app.

### React

For the most part the server is just regular javascript, which means you don't have to build anything. However, the form page is written in React, and has to be built. The code is stored in /app/react.

Build with `npm run build`. To build automatically during development, use `npm run build-dev`.
