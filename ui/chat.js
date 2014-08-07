/* jshint browser: true */
/* global $, format */

var chatEl = {},
	timeBefore;

$(function() {
	var $template = $(".chat-item").eq(0),
		replaceAll = function(str, find, replace) {
			var ret = '',
				txt = str,
				i = 0, j = -1;

			while ((j = txt.indexOf(find)) > -1) {
				ret += str.substring(i, i + j) + replace;
				txt = txt.substring(j + find.length, txt.length);
				i += j + find.length;
			}

			if (txt.length > 0) {
				ret += str.substring(str.length - txt.length, str.length);
			}

			return ret;
		};

	chatEl.render = function($el, text) {
		var string = "",
			links;

		$el = $el || $template.clone(false);

		string = format.textToHtml(text.text);

		if (text.text) {
			links = format.linkify(text.text);

			for (var link in links) {
				if (links.hasOwnProperty(link)) {
					string = replaceAll(string, format.textToHtml(link), links[link]);
				}
			}
		}

		$el.find(".chat-nick").text(text.from.replace(/^guest-/, ""));
		$el.find(".chat-message").html(string || "");
		$el.find(".chat-timestamp").text(format.friendlyTime(text.time, new Date().getTime()));
		$el.attr("data-index", text.time);
		$el.attr("id", "chat-" + text.id);

		if (text.threads && text.threads.length) {
			for (var i in text.threads) {
				if (window.currentState.thread && window.currentState.thread === text.threads[i].id) {
					$el.attr("data-thread", text.threads[i].id);
					break;
				}
			}

			if (!$el.attr("data-thread") && text.threads[0].id) {
				$el.attr("data-thread", text.threads[0].id);
			}

			if ($el.attr("data-thread")) {
				$el.addClass("conv-" + $el.attr("data-thread").substr(-1));
			}
		}

		if (text.labels) {
			for (var label in text.labels) {
				if (text.labels[label] === 1) {
					$el.addClass("chat-label-" + label);
				}
			}
		}

		if (text.text) {
			var $container = $(".chat-area"),
				width = $container.width(),
				lines = text.text.split("\n"),
				lineCount = 0,
				charsPerLine;

			width = (width > 360) ? width : 360;
			charsPerLine = width / (parseInt($container.css("font-size"), 10) * 0.6);

			lines.forEach(function(line) {
				lineCount += Math.ceil(line.length / charsPerLine);
			});

			if (lineCount > 4) {
				$el.addClass("chat-item-long");
			}
		}

		if (timeBefore) {
			if ((text.time - timeBefore) > 180000) {
				$el.addClass("chat-item-timestamp-shown");
			}
		}

		timeBefore = text.time;

		return $el;
	};
});

module.exports = chatEl;
