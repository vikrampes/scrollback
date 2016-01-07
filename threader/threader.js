"use strict";

/* jshint mocha: true */
/*jshint: true*/
var log = require("../lib/logger.js"),
	config, net = require('net'), timeout = 60 * 1000,
	client, pendingCallbacks = {}, core,
	validator = new (require('valid'))(),
	redis;

var threaderValidator = {
	params: [{
		threader: ['undefined', {
			enabled: ['boolean']
		}]
	}]
};
/**
Communicate with scrollback java Process through TCP and set message.threads.
*/
module.exports = function(coreObj, conf) {
	core = coreObj;
	config = conf;
	redis = require('redis').createClient();
	redis.select(config.redisDB);
	if (config) {
		init();
		core.on("room", function(action, callback) {
			var result = validator.validate(action.room, threaderValidator);
			if (!result.status) {
				log.e("Error: invalid action params", JSON.stringify(result), " ID: ", action.id);
				callback(new Error("INVALID_THREADER_PARAMS"));
			} else callback();
		}, "appLevelValidation");

		core.on('text', function(message, callback) {
			var room = message.room;
			if (client.writable && (!room.params || !room.params.threader || room.params.threader.enabled)) {//if client connected
				
				var threadId = message.thread,
					msg = {
						id: message.id, time: message.time, author: message.from.replace(/guest-/g, ""),
						text: message.text.replace(/\s+/g, " "),
						room: message.to
					};
				
				if(threadId) msg.threadId = threadId;
				msg = JSON.stringify(msg);
				
				log.d("JSB Sending msg to scrollback.jar: " + msg);
				try {
					client.write(msg + ",");
				} catch(err) {
					log.e("Threader socket write error:" + err);
					callback();
					return;
				}
				pendingCallbacks[message.id] = { message: message, fn: callback ,time:new Date().getTime()};
				setTimeout(function() {
					if (pendingCallbacks[message.id]) {
						var fn = pendingCallbacks[message.id].fn;
						delete pendingCallbacks[message.id];
						//message.thread = message.id; // Make it a new thread if no reply.
						log.i("pending callback removed after 1 sec for message.id" + message.id);
						fn();
					}
				}, 1000);
			} else callback();
		}, "modifier");
	} else {
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
		log("JSB Response" + data);
		data = JSON.parse(data);
		var threadId = data.threadId.substr(0,data.threadId.length - 1);
		var message = pendingCallbacks[data.id] && pendingCallbacks[data.id].message;

		if (message) {
			if (!message.thread && threadId) {
				message.thread = threadId;

				if (message.id === threadId && !message.title) {
					message.title = message.text;
				}
			}
			log("JSB called back in ", new Date().getTime() - pendingCallbacks[data.id].time);
			pendingCallbacks[data.id].fn();
			delete pendingCallbacks[data.id];
		}

	} catch(err) {
		log("error on parsing data=" + err);
		return;
	}
}


function init(){
	client = net.connect({port: config.port, host: config.host}, function() {
		log.i('Threader connected.');
		client.write("[");//sending array of JSON objects
	});
	
	var stub = ""; //incomplete line
	client.on("data", function(data){
		var i;
		data = data.toString('utf8').split("\n");
		data[0] = stub + data[0];
		stub = data[data.length-1];
		for (i = 0; i < data.length-1; i++) {
			processReply(data[i]);
		}
	});

	client.on('error', function(error) {
		log.e("Threader error: ", error);
		setTimeout(function() {
			init();
		}, timeout);//try to reconnect after 1 min
	});

	client.on('end', function() {
		log.i('Threader disconnected');
		setTimeout(function(){
			init();
		}, timeout); //try to reconnect after 1 min
	});
}

