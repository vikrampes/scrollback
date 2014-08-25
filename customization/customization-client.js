/* jshint browser: true */
/* global $, libsb */

var formField = require("../lib/formField.js");

$(function() {
	libsb.on("config-show", function(tabs, next) {
		var results = tabs.room,
			options;

		results.guides = results.guides || {};

		results.guides.customization = results.guides.customization || {};

		options = results.guides.customization.options || {};

		var $fontFamily = formField("Font family", "text", "customization-font-family", options["font-family"]),
			$titleBg = formField("Titlebar background", "text", "customization-title-bg", options["title-bg"]),
			$titleFg = formField("Titlebar text", "text", "customization-title-fg", options["title-fg"]),
			$divs = $("<div>").append(
				$fontFamily,
				$titleBg,
				$titleFg
			);

		tabs.customization = {
			text: "Customization",
			html: $divs,
			prio: 300
		};

		next();
	}, 500);

	libsb.on("config-save", function(room, next) {
		room.guides.customization = room.guides.customization || {};

		room.guides.customization.options = {
			"font-family": $("#customization-font-family").val(),
			"title-bg": $("#customization-title-bg").val(),
			"title-fg": $("#customization-title-fg").val()
		};

		next();
	}, 500);

	libsb.on("navigate", function(state, next) {
		if (state.old && state.room !== state.old.room) {
			customStyle.applyCss();
		}

		next();
	}, 700);

	libsb.on("room-dn", function(room, next) {
		customStyle.applyCss();

		next();
	}, 100);

	// Customization API (temporary)
	var customStyle = {
		setCss: function(customCss) {
			var room = $.extend({}, window.currentState.room),
				roomObj;

			if (!(room && typeof customCss === "string")) {
				return;
			}

			if (!room.guides) {
				room.guides = {};
			}

			if (!room.guides.customization) {
				room.guides.customization = {};
			}

			room.guides.customization.css = customCss.replace("<", "\\3c").replace(">", "\\3e");

			roomObj = { to: window.currentState.roomName, room: room };

			libsb.emit("room-up", roomObj);
		},

		applyCss: function() {
			var room = window.currentState.room,
				customization;

			if (!room || !room.guides || !room.guides.customization) {
				return;
			}

			customization = room.guides.customization;

			$("#scrollback-custom-style").remove();

			if (customization && customization.css) {
				$("<style>").text(customization.css)
				.attr("id", "scrollback-custom-style").appendTo("head");
			}
		}
	};

	window.customStyle = customStyle;
});
