var Promise = require('promise');
var config = require('./config.js').settings;
var rp = require('request-promise');


function request(method, url, body){
  body["app_version"] = "0.0.1",
  body["device_id"] = "Chrome",
  body["platform"] = "WEB"

  var options = {
    method: method,
    uri: config.host + url,
    body: body,
    json: true // Automatically stringifies the body to JSON
  };

  return rp(options);
}

// GET /dishes from place_id
function get_dishes(place_id){
  var body = {
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

  return request('POST', '/restaurant/api/v1/dishes', body);
}

// POST /login with number
function login_with_number(number){
  var body = {
    contact_number: number
  }

  return request('POST', '/user/api/v1/login_with_sms/existing_user/', body);
}

// POST /verify with otp
function verify_with_otp(pre_token, otp){
  var body = {
    post_token: otp,
    pre_token: pre_token
  }

  return request('POST', '/user/api/v1/login_with_sms/verify', body);
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
    session_token: session_token,
    place_id: place_id
  }

  return request('POST', '/api/v1/orders/invoice', body);
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
    session_token: session_token
  }

  return request('POST', '/api/v1/orders/' + order_id + '/place', body);
}

exports.get_dishes = get_dishes;
exports.login_with_number = login_with_number;
exports.verify_with_otp = verify_with_otp;
exports.generate_invoice = generate_invoice;
exports.place_order = place_order;
