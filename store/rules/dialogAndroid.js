"use strict";

var userUtils = require("../../lib/user-utils.js");

module.exports = function(core, config, store) {
	core.on("setstate", function(changes, next) {
		var future = store.with(changes),
			user = future.get("user"),
			env = future.get("context", "env");

		if (env === "android" && user && userUtils.isGuest(user)) {
			changes.nav = changes.nav || {};
			changes.nav.dialog = "signin";
			changes.nav.dialogState = changes.nav.dialogState || {};
			changes.nav.dialogState.mobileApp = true;
		}

		next();
	}, 500);
};
