var order_states = require('./order_states.js');
var redis = require('redis');
var redisClient = redis.createClient();
var Client = require('hangupsjs');

function command_executor(request, client) {
  var received = {};
  received.message = request.chat_message.message_content.segment[0].text.toLowerCase();
  received.conversation_id = request.conversation_id.id;
  received.client = client;
  // removing all the spaces
  received.message = received.message.replace(/ /g,'');
  if (received.message === 'help' ||
      received.message === '?'    ||
      received.message === 'man'){
    send_help_information(received);
  }
  else if(received.message === 'hey' ||
          received.message === 'r' ){
    redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
    startGreeting(received);
  }
  else if (received.message === 'lo'){
    redisClient.del(received.conversation_id);
    logout(received);
  }
  else{
    //received.client.settyping(received.conversation_id, Client.TypingStatus.TYPING);
    order_states.order_action(received);
    //received.client.settyping(received.conversation_id, Client.TypingStatus.STOPPED);
  }
}

function send_help_information(received) {
  var message = "";
  message = "This is a chat tool to help you to order food with ease.\n\n";
  message += "Following are the allowed commands -\n\n";
  message += "hey : to start and then follow the instructions. Type value in brackets to select it\n\n";
  message += "r : to start again at any point\n\n";
  message += "lo : to log out from account\n";
  order_states.send_message(received, message);
}

function startGreeting(received){
  message = "Hey, where do you want your food?\n\n";
  redisClient.get('active_localities', function(err, data){
    data = JSON.parse(data);
    for(var i=0; i<data.length; i++){
      message += ("(" + (i + 1) + ') ' + data[i].name + '\n');
    }
    order_states.send_message(received, message);
  });
}

function logout(received){
  message = "You have successfully logged out.\n\nThank you for using our service. We would love to serve you again."
  order_states.send_message(received, message);
}

module.exports = command_executor;
