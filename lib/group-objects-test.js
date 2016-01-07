/* eslint-env mocha */

"use strict";

var assert = require("assert"),
	group = require("./group-objects.js");

describe("group objects test", function() {
	it("should throw error when invalid objects given", function() {
		assert.throws(function() {
			group(null);
		}, /Invalid list of objects given/);
	});

	it("should throw error when no max value given", function() {
		assert.throws(function() {
			group({});
		}, /No maximum value specified/);
	});

	it("should group objects", function() {
		var objs = [
				{ value: "hello", group: "a" },
				{ value: "jazzy", group: "a", count: 3 },
				{ value: "fuzzy", group: "a", count: 2 },
				{ value: "muzzy", group: "b", count: 0 },
				{ value: "whizz", group: "b", count: 4 },
				{ value: "fezzy", group: "c", count: 1 },
				{ value: "fizzy", group: "c", count: 2 },
				{ value: "abuzz", group: "c", count: 3 },
				{ value: "zuzim", group: "c", count: 3 },
				{ value: "scuzz", group: "c", count: 1 },
				{ value: "dizzy", group: "d", count: 1 },
				{ value: "world", group: "d", count: 2 }
			];

		assert.deepEqual(group(objs, { max: 3 }), [
			{ value: "fuzzy", group: "a", count: 6 },
			{ value: "whizz", group: "b", count: 5 },
			{ value: "scuzz", group: "c", count: 10 },
			{ value: "dizzy", group: "d", count: 1 },
			{ value: "world", group: "d", count: 2 }
		]);
	});

	it("should group objects with grouper", function() {
		var objs = [
				{ value: "hello", type: "duh", group: "a" },
				{ value: "jazzy", type: "duh", group: "a", count: 3 },
				{ value: "fuzzy", type: "wow", group: "a", count: 2 },
				{ value: "muzzy", type: "duh", group: "b", count: 0 },
				{ value: "whizz", type: "wow", group: "b", count: 4 },
				{ value: "fezzy", type: "wow", group: "c", count: 1 },
				{ value: "fizzy", type: "duh", group: "c", count: 2 },
				{ value: "abuzz", type: "wow", group: "c", count: 3 },
				{ value: "zuzim", type: "duh", group: "c", count: 3 },
				{ value: "scuzz", type: "duh", group: "c", count: 1 },
				{ value: "dizzy", type: "wow", group: "d", count: 1 },
				{ value: "world", type: "wow", group: "d", count: 2 }
			];

		assert.deepEqual(group(objs, { max: 3 }, function(o) {
			return o.group + ":" + o.type;
		}), [
			{ value: "jazzy", type: "duh", group: "a", count: 4 },
			{ value: "fuzzy", type: "wow", group: "a", count: 2 },
			{ value: "muzzy", type: "duh", group: "b", count: 0 },
			{ value: "whizz", type: "wow", group: "b", count: 4 },
			{ value: "abuzz", type: "wow", group: "c", count: 4 },
			{ value: "scuzz", type: "duh", group: "c", count: 6 },
			{ value: "dizzy", type: "wow", group: "d", count: 1 },
			{ value: "world", type: "wow", group: "d", count: 2 }
		]);
	});

	it("should return new array", function() {
		var objs = [
				{ value: "hello", group: "a" },
				{ value: "jazzy", group: "a", count: 3 },
				{ value: "fuzzy", group: "a", count: 2 },
				{ value: "muzzy", group: "b", count: 0 },
				{ value: "whizz", group: "b", count: 4 }
			];

		assert.notEqual(group(objs, { max: 3 }), objs);
	});

	it("should modify given array", function() {
		var objs = [
				{ value: "hello", group: "a" },
				{ value: "jazzy", group: "a", count: 3 },
				{ value: "fuzzy", group: "a", count: 2 },
				{ value: "muzzy", group: "b", count: 0 },
				{ value: "whizz", group: "b", count: 4 }
			],
			base = [];

		assert.equal(group(objs, { max: 3, base: base }), base);
	});

	it("should clone objects with count changed", function() {
		var o1 = { value: "jazzy", group: "a", count: 1 },
			o2 = { value: "fuzzy", group: "a", count: 4 },
			o3 = { value: "muzzy", group: "b", count: 4 },
			grouped = group([ o1, o2, o3 ], { max: 3 });

		assert.notEqual(grouped[0], o2);
		assert.equal(grouped[1], o3);
	});
});
