var Promise = require('promise');
var config = require('./config.js').settings;
var rp = require('request-promise');

// GET /dishes from locality_id
function get_dishes(place_id){
  var body = {
    app_version: "0.0.1",
    device_id: "Chrome",
    platform: "WEB",
    filter_by: {
      payment_modes: ["COD"]
    },
    token: {
      more: true,
      network: "Chrome",
      start_index: 0,
      valid_until: 0
    },
    place_id: place_id
  }

  var options = {
    method: 'POST',
    uri: config.host + '/restaurant/api/v1/dishes',
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

// POST /login with number
function login_with_number(number){
  var body = {
    app_version: "0.0.1",
    contact_number: number,
    device_id: "Chrome",
    platform: "WEB"
  }

  var options = {
    method: 'POST',
    uri: config.host + '/user/api/v1/login_with_sms/existing_user/',
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

// {"sms_login":{"pre_token":"687870PNnQUo2Dx3wSxxD6dN7VY55QwUnc11CjDtQSSCYDOFKkN8lNkJFAiySieRBLAAqM3havz1uP36DHfUPTafDTxgDD","registered":true,"wait_for_verification":true,"sms_login_id":687870}}

// {"sms_login":{"registered":false}}

// POST /verify with otp
function verify_with_otp(pre_token, otp){
  var body = {
    app_version: "0.0.1",
    device_id: "Chrome",
    platform: "WEB",
    post_token: otp,
    pre_token: pre_token
  }

  var options = {
    method: 'POST',
    uri: config.host + '/user/api/v1/login_with_sms/verify',
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

// POST /address
// function post_address(session_token, address){

// }

// POST /invoice
function generate_invoice(place_id, session_token, address_id, dish, quantity){
  var body = {
    order: {
      number_of_items: quantity,
      address_id: address_id,
      restaurant_id: dish.restaurant_id,
      restaurant_name: dish.restaurant_name,
      delivery_duration: 2700,
      delivery_type: "DEFAULT",
      offers_by_tinyowl: 0,
      offers_by_restaurant: 0,
      cart: {
        amount: parseInt(dish.price)*quantity,
        number_of_items: quantity,
        order_dishes: [
          {
            dish_id: dish.id,
            name: dish.name,
            quantity: quantity,
            base_price: dish.price,
            total_price: parseInt(dish.price)*quantity
          }
        ]
      }
    },
    app_version: "0.0.1",
    device_id: "Chrome",
    platform: "WEB",
    session_token: session_token,
    place_id: place_id
  }

  var options = {
    method: 'POST',
    uri: config.host + '/api/v1/orders/invoice',
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

// POST /order
function place_order(order_id, session_token, total){
  var body = {
    order_id: order_id,
    order: {
      payable_amount: total,
      paid_by_cod: total
    },
    payment: {
      method: "COD",
      sdk: "TINYOWL_DEFAULT"
    },
    app_version: "0.0.1",
    device_id: "Chrome",
    platform: "WEB",
    session_token: session_token
  }

  var options = {
    method: 'POST',
    uri: config.host + '/api/v1/orders/' + order_id + '/place',
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

exports.get_dishes = get_dishes;
exports.login_with_number = login_with_number;
exports.verify_with_otp = verify_with_otp;
exports.generate_invoice = generate_invoice;
exports.place_order = place_order;

// place_id = "ChIJFTW8ywvI5zsRABlRv1yrPs4";
// session_token = "2218l9kVNl9ayu2F4vjQfUCgeEziNtwpaRDq4HsSusbyRgxOIGuJiJCizTdHNDIculIhtgdKvsdDkS92jBRWDlZi5gDD";
// address_id = "112539";
// dish ={ id: '558dd8e0fa125913650015ba',
//   name: 'Veg Punjabi Thali',
//   veg_type: 'VEG',
//   restaurant_id: '544e2586091d49bb5b0009b4',
//   price: 210,
//   restaurant_name: '3PL ROAD RUNNR EAT EXPRESS' }
// quantity = 2

// generate_invoice(place_id, session_token, address_id, dish, quantity)
//   .then(function(parsedBody){
//     console.log(parsedBody);
//   })
//   .error(function(err){
//     console.log(err);
//   })
//
//

// session_token = "2218l9kVNl9ayu2F4vjQfUCgeEziNtwpaRDq4HsSusbyRgxOIGuJiJCizTdHNDIculIhtgdKvsdDkS92jBRWDlZi5gDD";
// order_id = "565f1a33123fea4ff60000fa";
// total = "270";

// place_order(order_id, session_token, total)
//   .then(function(parsedBody){
//     console.log(parsedBody);
//   })
//   .error(function(err){
//     console.log(err);
//   })


