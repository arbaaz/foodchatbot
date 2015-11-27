const xmpp = require('node-xmpp-client');
var command_interpreter = require('./command_interpreter.js');
var order_action = require('./order_states.js').order_action;
var redis = require('redis');
var redisClient = redis.createClient();

function command_executor(stanza){
  var request = command_interpreter(stanza);
  if (request){
    debugger;
    request.conn = this;
    execute_command(request);
    //send_message(request, stanza.getChildText('body'));
  }
}

/*
  This block stores all the commands and their mapping functions
 */

function execute_command(request) {
  var message = "";
  if (request.command[0] === 'help' ||
      request.command[0] === '?'    ||
      request.command[0] === 'man'){
    send_help_information(request);
  }
  else if(request.command[0] === 'hey'){
    startGreeting(request);
  }
  else if (request.command[0] === 'logout'){
    redisClient.del(request.stanza.attrs.from);
    logout(request);
  }
  else if(request.command[0] === 'restart'){
    redisClient.hset(request.stanza.attrs.from, 'state', 'SELECT_LOCALITY');
    startGreeting(request);
  }
  else{
    order_action(request);
  }
}

function send_help_information(request) {
  var message = "";
  message = "This is a chat tool to help you to order food with ease.\n\n";
  message += "Following are the allowed commands -\n\n";
  message += "hey tinyOwl : to start and then follow the instructions\n\n";
  message += "restart : to start again at any point\n\n";
  message += "add_address : to add address after choosing items\n\n";
  message += "logout : to log out from account\n";
  send_message(request, message);
}

function startGreeting(request){
  message = "Hey, where do you want your food?\n";
  redisClient.get('active_localities', function(err, data){
    data = JSON.parse(data);
    for(var i=0; i<data.length; i++){
      message += (i + '. ' + data[i].name + '\n');
    }
    send_message(request, message);
  });
}

function logout(request){
  message = "You have successfully logged out.\n\nThank you for using our service. We would love to serve you again."
  send_message(request, message);
}

function send_message(request, message_body) {
    var elem = new xmpp.Element('message', { to: request.stanza.attrs.from, type: 'chat' })
                 .c('body').t(message_body);
    request.conn.send(elem);
    console.log('[message] SENT: ' + elem.up().toString());
}

module.exports = command_executor;
