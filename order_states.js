var redis = require('redis');
var redisClient = redis.createClient();
var Client = require('hangupsjs');
var tinyowlRequest = require('./tinyowl_request.js');
var setImage = require('./image_uploader.js').setImage;

function order_action(received) {
  redisClient.hgetall(received.conversation_id, function(err, data) {
    if (null === data) {
      redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
      data = {
        state: 'SELECT_LOCALITY'
      }
    }
    switch (data.state) {
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

function selectLocality(received, data) {
  redisClient.get('active_localities', function(locality_err, localities) {
    // Set selected locality id
    var locality = JSON.parse(localities)[parseInt(received.message) - 1];
    if (typeof locality === 'undefined') {
      send_message(received, "Please select correct locality number");
      return;
    } else {
      send_message(received, "Selected " + locality.name + "\n\n");
    }
    var place_id = locality.place_id;
    redisClient.hset(received.conversation_id, 'place_id', place_id);

    // Fetch and show Items
    tinyowlRequest.get_dishes(place_id)
      .then(function(parsedBody) {
        redisClient.hset(received.conversation_id, 'locality_id', parsedBody.locality_id);
        var dishes = [];
        for (var i = 0; i < parsedBody.dishes.length && i < 5; i++) {
          var dish = {
            id: parsedBody.dishes[i].id,
            name: parsedBody.dishes[i].name,
            veg_type: parsedBody.dishes[i].veg_type,
            restaurant_id: parsedBody.dishes[i].restaurant_id,
            price: parsedBody.dishes[i].price,
            restaurant_name: parsedBody.dishes[i].restaurant_name,
            image_url: parsedBody.dishes[i].image_url
          }
          dishes.push(dish);
        }
        redisClient.hset(received.conversation_id, 'dishes', dishes);
        if (dishes !== []) {
          var message = "Here are the top " + dishes.length + " dishes for you. What would you like to have?\n\n";
          message += "Please type in format of '<quantity> of <item serial-id>'\n\n";
          send_message(received, message);
          for (var i = 0; i < dishes.length; i++) {
            message = ("(" + (i + 1) + ") " + dishes[i].name + "(" + dishes[i].veg_type + ") " + "from " + dishes[i].restaurant_name + " at Rs." + dishes[i].price + "\n\n");
            sendDishMessage(received, dishes, i, message);
          }
          redisClient.hset(received.conversation_id, 'state', 'ORDER');
          redisClient.hset(received.conversation_id, 'dishes', JSON.stringify(dishes));
        } else {
          var message = "Oops! No dishes found in this locality";
          send_message(received, message);
        }
      })
      .catch(function(err) {
        console.log(err);
        send_message(received, err);
      })
  });
}

function sendDishMessage(received, dishes, index, message) {
  redisClient.hget('foodbotimage', dishes[index].id, function(err, image_id) {
    if (image_id !== null) {
      send_message(received, message, image_id);
    } else {
      if (dishes[index].image_url !== "/images/medium/missing.png") {
        setImage(dishes[index].id, dishes[index].image_url, received);
      }
      send_message(received, message, '6224456575060677634');
    }
  })
}

function order(received, data) {
  var orderParams = received.message.match(/^[0-9]+of[0-9]+$/g);
  if (orderParams === null || orderParams.length !== 1) {
    send_message(received, "Please type in correct format - '<quantity> of <item serial-id>'")
    return;
  }
  var orderParams = orderParams[0].split('of');
  var dish = JSON.parse(data.dishes)[orderParams[1] - 1];
  if (typeof dish === 'undefined') {
    send_message(received, "Please select valid item serial id")
    return;
  }
  redisClient.hset(received.conversation_id, 'quantity', orderParams[0]);
  redisClient.hset(received.conversation_id, 'dish', JSON.stringify(dish));
  var message = "Added " + orderParams[0] + " of " + dish.name + " to your cart.\n\n";

  // Login if not yet done
  // else proceed to address selection
  if (data.user_id === undefined || data.is_verified !== 'true') {
    message += "Please enter your 10 digit mobile number without +91 :";
    redisClient.hset(received.conversation_id, 'state', 'LOGIN');
  } else {
    // Fetch saved addresses
    message += addressMessage(received, data);
  }
  send_message(received, message);
}

function addressMessage(received, data) {
  var message = "Please select the address :\n\n";
  var addresses = JSON.parse(data.addresses);
  var allowed_addresses = [];
  for (var i = 0; i < addresses.length; i++) {
    if (addresses[i].locality_id.toString() === data.locality_id && addresses[i]._DELETED !== true) {
      message += ("(" + (i + 1) + ") " + addresses[i].address_details + "\n");
      allowed_addresses.push(i);
    }
  }
  redisClient.hset(received.conversation_id, 'allowed_addresses', JSON.stringify(allowed_addresses));
  redisClient.hset(received.conversation_id, 'state', 'CHOOSE_ADDRESS');
  console.log(message);
  return message;
}

function login(received, data) {
  var number = received.message.match(/^[0-9]{10}$/g);
  if (number === null) {
    send_message(received, "Wrong format. Please enter your 10 digit mobile number without +91 :");
    return
  }
  number = number[0];
  // Get user id from number
  tinyowlRequest.login_with_number(number)
    .then(function(parsedBody) {
      response = parsedBody.sms_login;
      if (response.registered) {
        redisClient.hset(received.conversation_id, 'number', number);
        redisClient.hset(received.conversation_id, 'pre_token', response.pre_token);
        redisClient.hset(received.conversation_id, 'state', 'VERIFICATION');
        var message = "Please enter the otp sent to your mobile number: ";
        send_message(received, message);
      } else {
        var message = "Please login in TinyOwl app";
        send_message(received, message);
      }
    })
    .catch(function(err) {
      console.log(err);
      send_message(received, err.error.message);
    });
}

function verify(received, data) {
  var otp = received.message.match(/^[0-9]+$/g);
  if (otp === null) {
    send_message(received, "Wrong format. OTP should be numerical. Try again");
    return;
  }
  tinyowlRequest.verify_with_otp(data.pre_token, otp[0])
    .then(function(parsedBody) {
      var message = "Bravo! Logged in successfully. To logout type 'lo' at any stage.\n\n";
      redisClient.hset(received.conversation_id, 'user_id', parsedBody.profile.id);
      redisClient.hset(received.conversation_id, 'session_token', parsedBody.session_token);
      data.addresses = JSON.stringify(parsedBody.profile.addresses);
      redisClient.hset(received.conversation_id, 'addresses', data.addresses);
      redisClient.hset(received.conversation_id, 'is_verified', 'true');
      message += addressMessage(received, data);
      send_message(received, message);
    })
    .catch(function(err) {
      console.log(err);
      send_message(received, err.error.message);
    })
}

function chooseAddress(received, data) {
  var addressCheck = received.message.match(/^[0-9]+$/g);
  if (addressCheck === null) {
    send_message(received, "Wrong format. Address serial id should be numerical. Try again");
    return;
  }
  var address = JSON.parse(data.addresses)[parseInt(received.message) - 1];
  if (typeof address === 'undefined') {
    send_message(received, "Invalid serial id. Please select correct serial id of address");
    return;
  } else if (JSON.parse(data.allowed_addresses).indexOf(parseInt(received.message) - 1) === -1) {
    send_message(received, "Cannot deliver to this address. Please select from the above ones");
    return;
  }
  var address_id = address.id;
  redisClient.hset(received.conversation_id, 'address_id', address_id);
  redisClient.hset(received.conversation_id, 'state', 'CONFIRMATION');

  // Generate invoice
  tinyowlRequest.generate_invoice(data.place_id, data.session_token, parseInt(address_id), JSON.parse(data.dish), data.quantity)
    .then(function(parsedBody) {
      redisClient.hset(received.conversation_id, 'temp_order_id', parsedBody.payload.order_id);
      redisClient.hset(received.conversation_id, 'total', parsedBody.payload.payable_amount);
      message = "Your total is Rs " + parsedBody.payload.payable_amount + ". Type '1' to place your order or 'r' to start again :";
      send_message(received, message);
    })
    .catch(function(err) {
      console.log(err);
      send_message(received, err.error.message);
    })
}

function confirmOrder(received, data) {
  var message = "";
  message = "Thank you for placing order with TinyOwl.";
  message += " Your order Id is xyz123";
  send_message(received, message);
  return;
  if (received.message === '1') {
    tinyowlRequest.place_order(data.temp_order_id, data.session_token, data.total)
      .then(function(parsedBody) {
        redisClient.hset(received.conversation_id, 'state', 'SELECT_LOCALITY');
        redisClient.hset(received.conversation_id, 'order', parsedBody.order_id);
        message = "Thank you for placing order with TinyOwl.";
        message += " Your order Id is " + parsedBody.order_id;
        send_message(received, message);
      })
      .catch(function(err) {
        console.log(err);
        send_message(received, err.error.message);
      })
  } else {
    message = "Please type '1' or 'r' to restart :";
    send_message(received, message);
  }
}

function send_message(received, message_body, image_id) {
  bld = new Client.MessageBuilder();
  var split_message_body = message_body.split('\n');
  bld = bld.text(split_message_body[0]);
  for (var i = 1; i < split_message_body.length; i++) {
    bld = bld.linebreak().text(split_message_body[i]);
  }
  segments = bld.toSegments();
  received.client.sendchatmessage(received.conversation_id, segments, image_id);
  console.log('[message] SENT: ' + message_body);
}

exports.order_action = order_action;
exports.send_message = send_message;
