"use strict";

module.exports = function(core, config, store) {
	// Reset dialogState when dialog is reset
	core.on("setstate", function(changes) {
		var future = store.with(changes);

		if (future.get("nav", "dialogState") && !future.get("nav", "dialog")) {
			changes.nav = changes.nav || {};
			changes.nav.dialogState = null;
		}
	}, 10);
};
