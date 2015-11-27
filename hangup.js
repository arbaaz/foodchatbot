var Client = require('hangupsjs');
var Q = require('q');

// callback to get promise for creds using stdin. this in turn
// means the user must fire up their browser and get the
// requested token.
var creds = function() {
  return {
    auth: Client.authStdin
  };
};

var client = new Client();
// set more verbose logging
client.loglevel('debug');

// receive chat message events
client.on('chat_message', function(ev) {
  console.log('------------------ CHAT MESSAGE ---------------- ');
  console.log(ev);
  console.log('------------------ MESSAGE ENDS ---------------- ');
});

client.on('hangout_event', function(ev) {
  console.log('------------------ HANGOUT EVENT ---------------- ');
  console.log(ev);
  console.log('------------------ HANGOUT EVENT ENDS ---------------- ');
});

client.on('presence', function(ev) {
  console.log('------------------ PRESENCE---------------- ');
  console.log(ev);
  console.log('------------------ PRESENCE ENDS ---------------- ');
});

client.on('typing', function(ev) {
  console.log('------------------ TYPING---------------- ');
  console.log(ev);
  console.log('------------------ TYPING ENDS ---------------- ');
});

client.on('focus', function(ev) {
  console.log('------------------ FOCUS ---------------- ');
  console.log(ev);
  console.log('------------------ FOCUS ENDS ---------------- ');
});

client.on("*",function(ev){
  console.log('------------------ EVENT ---------------- ');
  console.log(this.event);
  console.log('------------------ EVENT ENDS ---------------- ');
});

//var image = client.uploadimage('im.jpg', filename=null, timeout=30000);

//console.log('IMAGE .......');
//console.log(image);

bld = new Client.MessageBuilder()
segments = bld.text('Hello ').bold('World').text('!!!').toSegments()

console.log(segments);


// connect and post a message.
// the id is a conversation id.
client.connect(creds).then(function() {
    //return client.sendchatmessage('UgwE9HHbG8CE9MP1bLB4AaABAagB4eWfCg', segments);
}).done();
