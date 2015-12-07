var redis = require('redis');
var redisClient = redis.createClient();
var fs = require('fs'),
    request = require('request');

function setImage(dish_id, uri, received){
  request.head(uri, function(err, res, body){
    // console.log('content-type:', res.headers['content-type']);
    // console.log('content-length:', res.headers['content-length']);
    request(uri).pipe(fs.createWriteStream('images/' + dish_id + ".webp")).on('close', function(){
      // console.log('Finished image downloading..');
      var image = received.client.uploadimage('images/' + dish_id + ".webp", null, 30000);
      image.then(function(image_id){
        redisClient.hset('foodbotimage', dish_id, image_id);
        // redisClient.hgetall('foodbotimage', function(err, data){console.log(data)});
      });
    });
  });
}

exports.setImage = setImage;

