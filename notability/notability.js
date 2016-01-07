"use strict";
var log = require('../lib/logger.js'),
	userUtils = require("./../lib/user-utils.js");

var scores = {
	"mention": {
		"owner": 80,
		"follower": 80,
		"visitor": 80,
		"moderator": 80
	},
	"reply": {
		"owner": 40,
		"follower": 30,
		"visitor": 10,
		"moderator": 40
	},
	"thread": {
		"owner": 50,
		"follower": 40,
		"visitor": 20,
		"moderator": 50
	}
};


module.exports = function(core) {
	core.on("text", function(action, next) {
		var keyType = "",
			group = "",
			title;

		action.note = {};
		action.notify = {};
		
		if((action.tags) && (action.tags.indexOf("hidden") > -1 || action.tags.indexOf("thread-hidden") > -1)) return next();
		
		if (action.mentions.length) {
			action.note.mention = {
				group: action.room.id + "/" + (action.thread ? action.thread : "all"),
				noteData: {
					text: action.text,
					from: action.from,
					title: action.threadObject ? action.threadObject.title : null
				}
			};
		}

		if (action.id === action.thread) {
			keyType = "thread";
			group = action.room.id;
			title = action.title;
		} else {
			keyType = "reply";
			group = action.room.id + "/" + (action.thread ? action.thread : "all");
			title = action.threadObject ? action.threadObject.title : null;
		}

		action.note[keyType] = {
			group: group,
			noteData: {
				text: action.text,
				from: action.from,
				title: title
			}
		};

		action.members.forEach(function(e) {
			var x = {};
			if (e.id === action.from) return;
			if (action.mentions.indexOf(e.id) >= 0 && scores.mention[e.role]) x.mention = scores.mention[e.role];
			if (action.note.thread && scores.thread[e.role]) x.thread = scores.thread[e.role];
			else if (action.note.reply && scores.reply[e.role]) x.reply = scores.reply[e.role];
			if(Object.keys(x).length) action.notify[e.id] = x;
		});

		if (action.note.reply && action.threadObject && action.threadObject.concerns) {
			action.threadObject.concerns.forEach(function(concernedId) {
				if (concernedId === action.from) return;
				if (!action.notify[concernedId]) action.notify[concernedId] = {};
				action.notify[concernedId].reply = 60;
			});

			if (action.threadObject.from && !userUtils.isGuest(action.threadObject.from) && action.threadObject.from !== action.from) {
				if (!action.notify[action.threadObject.from]) action.notify[action.threadObject.from] = {};
				action.notify[action.threadObject.from].reply = 80;
			}
		}
		log.d(action.note);
		log.d(action.notify);
		next();

	}, 500);
};
