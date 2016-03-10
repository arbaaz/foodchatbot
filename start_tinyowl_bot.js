'use strict';

var TinyOwlBot = require('./tinyowl_slack_bot');

var token = 'xoxb-25898809937-BxlUNH4975ctDHE6ahOi5epI';
var dbPath = './data/norrisbot.db';
var name = 'tinyowl_bot';

var tinyowlbot = new TinyOwlBot({
  token: token,
  dbPath: dbPath,
  name: name
});

tinyowlbot.run();
