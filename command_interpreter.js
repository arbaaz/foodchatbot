const xmpp = require('node-xmpp-client');
const config = require('./config.js').settings;

function command_interpreter(stanza) {
    if('error' === stanza.attrs.type) {
        console.log('[error] ' + stanza.toString());
        return false;
    }
    else if(stanza.is('message')) {
        console.log('[message] RECV: ' + stanza.toString());
        return split_request(stanza);
    }
}

function split_request(stanza) {
    var message_body = stanza.getChildText('body');
    if(null !== message_body) {
        message_body = message_body.split(config.command_argument_separator)
        var command = [];
        for (var i = 0; i < message_body.length; i++) {
            if (message_body[i] !== ''){
              command.push(message_body[i].toLowerCase())
            }
        }
        return { "command" : command,
                 "stanza"  : stanza };
    }
    return false;
}

module.exports = command_interpreter;
