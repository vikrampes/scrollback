/*
	Rule: LoadTextsOnTextRange
	Requires: textRange
	Provides: threads (async)
*/
/*eslint no-use-before-define:0 */
"use strict";
var permissionLevels = require("./../../authorizer/permissionWeights.js");
module.exports = function(core, config, store) {

	core.on('setstate', function(changes) {
		var future = store.with(changes),
			roomId = future.get("nav", "room"),
			userId = future.get("user"),
			rel = roomId + "_" + userId,
			getRelation = store.getRelation(roomId, userId),
			roomObj = store.getRoom(roomId),
			userRelation = getRelation ? getRelation.role : "none",
			guides = roomObj ? roomObj.guides : {};

		if (
			(changes.nav && (
				"room" in changes.nav ||
				"thread" in changes.nav ||
				"textRange" in changes.nav
			)) || (
				changes.entities &&
				changes.entities[rel]
			)) {
			if (
				(guides && guides.authorizer && (
					permissionLevels[userRelation] < permissionLevels[guides.authorizer.readLevel]
				)) || (
					userRelation === "banned"
				)) {
				return;
			}
			handleTextChange(future);
		}
	}, 850);

	function textResponse(err, texts) {
		var updatingState = {
				texts: {}
			},
			range = {},
			key = texts.to;

		if (texts.thread) key += "_" + texts.thread;

		if (!err && texts.results) {
			if (texts.before) {
				range.end = texts.time;
				range.start = texts.results.length < texts.before ? null : texts.results[0].time;
			} else if (texts.after) {
				range.start = texts.time;
				range.end = texts.results.length < texts.after ? null : texts.results[texts.results.length - 1].time;
			}
			range.items = texts.results;

			updatingState.texts[key] = [range];
			core.emit("setstate", updatingState);
		}
	}

	function handleTextChange(future) {
		var thread = future.get("nav", "thread"),
			/* threads may be in the process of being reset using null; in this case, use null. */
			roomId = future.get("nav", "room"),
			time = future.get("nav", "textRange", "time") || null,
			before = future.get("nav", "textRange", "before"),
			after = future.get("nav", "textRange", "after"),
			queryTime, r;

		if (after) {
			r = store.getTexts(roomId, thread, time, after);

			if (r[r.length - 1] === "missing") {
				queryTime = (r.length > 1 ? r[r.length - 2].time : time);
				if (queryTime !== null) {
					core.emit("getTexts", {
						to: roomId,
						thread: thread,
						time: queryTime,
						after: Math.max(50, after - r.length + 1)
					}, textResponse);
				}

			}
		}

		if (before) {
			r = store.getTexts(roomId, thread, time, -before);

			if (r[0] === "missing") {
				core.emit("getTexts", {
					to: roomId,
					thread: thread,
					time: (r.length > 1 ? r[1].time : time),
					before: Math.max(50, before - r.length + 1)
				}, textResponse);
			}
		}
	}

};