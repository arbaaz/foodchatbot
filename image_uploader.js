var redis = require('redis');
var redisClient = redis.createClient();
var fs = require('fs'),
    request = require('request');

function setImage(dish_id, uri, received){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream('images/' + dish_id + ".webp")).on('close', function(){
      var image = received.client.uploadimage('images/' + dish_id + ".webp", null, 30000);
      image.then(function(image_id){
        if (typeof dish_id !== 'undefined' && typeof image_id !== 'undefined'){
          redisClient.hset('foodbotimage', dish_id, image_id);
        }
      });
    });
  });
}

exports.setImage = setImage;

