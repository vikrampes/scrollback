/* global describe it getConnection assert SockJS scrollback beforeEach afterEach */ /* eslint no-console: 0, array-bracket-spacing: 0, no-param-reassign: 0 */

"use strict";
var timeOut = 3000;
describe("Action AWAY: ", function() {
	var socket,
		b = {
		from: "sbtestinguser",
		type: "back",
		to: "scrollback"
	};
	beforeEach(function(done) {
		socket = new eio.Socket(scrollback.host, {jsonp: "createElement" in document});
		getConnection(socket);
		done();
	});

	it("away action with all property ", function(done) {
		this.timeout(timeOut);
		socket.on("message", function(message) {
			var a = {
				type: "away",
				to: "scrollback"
			};
			message = JSON.parse(message);
			console.log(message.type);
			if (message.type === "init") {
				socket.send(JSON.stringify(b));
				return;
			}
			if (message.type === "back") {
				socket.send(JSON.stringify(a));
				return;
			}
			assert(message.type !== "error", "away action failed");
			done();
		});
	});

	it("away action without 'to' property ", function(done) {
		this.timeout(timeOut);
		socket.on("message", function(message) {
			var a = {
				type: "away"
			};
			message = JSON.parse(message);
			console.log(message.type);
			if (message.type === "init") {
				socket.send(JSON.stringify(b));
				return;
			}
			if (message.type === "back") {
				socket.send(JSON.stringify(a));
				return;
			}
			assert(message.type === "error", "away action success without 'to' ");
			done();
		});
	});

	it("away action with a wrong user", function(done) {
		this.timeout(timeOut);
		socket.on("message", function(message) {
			var a = {
				type: "away",
				to: "facebook",
				from: "testinguser"
			};
			message = JSON.parse(message);
			console.log(message.type);
			if (message.type === "init") {
				socket.send(JSON.stringify(b));
				return;
			}
			if (message.type === "back") {
				socket.send(JSON.stringify(a));
				return;
			}
			assert(message.type === "error", "away action success with wrong user ");
			done();
		});
	});

	afterEach(function() {
		socket.close();
	});

});
