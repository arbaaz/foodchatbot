var order_action = require('./order_states.js').order_action;
var redis = require('redis');
var redisClient = redis.createClient();
var Client = require('hangupsjs');

function command_executor(request, client) {
  var received = {};
  received.message = request.chat_message.message_content.segment[0].text;
  received.conversation_id = request.conversation_id.id;
  received.client = client;
  if (received.message === 'help' ||
      received.message === '?'    ||
      received.message === 'man'){
    send_help_information(received);
  }
  else if(received.message === 'hey'){
    startGreeting(received);
  }
  else if (received.message === 'logout'){
    redisClient.del(received.conversation_id);
    logout(received);
  }
  else if(received.message === 'restart'){
    redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
    startGreeting(received);
  }
  else{
    order_action(received);
  }
}

function send_help_information(received) {
  var message = "";
  message = "This is a chat tool to help you to order food with ease.\n\n";
  message += "Following are the allowed commands -\n\n";
  message += "hey tinyOwl : to start and then follow the instructions\n\n";
  message += "restart : to start again at any point\n\n";
  // message += "add_address : to add address after choosing items\n\n";
  message += "logout : to log out from account\n";
  send_message(received, message);
}

function startGreeting(received){
  message = "Hey, where do you want your food?\n";
  redisClient.get('active_localities', function(err, data){
    data = JSON.parse(data);
    for(var i=0; i<data.length; i++){
      message += (i + '. ' + data[i].name + '\n');
    }
    send_message(received, message);
  });
}

function logout(received){
  message = "You have successfully logged out.\n\nThank you for using our service. We would love to serve you again."
  send_message(received, message);
}

function send_message(received, message_body, image_id) {
  bld = new Client.MessageBuilder();
  var split_message_body = message_body.split('\n');
  bld = bld.text(split_message_body[0]);
  for (var i = 1; i < split_message_body.length; i++){
    bld = bld.linebreak().text(split_message_body[i]);
  }
  segments = bld.toSegments();
  received.client.sendchatmessage(received.conversation_id, segments);
  console.log('[message] SENT: ' + message_body);
}

module.exports = command_executor;
