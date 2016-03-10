'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var Tinyowl_Bot = function Constructor(settings) {
  this.settings = settings;
  this.settings.name = this.settings.name || 'tinyowl_bot';
  this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'norrisbot.db');

  this.user = null;
  this.db = null;
};

util.inherits(Tinyowl_Bot, Bot);

Tinyowl_Bot.prototype.run = function() {
  Tinyowl_Bot.super_.call(this, this.settings);
  this.on('start', this._onStart);
  this.on('message', this._onMessage);
};


Tinyowl_Bot.prototype._onStart = function() {
  this._loadBotUser();
  this._connectDb();
  this._firstRunCheck();
};

Tinyowl_Bot.prototype._loadBotUser = function() {
  var self = this;
  this.user = this.users.filter(function(user) {
    return user.name === self.name;
  })[0];
};

Tinyowl_Bot.prototype._connectDb = function() {
  if (!fs.existsSync(this.dbPath)) {
    console.error('Database path ' + '"' + this.dbPath + '" does not exists or it\'s not readable.');
    process.exit(1);
  }

  this.db = new SQLite.Database(this.dbPath);
};

Tinyowl_Bot.prototype._firstRunCheck = function() {
  var self = this;
  self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function(err, record) {
    if (err) {
      return console.error('DATABASE ERROR:', err);
    }

    var currentTime = (new Date()).toJSON();

    // this is a first run
    if (!record) {
      self._welcomeMessage();
      return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
    }

    // updates with new last running time
    self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
  });
};

Tinyowl_Bot.prototype._welcomeMessage = function() {
  this.postMessageToChannel(this.channels[0].name, 'Hello, Owlets', {
    as_user: true
  });
};


Tinyowl_Bot.prototype._onMessage = function(message) {
  if (this._isChatMessage(message) &&
    this._isChannelConversation(message) &&
    !this._isFromTinyOwlBot(message) &&
    this._isMentioningTinyOwl(message)
  ) {
    this._replyWithRandomJoke(message);
  }
};

Tinyowl_Bot.prototype._isChatMessage = function(message) {
  return message.type === 'message' && Boolean(message.text);
};

Tinyowl_Bot.prototype._isFromTinyOwlBot = function(message) {
  return message.user === this.user.id;
};

Tinyowl_Bot.prototype._isMentioningTinyOwl = function(message) {
  return message.text.toLowerCase().indexOf('tinyowl') > -1 ||
    message.text.toLowerCase().indexOf(this.name) > -1;
};


Tinyowl_Bot.prototype._isChannelConversation = function(message) {
  return typeof message.channel === 'string' &&
    (message.channel[0] === 'C' || message.channel[0] === 'D' || message.channel[0] === 'G');
};

Tinyowl_Bot.prototype._replyWithRandomJoke = function(originalMessage) {
  var self = this;
  self.db.get('SELECT id, joke FROM jokes ORDER BY used ASC, RANDOM() LIMIT 1', function(err, record) {
    if (err) {
      return console.error('DATABASE ERROR:', err);
    }
    var channel = self._getChannelById(originalMessage.channel);
    self.postMessageToChannel(channel.name, record.joke, {
      as_user: true
    });
    self.db.run('UPDATE jokes SET used = used + 1 WHERE id = ?', record.id);
  });
};

Tinyowl_Bot.prototype._getChannelById = function(channelId) {
  return this.channels.filter(function(item) {
    return item.id === channelId;
  })[0];
};
// inherits methods and properties from the Bot constructor

module.exports = Tinyowl_Bot;
