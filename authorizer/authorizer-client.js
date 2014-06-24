/* global libsb, $ */
var formField = require("../lib/formField.js");

libsb.on('config-show', function(tabs, next){
	var room = tabs.room;
	
	var guestPermRead = false, guestPermWrite = false,
		registeredPermRead = false, registeredPermWrite = false,
		followerPermRead = false, followerPermWrite = false;
	
	if(!room.guides) room.guides = {};
	if(!room.guides.authorizer) room.guides.authorizer = {};
	
	if(!room.guides.authorizer.readLevel) room.guides.authorizer.readLevel = 'guest';
	if(!room.guides.authorizer.writeLevel) room.guides.authorizer.writeLevel = 'guest';
	
	
	var readLevel = room.guides.authorizer.readLevel; // guest, registered, follower
	var writeLevel = room.guides.authorizer.writeLevel;
	
	switch(readLevel){
		case 'guest': guestPermRead = true;
		break;
		case 'registered': registeredPermRead = true;
		break;
		case 'follower': followerPermRead = true;
	}
	
	switch(writeLevel){
		case 'guest': guestPermWrite = true;
		break;
		case 'registered' : registeredPermWrite = true;
		break;
		case 'follower': followerPermWrite = true;
	}
	
	var div = $('<div>').append(
		formField('Who can read messages?', 'radio', "authorizer-read",[['authorizer-read-guest', 'Anyone (Public)', guestPermRead], ['authorizer-read-users', 'Logged in users', registeredPermRead], ['authorizer-read-followers', 'Followers', followerPermRead]]),
		formField('Who can post messages?', 'radio', "authorizer-write",[['authorizer-post-guest', 'Anyone (Public)', guestPermWrite], ['authorizer-post-users', 'Logged in users', registeredPermWrite], ['authorizer-post-followers', 'Followers', followerPermWrite]])
	);
	
	tabs.authorizer = {
		html: div,
		text: "Authorization ",
		prio: 700
	};
	next();
});

libsb.on('config-save', function(room, next){
	var mapRoles = {
		guest: 'guest',
		users: 'registered',
		followers: 'follower'
	};
	var readLevel = mapRoles[$('input:radio[name="authorizer-read"]:checked').attr('id').substring(16)];
	var writeLevel = mapRoles[$('input:radio[name="authorizer-write"]:checked').attr('id').substring(16)];
	room.guides.authorizer = {
		readLevel: readLevel,
		writeLevel: writeLevel
	};
	next();
});