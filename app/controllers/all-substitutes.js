const db = require('../services/db');
const util = require('../util');

function getSubstitutes() {
  let substitutes = db.getAllSubstitutes();

  // Filter out Slackbot and the event bot:
  substitutes = substitutes.filter((x) => {
    if (x.real_name.toLowerCase() === 'slackbot')
      return false;
    if (process.env.EXCLUDE_IDS.split(',').includes(x.slack_user_id))
      return false;
    
    return true;
  });

  // Set those who haven't attended any events to 0:
  substitutes.forEach((x) => {
    if (x.count === null)
      x.count = 0;
  });
  
  // Sort:
  substitutes.sort((a, b) => {
    return a.real_name.localeCompare(b.real_name);
  });

  return substitutes;
}

module.exports.allSubstitutes = function(req, res) {
  try {
    let substitutes = getSubstitutes();
    res.render('all-substitutes', {substitutes});
  } catch(err) {
    util.sendErr(res, err);
  }
};
