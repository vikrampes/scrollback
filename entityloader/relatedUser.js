"use strict";

var userUtils = require("../lib/user-utils.js"),
	sessionUtils = require("../lib/session-utils.js"), moderators, core;

function checkPresence(room, user, callback) {
	if (!room) return callback(false);
	core.emit("getUsers", {
		occupantOf: room,
		ref: user,
		session: "internal-loader"
	}, function(occupantErr, response) {
		var result = false;
		if (occupantErr || !response || !response.results || !response.results.length) result = false;
		else if (response.results[0] && response.results[0].id === user) result = true;
		return callback(result);
	});
}

function loadRelatedUser(room, user, session, callback) {
	var count = 0,
		queriesCount = 2,
		isErr = false,
		returnValue, presense = "offline";

	if (sessionUtils.isInternalSession(session) && user === "me") {
		return callback(null, {
			id: "system",
			role: "owner" // should look for alternatives.
		});
	}

	function done(error) {
		if (isErr) return;
		if (error) {
			isErr = true;
			callback(error);
			return;
		}

		count++;
		if (count === queriesCount) {
			if (room) returnValue.status = presense ? "online" : "offline";
			callback(null, returnValue);
		}
	}

	core.emit("getUsers", {
		ref: user,
		session: session
	}, function(userErr, data) {
		if (userErr || !data || !data.results || !data.results.length) {
			return done(new Error("USER_NOT_FOUND"));
		} else {

			returnValue = data.results[0];
			if (!room) return done();
			if (userUtils.isGuest(returnValue.id)) {
				returnValue.role = "guest";
				done();
			} else {
				if (moderators && moderators[returnValue.id]) {
					returnValue.role = "owner";
					return done();
				}
				core.emit("getUsers", {
					session: "internal-loader",
					ref: returnValue.id,
					memberOf: room
				}, function(memberErr, relations) {
					if (memberErr) {
						if (memberErr.message === "NO_ROOM_WITH_GIVEN_ID") {
							returnValue.role = "registered";
							return done();
						} else {
							return done(memberErr);
						}
					}
					if (!relations || !relations.results || !relations.results.length) {
						returnValue.role = "registered";
						done();
					} else {
						returnValue = relations.results[0];
						done();
					}
				});
			}
		}
	});

	checkPresence(room, user, function(result) {
		presense = result;
		done();
	});
}

function exp(c, config) {
	core = c;
	moderators = config.moderators;
	return loadRelatedUser;
}

module.exports = exp;
