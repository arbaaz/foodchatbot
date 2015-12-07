var Client = require('hangupsjs');
var Q = require('q');

// callback to get promise for creds using stdin. this in turn
// means the user must fire up their browser and get the
// requested token.
var creds = function() { return { auth: Client.authStdin }; };

var client = new Client();
// set more verbose logging
//client.loglevel('debug');

// receive chat message events
client.on('chat_message', function(ev) {
  console.log('------------------ CHAT MESSAGE ---------------- ');
  console.log(ev.chat_message.message_content.segment[0].text);
  console.log(ev.conversation_id.id);
  console.log('------------------ MESSAGE ENDS ---------------- ');
});

client.on('focus', function(ev) {
  console.log('------------------ FOCUS ---------------- ');
  console.log(ev);
  console.log('------------------ FOCUS ENDS ---------------- ');
});

var image = client.uploadimage('default.png', filename=null, timeout=30000);

//console.log('IMAGE .......');
//console.log(image);

bld = new Client.MessageBuilder()
segments = bld.text('Hello ').bold('World').text('!!!').toSegments()

console.log(segments);


// connect and post a message.
// the id is a conversation id.
client.connect(creds).then(function() {
}).done();
image.then(function(val){
  console.log(val);
  client.sendchatmessage('UgwE9HHbG8CE9MP1bLB4AaABAagB4eWfCg', [[0, "hi"]], '6224461655792271202');
});
