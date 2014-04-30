var log = require("../lib/logger.js");
var config = require('../config.js');
var net = require('net');
var redis = require('../lib/redisProxy.js').select(config.threader.database || 0);
var client;
var pendingCallbacks = {};

/**
Communicate with scrollback java Process through TCP and set message.threads.
*/
module.exports = function(core) {
	if (config.threader) {
		init();
		core.on('text', function(message, callback) {
			if(message.type == "text" && client.writable) {//if client connected and text message
				var msg = JSON.stringify({
					id: message.id, time: message.time, author: message.from.replace(/guest-/g,""),
					text: message.text.replace(/['"]/g, '').replace(/\n/g," "),
					room: message.to
				});
				log("Sending msg to scrollback.jar= "+msg);
				try {
					client.write(msg+'\n');
				} catch(err) {
					log("--error --"+err);
					callback();
					return;
				}
				pendingCallbacks[message.id] = { message: message, fn: callback ,time:new Date().getTime()};
				setTimeout(function() { 
					if(pendingCallbacks[message.id] ){
						pendingCallbacks[message.id].fn();
						delete pendingCallbacks[message.id];
						log("pending callback removed after 1 sec for message.id" + message.id);
					}
				}, 1000);
			} else callback();
		}, "modifier");
	}
	else{
		log("threader module is not enabled");
	}
};

/**
*Process reply from java process and callback based on message.id
* message.thread [{
*	id: ..
*	title: ...
*	score: ... //sorted based on this score
* }, ... ]
*/
function processReply(data){
   try {
		log("data=-:" + data + ":-");
		data = JSON.parse(data);
		log("Data returned by scrollback.jar = "+data.threadId, pendingCallbacks[data.id].message.text);
		var index = data.threadId.indexOf(':');
		var id = data.threadId.substring(0, index);
		var title = data.threadId.substring(index + 1);
		if (data.bucketStatus === 'end') {
			redis.get("threader:last:" + id, function(err, d) {
				d = JSON.parse(d);
				if (data) {
					core.emit("text", {
						type: 'edit',
						ref: d.id,
						threads: [{id: id, title: title, score: 1}]
					});
				}
				redis.del("threader:last:" + id);
			});
		} else {
			var message = pendingCallbacks[data.id] && pendingCallbacks[data.id].message;
			if(message) {
				
				redis.get("threader:last:" + id, function(err, d) {
					message = pendingCallbacks[data.id] && pendingCallbacks[data.id].message;
					d = JSON.parse(d);
					var tt = title;
					if(!message.threads) message.threads = [];
					if(d && d.title === title) title = undefined;	
					if(!title) message.threads.push({id: id, score: 1});
					else message.threads.push({id: id, title: title, score: 1});
					redis.set("threader:last:" + id, JSON.stringify({id: message.id, title: tt}));
					pendingCallbacks[data.id].fn();
					log("called back in ", new Date().getTime() - pendingCallbacks[data.id].time);
					delete pendingCallbacks[data.id];
					
				});
				
			}
		}
	} catch(err) {
		log("error on parsing data=" + err);
		return;
	}
}


function init(){
	log("Trying to connect.... ");
	client = net.connect({port: config.threader.port, host: config.threader.host},
		function() { //'connect' listener
		console.log('client connected');
	});
	var d = "";//wait for new line.
	client.on("data", function(data){
		var i;
		
		data = data.toString('utf8');
		data = data.split("\n");
		data[0] = d + data[0];//append previous data
		d = data[data.length-1];
		for (i = 0; i < data.length-1;i++) {
			processReply(data[i]);
		}
	});
	/**
	*Process reply from java process and callback based on message.id
	* message.thread [{
	* 		id: ..
	* 		title: ...
	* 		score: ... //sorted based in this score
	* }, ... ]
	*/
	function processReply(data){
		var message;
		try {
			log("data=-:" + data + ":-");
			data = JSON.parse(data);
			log("Data returned by scrollback.jar = "+data.threadId, pendingCallbacks[data.id].message.text);
			message = pendingCallbacks[data.id] && pendingCallbacks[data.id].message;
			if(message) {
                if(!message.threads) message.threads = [];
                var index = data.threadId.indexOf(':');
                var id = data.threadId.substring(0, index);
                var title = data.threadId.substring(index + 1);
				message.threads.push({id: id, title: title, score: 1});
				//message.labels[data.threadId] = 1;
				pendingCallbacks[data.id].fn();
				log("called back in ", new Date().getTime() - pendingCallbacks[data.id].time);
				delete pendingCallbacks[data.id];
			}
			else
				return;
		} catch(err) {
			log("error on parsing data="+err);
			return;
		}
	}

	client.on('error', function(error){
		log("Can not connect to java Process ", error);
		setTimeout(function(){
			init();	
		},1000*60);//try to reconnect after 1 min
	});
	client.on('end', function() {
		log('connection terminated');
		setTimeout(function(){
			init();	
		},1000*60);//try to reconnect after 1 min
	});
}

