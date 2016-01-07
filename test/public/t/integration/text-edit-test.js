/* global describe it uid assert eio scrollback beforeEach afterEach getConnection */
/* eslint no-param-reassign: 0 */
/* eslint no-console: 0, max-nested-callbacks: 0, no-param-reassign: 0 */
/* eslint-env browser */
"use strict";
var timeOut = 3000;
describe("Action TEXT/EDIT: ", function() {
	describe("Authorized user", function() {
		var socket;
		beforeEach(function(done) {

			socket = new eio.Socket(scrollback.host, {jsonp: "createElement" in document});
			getConnection(socket, "testinguser");
			done();
		});

		it("Editing text tag", function(done) {
			this.timeout(timeOut);
			socket.on("message", function(msg) {
				var id = uid(),
					back = {
						from: "testinguser",
						type: "back",
						to: "integration-test"
					},
					text = {
						from: "testinguser",
						text: "hiding message",
						id: id,
						type: "text",
						to: "integration-test",
						time: new Date().getTime()
					},
					edit = {
						tags: [ "hidden" ],
						type: "edit",
						to: "integration-test",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					// text.session = msg.session;
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					socket.send(JSON.stringify(text));
					return;
				}

				if (msg.type === "text") {
					edit.ref = msg.id;
					// console.log(edit);
					socket.send(JSON.stringify(edit));
					return;
				}

				if (msg.message === "TEXT_NOT_FOUND") assert(msg.type !== "error", "edit action failed " + msg.message);
				else assert(msg.type !== "error", "edit action failed ");
				done();
			});
		});

		it("Editing text content", function(done) {
			this.timeout(timeOut);
			socket.on("message", function(msg) {
				var id = uid(),

					back = {
						from: "testinguser",
						type: "back",
						to: "integration-test"
					},
					text = {
						from: "testinguser",
						text: "i am the bos",
						id: id,
						type: "text",
						to: "integration-test",
						time: new Date().getTime()
					},
					edit = {
						tags: [ "hidden" ],
						type: "edit",
						to: "integration-test",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					// text.session = msg.session;
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					text.id = id;
					socket.send(JSON.stringify(text));
					return;
				}

				if (msg.type === "text") {
					edit.ref = msg.id;
					edit.text = "I am not boss!!";
					// console.log(edit);
					socket.send(JSON.stringify(edit));
					return;
				}
				if (msg.type === "edit") {
					console.log(msg.ref);
				}
				if (msg.message === "TEXT_NOT_FOUND") assert(msg.type !== "error", "edit action failed " + msg.message);
				else assert(msg.type !== "error", "edit action failed ");
				done();
			});
		});

		it("Editing text with wrong text id", function(done) {
			this.timeout(timeOut);
			socket.on("message", function(msg) {
				var id = uid(),

					back = {
						from: "testinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "testinguser",
						text: "i am the bos",
						id: id,
						type: "text",
						to: "test-room",
						time: new Date().getTime()
					},
					edit = {
						tags: [ "hidden" ],
						type: "edit",
						to: "test-room",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					text.id = id;
					socket.send(JSON.stringify(text));
					return;
				}

				if (msg.type === "text") {
					edit.ref = uid();
					edit.text = "I am not boss!!";
					socket.send(JSON.stringify(edit));
					return;
				}
				if (msg.type === "edit") {
					console.log(msg.ref);
				}
				assert(msg.type === "error", "edited text with another id");
				assert(msg.message === "TEXT_NOT_FOUND", "wrong error message");
				done();
			});
		});

		it("Sending spam words", function(done) {
			socket.on("message", function(msg) {
				var id = uid(),

					back = {
						from: "testinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "testinguser",
						text: "test spam fuck",
						id: id,
						type: "text",
						to: "test-room",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					text.id = id;
					socket.send(JSON.stringify(text));
					return;
				}
				assert(msg.tags.indexOf("abusive") > -1, "not spaming bad words!!");
				done();
			});
		});

		it("Sending pseudo-spam words", function(done) {
			socket.on("message", function(msg) {
				var id = uid(),

					back = {
						from: "testinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "testinguser",
						text: "do not spam nofuck",
						id: id,
						type: "text",
						to: "test-room",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					text.id = id;
					socket.send(JSON.stringify(text));
					return;
				}
				assert(msg.tags.indexOf("abusive") === -1, "spaming pseudo-bad words!!");
				done();
			});
		});


		it("creating a thread with bad words", function(done) {
			socket.on("message", function(msg) {
				var id = uid(),

					back = {
						from: "testinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "testinguser",
						text: "do not spam nofuck",
						id: id,
						thread: id,
						title: "thread with spam word fuck",
						type: "text",
						to: "test-room",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					text.id = id;
					socket.send(JSON.stringify(text));
					return;
				}
				assert(msg.tags.indexOf("abusive") > -1, "not spaming bad words in thread title!!");
				done();
			});
		});

		afterEach(function(done) {
			socket.close();
			done();
		});
	});

	describe("Guest user", function() {
		var socket;
		it("Edit action from a guest user", function(done) {
			this.timeout(timeOut);
			socket = new eio.Socket(scrollback.host, {jsonp: "createElement" in document});
			getConnection(socket, "guest");
			socket.on("message", function(msg) {
				var id = uid(),
					back = {
						from: "testinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "testinguser",
						text: "I am guest-user",
						id: id,
						type: "text",
						to: "test-room"
					},
					edit = {
						tags: [ "hidden" ],
						type: "edit",
						to: "test-room"
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					// text.session = msg.session;
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					socket.send(JSON.stringify(text));
					return;
				}

				if (msg.type === "text") {
					console.log(edit);
					edit.ref = msg.id;
					socket.send(JSON.stringify(edit));
					return;
				}
				if (msg.type === "edit") {
					console.log(msg.ref);

				}
				assert(msg.type === "error", "guest user can edit text");
				assert(msg.message === "ERR_NOT_ALLOWED", "wrong error message " + msg.message);
				socket.close();
				done();
			});
		});
	});
	describe("Unauthorized user", function() {
		this.timeout(timeOut);
		var socket;
		it("Editing action from an unauthorized user", function(done) {
			socket = new eio.Socket(scrollback.host, {jsonp: "createElement" in document});
			getConnection(socket, "sbtestinguser");
			socket.on("message", function(msg) {
				var id = uid(),
					back = {
						from: "sbtestinguser",
						type: "back",
						to: "test-room"
					},
					text = {
						from: "sbtestinguser",
						text: "testing message for edit",
						id: id,
						type: "text",
						to: "test-room",
						time: new Date().getTime()
					},
					edit = {
						tags: [ "hidden" ],
						type: "edit",
						to: "test-room",
						time: new Date().getTime()
					};
				msg = JSON.parse(msg);
				console.log(msg);
				if (msg.type === "init") {
					socket.send(JSON.stringify(back));
					return;
				}

				if (msg.type === "back") {
					socket.send(JSON.stringify(text));
					return;
				}

				if (msg.type === "text") {
					console.log(edit);
					edit.ref = msg.id;
					socket.send(JSON.stringify(edit));
					return;
				}
				if (msg.type === "edit") {
					console.log(msg.ref);

				}
				assert(msg.type === "error", "unauthorized user can edit text");
				assert(msg.message === "ERR_NOT_ALLOWED", "wrong error message " + msg.message);
				socket.close();
				done();
			});
		});
	});
});
