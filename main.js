// ------------------
// Using hangupjs

var Client = require('hangupsjs');
var Q = require('q');

var creds = function() { return { auth: Client.authStdin }; };

var client = new Client();
// set more verbose logging
// client.loglevel('debug');

var reconnect = function() {
    client.connect(creds).then(function() {
      console.log('Connected..');
      client.setpresence(true);
    });
};

// whenever it fails, we try again
client.on('connect_failed', function() {
    console.log('Connection failed..');
    Q.Promise(function(rs) {
        // backoff for 3 seconds
        setTimeout(rs,3000);
    }).then(reconnect);
});

// start connection
reconnect();

// Command Interpretation and Execution
var command_executor = require('./command_executor.js');
client.on('chat_message', function(ev){
  if (ev.sender_id.gaia_id !== ev.self_event_state.user_id.gaia_id){
    command_executor(ev, client);
  }
});
