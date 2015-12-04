const config = require('./config.js').settings;

const request_helper = require('request');

const xmpp = require('node-xmpp-client');
const conn = new xmpp.Client(config.client);

// Setting status message
conn.on('online', function(){
    set_status_message(config.status_message);
    console.log('Bot status Set..');
});

conn.on('error', function(stanza) {
    console.log('[error] ' + stanza.toString());
});

function set_status_message(status_message) {
    var presence_elem = new xmpp.Element('presence', { })
                                .c('show').t('chat').up()
                                .c('status').t(status_message);
    conn.send(presence_elem);
}

// Subscription

if(config.allow_auto_subscribe) {
    conn.on('stanza', accept_subscription_requests);
}

function accept_subscription_requests(stanza) {
    if(stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        var subscribe_elem = new xmpp.Element('presence', {
            to: stanza.attrs.from,
            type: 'subscribed'
        });
        conn.send(subscribe_elem);
        console.log('Client Connected..');
    }
}

// ------------------
// Integrating hangupjs

var Client = require('hangupsjs');
var Q = require('q');

var creds = function() { return { auth: Client.authStdin }; };

var client = new Client();
// set more verbose logging
// client.loglevel('debug');

var reconnect = function() {
    client.connect(creds).then(function() {
      console.log('Connected..');
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
