const xmpp = require('node-xmpp-client');
var redis = require('redis');
var redisClient = redis.createClient();

function order_action(request){
  redisClient.hgetall(request.stanza.attrs.from, function(err, data){
    if (null === data){
      redisClient.hset(request.stanza.attrs.from, 'state', 'SELECT_LOCALITY');
      data = { state: 'SELECT_LOCALITY' }
    }
    switch(data.state){
      case 'SELECT_LOCALITY':
        selectLocality(request, data);
        break;
      case 'ORDER':
        order(request, data);
        break;
      case 'LOGIN':
        login(request, data);
        break;
      case 'VERIFICATION':
        verify(request, data)
        break;
      case 'CHOOSE_ADDRESS':
        chooseAddress(request, data);
        break;
      case 'CONFIRMATION':
        confirmOrder(request, data);
        break;
    }
  });
}

function selectLocality(request, data){
  redisClient.get('active_localities', function(locality_err, localities){
    // Set selected locality id
    locality_id = JSON.parse(localities)[parseInt(request.command[0])].id;
    redisClient.hset(request.stanza.attrs.from, 'locality_id', locality_id);

    // Fetch and show Items
    message = "What would you like to have?\n";
    dishes = [
      { id: 123, name: 'Paneer Makhani with roti' },
      { id: 234, name: 'Veg Biryani with Kadhi' }
    ]
    redisClient.hset(request.stanza.attrs.from, 'dishes', JSON.stringify(dishes));
    redisClient.hset(request.stanza.attrs.from, 'state', 'ORDER');
    for(var i = 0; i < dishes.length; i++){
      message += (i + ". " + dishes[i].name + "\n");
    }
    send_message(request, message);
  });
}

function order(request, data){
  var dish_id = JSON.parse(data.dishes)[request.command[0]].id;
  redisClient.hset(request.stanza.attrs.from, 'dish_id', dish_id);

  // Login if not yet done
  // else proceed to address selection
  if (data.user_id === undefined || data.is_verified !== 'true'){
    message = "Please enter your number";
    redisClient.hset(request.stanza.attrs.from, 'state', 'LOGIN');
  }
  else {
    // Fetch saved addresses
    message = address_message(request, data);
  }
  send_message(request, message);
}

function address_message(request, data){
  message = "Please select the address\n";
  addresses = [
    { id: 29, name: 'I 1304 Raheja Vistas, Raheja Vihar, Chandivali' },
    { id: 39, name: 'A 102, Hiranandani, Chandivali' }
  ]
  for(var i = 0; i < addresses.length; i++){
    message += (i + ". " + addresses[i].name + "\n");
  }
  redisClient.hset(request.stanza.attrs.from, 'addresses', JSON.stringify(addresses));
  redisClient.hset(request.stanza.attrs.from, 'state', 'CHOOSE_ADDRESS');
  return message;
}

function login(request, data){
  // Get user id from number
  var user_id = 12;
  redisClient.hset(request.stanza.attrs.from, 'number', request.command[0]);
  redisClient.hset(request.stanza.attrs.from, 'user_id', user_id);
  redisClient.hset(request.stanza.attrs.from, 'state', 'VERIFICATION');
  var message = "Please enter the otp sent to your phone";
  send_message(request, message);
}

function verify(request, data){
  var verified = true;
  if (verified){
    redisClient.hset(request.stanza.attrs.from, 'is_verified', 'true');
    message = address_message(request, data);
  }
  else{
    message = "Please check the otp and try again";
  }
  send_message(request, message);
}

function chooseAddress(request, data) {
  var address_id = JSON.parse(data.addresses)[request.command[0]].id;
  redisClient.hset(request.stanza.attrs.from, 'address_id', address_id);
  redisClient.hset(request.stanza.attrs.from, 'state', 'CONFIRMATION');
  message = "Type \"confirm\" to place your your";
  send_message(request, message);
}

function confirmOrder(request, data){
  if (request.command[0] === 'confirm'){
    // place order
    message = "Thank you for placing order with TinyOwl";
    redisClient.hset(request.stanza.attrs.from, 'state', 'SELECT_LOCALITY');
  }
  else {
    message = send_unknown_command_message();
  }
  send_message(request, message);
}

function send_unknown_command_message() {
  return 'Unknown command. Type "man" for more information.';
}

function send_message(request, message) {
  var elem = new xmpp.Element('message', { to: request.stanza.attrs.from, type: 'chat' })
               .c('body').t(message);
  request.conn.send(elem);
  console.log('[message] SENT: ' + elem.up().toString());
}

exports.order_action = order_action;
