/* jshint browser: true */
/* global $, libsb */
/* exported currentState */

var currentState = window.currentState;

// On navigation, update class names.
function updateClassNames(state, next) {
	if (!state.old) {
		return next();
	}

	if (state.connectionStatus !== state.old.connectionStatus) {
		if (state.connectionStatus) {
			$("body").removeClass("state-offline");
		} else {
			$("body").addClass("state-offline");
		}
	}

	if (state.mode !== state.old.mode) {
		if (state.old.mode) {
			$("body").removeClass("mode-" + state.old.mode);
		} else {
			$("body").removeClass("mode-normal");
		}

		if (state.mode) {
			$("body").addClass("mode-" + state.mode);
		}
	}

	if (state.view !== state.old.view) {
		$("body").removeClass("view-" + state.old.view);

		if (state.view) {
			$("body").addClass("view-" + state.view);
		}
	}

	if (state.tab !== state.old.tab) {
		if (state.tab) {
			if (state.mode === "pref" || state.mode === "conf") {
				$(".list-item.current, .list-view.current").removeClass("current");
				$(".list-item-" + state.tab + "-settings, .list-view-" + state.tab + "-settings").addClass("current");
			} else {
				$(".tab.current").removeClass("current");
				$(".tab-" + state.tab).addClass("current");
			}
		}
	}

	next();
}

module.exports = function() {
	libsb.on("navigate", updateClassNames, 500); // earlier it was 999.
};
