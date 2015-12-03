var redis = require('redis');
var redisClient = redis.createClient();
var Client = require('hangupsjs');
var tinyowlRequest = require('./tinyowl_request.js');

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
    var place_id = JSON.parse(localities)[parseInt(received.message)].place_id;
    redisClient.hset(received.conversation_id, 'place_id', place_id);

    // Fetch and show Items
    tinyowlRequest.get_dishes(place_id)
      .then(function(parsedBody){
        redisClient.hset(received.conversation_id, 'locality_id', parsedBody.locality_id);
        var dishes = [];
        for(var i = 0; i < parsedBody.dishes.length && i < 5; i++){
          var dish = {
            id: parsedBody.dishes[i].id,
            name: parsedBody.dishes[i].name,
            veg_type: parsedBody.dishes[i].veg_type,
            restaurant_id: parsedBody.dishes[i].restaurant_id,
            price: parsedBody.dishes[i].price,
            restaurant_name: parsedBody.dishes[i].restaurant_name
          }
          dishes.push(dish);
        }
        redisClient.hset(received.conversation_id, 'dishes', dishes);
        if (dishes !== []){
          var message = "What would you like to have?\n";
          redisClient.hset(received.conversation_id, 'state', 'ORDER');
          //send_message(received, message);
          redisClient.hset(received.conversation_id, 'dishes', JSON.stringify(dishes));
          for(var i = 0; i < dishes.length; i++){
            message += (i + ". " + dishes[i].name + "(" + dishes[i].veg_type + ") " + "from " + dishes[i].restaurant_name + " at Rs." + dishes[i].price + "\n\n");
          }
          send_message(received, message);
        }
        else{
          var message = "No active dishes in this locality";
          send_message(received, message, dishes[i].image);
        }
      })
      .catch(function (err) {
        console.log(err);
        send_message(received, err);
      })

  });
}

function order(received, data){
  var orderParams = received.message.replace(/ /g,'').split('of');
  redisClient.hset(received.conversation_id, 'quantity', orderParams[0]);
  var dish = JSON.parse(data.dishes)[orderParams[1]];
  redisClient.hset(received.conversation_id, 'dish', JSON.stringify(dish));
  var message = "";

  // Login if not yet done
  // else proceed to address selection
  if (data.user_id === undefined || data.is_verified !== 'true'){
    message = "Please enter your number";
    redisClient.hset(received.conversation_id, 'state', 'LOGIN');
  }
  else {
    // Fetch saved addresses
    message = addressMessage(received, data);
  }
  send_message(received, message);
}

function addressMessage(received, data){
  var message = "Please select the address\n";
  var addresses = JSON.parse(data.addresses);
  for(var i = 0; i < addresses.length; i++){
    if (addresses[i].locality_id.toString() === data.locality_id && addresses[i]._DELETED !== true){
      message += (i + ". " + addresses[i].address_details + "\n");
    }
  }
  redisClient.hset(received.conversation_id, 'state', 'CHOOSE_ADDRESS');
  console.log(message);
  return message;
}

function login(received, data){
  // Get user id from number
  tinyowlRequest.login_with_number(received.message)
    .then(function(parsedBody){
      response = parsedBody.sms_login;
      if (response.registered){
        redisClient.hset(received.conversation_id, 'number', received.message);
        redisClient.hset(received.conversation_id, 'pre_token', response.pre_token);
        redisClient.hset(received.conversation_id, 'state', 'VERIFICATION');
        var message = "Please enter the otp sent to your phone";
        send_message(received, message);
      }
      else{
        var message = "Please login in TinyOwl app";
        send_message(received, message);
      }
    })
    .catch(function (err) {
      send_message(received, err.error.message);
    });
}

function verify(received, data){
  tinyowlRequest.verify_with_otp(data.pre_token, received.message)
    .then(function(parsedBody){
        redisClient.hset(received.conversation_id, 'user_id', parsedBody.profile.id);
        redisClient.hset(received.conversation_id, 'session_token', parsedBody.session_token);
        data.addresses = JSON.stringify(parsedBody.profile.addresses);
        redisClient.hset(received.conversation_id, 'addresses', data.addresses);
        redisClient.hset(received.conversation_id, 'is_verified', 'true');
        var message = addressMessage(received, data);
        send_message(received, message);
    })
    .catch(function (err) {
        send_message(received, err.error.message);
    })
}

function chooseAddress(received, data) {
  var address_id = JSON.parse(data.addresses)[received.message].id;
  redisClient.hset(received.conversation_id, 'address_id', address_id);
  redisClient.hset(received.conversation_id, 'state', 'CONFIRMATION');

  // Generate invoice
  tinyowlRequest.generate_invoice(data.place_id, data.session_token, parseInt(address_id), JSON.parse(data.dish), data.quantity)
    .then(function(parsedBody){
      redisClient.hset(received.conversation_id, 'temp_order_id', parsedBody.payload.order_id);
      redisClient.hset(received.conversation_id, 'total', parsedBody.payload.payable_amount);
      message = "Your total is Rs " + parsedBody.payload.payable_amount +". Type \"1\" to place your order";
      send_message(received, message);
    })
    .catch(function (err) {
        send_message(received, err.error.message);
    })
}

function confirmOrder(received, data){
  var message = "";
  if (received.message === '1'){
    tinyowlRequest.place_order(data.temp_order_id, data.session_token, data.total)
    .then(function(parsedBody){
      message = "Thank you for placing order with TinyOwl";
      message += "Your order Id is " + parsedBody.payload.order_id;
      redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
      redisClient.hset(received.conversation_id, 'order', parsedBody.payload.order_id);
    })
    .catch(function (err) {
      console.log(err);
      send_message(received, err.error.message);
    })
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
