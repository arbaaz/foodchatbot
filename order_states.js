var redis = require('redis');
var redisClient = redis.createClient();
var Client = require('hangupsjs');

function order_action(received){
  redisClient.hgetall(received.conversation_id, function(err, data){
    if (null === data){
      redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
      data = { state: 'SELECT_LOCALITY' }
    }
    switch(data.state){
      case 'SELECT_LOCALITY':
        selectLocality(received, data);
        break;
      case 'ORDER':
        order(received, data);
        break;
      case 'LOGIN':
        login(received, data);
        break;
      case 'VERIFICATION':
        verify(received, data)
        break;
      case 'CHOOSE_ADDRESS':
        chooseAddress(received, data);
        break;
      case 'CONFIRMATION':
        confirmOrder(received, data);
        break;
    }
  });
}

function selectLocality(received, data){
  redisClient.get('active_localities', function(locality_err, localities){
    // Set selected locality id
    locality_id = JSON.parse(localities)[parseInt(received.message)].id;
    redisClient.hset(received.conversation_id, 'locality_id', locality_id);

    // Fetch and show Items
    message = "What would you like to have?\n";
    redisClient.hset(received.conversation_id, 'state', 'ORDER');
    send_message(received, message);
    dishes = [
      { id: 123, name: 'Paneer Makhani with roti', image: '6221882705627266082' },
      { id: 234, name: 'Veg Biryani with Kadhi', image: '6221882755434268978' }
    ]
    redisClient.hset(received.conversation_id, 'dishes', JSON.stringify(dishes));
    for(var i = 0; i < dishes.length; i++){
      message = (i + ". " + dishes[i].name + "\n\n");
      send_message(received, message, dishes[i].image);
    }

  });
}

function order(received, data){
  var dish_id = JSON.parse(data.dishes)[received.message].id;
  redisClient.hset(received.conversation_id, 'dish_id', dish_id);

  // Login if not yet done
  // else proceed to address selection
  if (data.user_id === undefined || data.is_verified !== 'true'){
    message = "Please enter your number";
    redisClient.hset(received.conversation_id, 'state', 'LOGIN');
  }
  else {
    // Fetch saved addresses
    message = address_message(received, data);
  }
  send_message(received, message);
}

function address_message(received, data){
  message = "Please select the address\n";
  addresses = [
    { id: 29, name: 'I 1304 Raheja Vistas, Raheja Vihar, Chandivali' },
    { id: 39, name: 'A 102, Hiranandani, Chandivali' }
  ]
  for(var i = 0; i < addresses.length; i++){
    message += (i + ". " + addresses[i].name + "\n");
  }
  redisClient.hset(received.conversation_id, 'addresses', JSON.stringify(addresses));
  redisClient.hset(received.conversation_id, 'state', 'CHOOSE_ADDRESS');
  return message;
}

function login(received, data){
  // Get user id from number
  var user_id = 12;
  redisClient.hset(received.conversation_id, 'number', received.message);
  redisClient.hset(received.conversation_id, 'user_id', user_id);
  redisClient.hset(received.conversation_id, 'state', 'VERIFICATION');
  var message = "Please enter the otp sent to your phone";
  send_message(received, message);
}

function verify(received, data){
  var verified = true;
  if (verified){
    redisClient.hset(received.conversation_id, 'is_verified', 'true');
    message = address_message(received, data);
  }
  else{
    message = "Please check the otp and try again";
  }
  send_message(received, message);
}

function chooseAddress(received, data) {
  var address_id = JSON.parse(data.addresses)[received.message].id;
  redisClient.hset(received.conversation_id, 'address_id', address_id);
  redisClient.hset(received.conversation_id, 'state', 'CONFIRMATION');
  message = "Type \"confirm\" to place your your";
  send_message(received, message);
}

function confirmOrder(received, data){
  if (received.message === 'confirm'){
    // place order
    message = "Thank you for placing order with TinyOwl";
    redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
  }
  else {
    message = send_unknown_command_message();
  }
  send_message(received, message);
}

function send_unknown_command_message() {
  return 'Unknown command. Type "man" for more information.';
}

function send_message(received, message_body, image_id) {
  bld = new Client.MessageBuilder();
  var split_message_body = message_body.split('\n');
  bld = bld.text(split_message_body[0]);
  for (var i = 1; i < split_message_body.length; i++){
    bld = bld.linebreak().text(split_message_body[i]);
  }
  segments = bld.toSegments();
  received.client.sendchatmessage(received.conversation_id, segments, image_id);
  console.log('[message] SENT: ' + message_body);
}

exports.order_action = order_action;
