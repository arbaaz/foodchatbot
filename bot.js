const config = require('./config.js').settings;

const request_helper = require('request');

const xmpp = require('node-xmpp-client');
const conn = new xmpp.Client(config.client);
//conn.socket.setTimeout(0);
//conn.socket.setKeepAlive(true, 10000);

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
    conn.on('online', request_google_roster);
    conn.on('stanza', accept_subscription_requests);
}

function request_google_roster() {
    var roster_elem = new xmpp.Element('iq', { from: conn.jid, type: 'get', id: 'google-roster'})
                              .c('query', { xmlns: 'jabber:iq:roster', 'xmlns:gr': 'google:roster', 'gr:ext': '2' });
    conn.send(roster_elem);
}

function accept_subscription_requests(stanza) {
    debugger;
    if(stanza.is('presence') && stanza.attrs.type === 'subscribe') {
        var subscribe_elem = new xmpp.Element('presence', {
            to: stanza.attrs.from,
            type: 'subscribed'
        });
        conn.send(subscribe_elem);
        console.log('Client Connected..');
    }
}

// Command Interpretation and Execution

var command_executor = require('./command_executor.js');
conn.on('stanza', command_executor);
