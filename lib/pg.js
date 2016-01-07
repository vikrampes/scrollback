"use strict";

var pg = require("pg"),
	log = require('./logger.js'),
	BigInteger = require('big-integer'),
	EventEmitter = require("events").EventEmitter,

	// Variables for tracking and rolling back incomplete queries on shut down
	runningQueries = {},
	generate = require('./generate.js'),
	shuttingDown = false;

pg.defaults.poolSize = 100;

function cat (parts, delim) {
	delim = delim || " ";

	var q = {
		$: []
	};
	
	function equal(a, b) {
		if (a == b) return true;
		if (a instanceof Date && b instanceof Date && a.getTime() === b.getTime()) return true;
		
		return false;
	}

	parts.forEach(function (part) {
		var paramName, suffix;
		if (typeof part === "string") {
			q.$.push(part);
			return;
		}

		function substitute (match, left, mid, right) {
			return left + (mid === paramName? paramName + "_" + suffix : mid) + right;
		}

		for (paramName in part) {
			if (paramName === '$') continue;
			if (paramName in q && !equal(part[paramName], q[paramName])) {
				suffix = 1;
				while ((paramName + "_" + suffix) in q) { suffix++; }

				part.$ = part.$.replace(/(\$\{|\()(\w+)(\}|\))/g, substitute);
				q[paramName + "_" + suffix] = part[paramName];
			} else {
				q[paramName] = part[paramName];
			}
		}
		if (part.$) { q.$.push(part.$); }
	});

	q.$ = q.$.join(delim);

	return q;
}

exports.cat = cat;


// --------------------------------------------------------------------

function hash(s) {
	s = new Buffer(s).toString('hex');
	var h = new BigInteger(s.substring(0, 15), 16); // 60 bit
	var index = 15;
	while(index < s.length) {
		var nbi = new BigInteger(s.substring(index, index + 15), 16);
		index += 15;
		h = h.xor(nbi);
	}
	return h.toString();
}

function lock (s) {
	if (!s) throw new Error("lock variable is not defined");
	return {
		$: "SELECT pg_advisory_xact_lock(${hash})",
		hash: hash(s)
	};
}

function nameValues (record, delim) {
	var parts = [], column, part;

	for(column in record) {
		part = {$: "\"" + column + "\"=${" + column + "}"};
		part[column] = record[column];
		parts.push(part);
	}

	return cat(parts, delim || ", ");
}

function columns (record) {
	return Object.keys(record)
		.map(function (c) { return "\"" + c + "\""; })
		.join(", ");
}

function values (record) {
	var cols = [], clause = {}, column;

	for(column in record) {
		cols.push("${" + column + "}");
		clause[column] = record[column];
	}

	clause.$ =  cols.join(", ");
	return clause;
}

function update (tableName, object) {
	var parts = ["UPDATE \"" + tableName + "\" SET ", nameValues(object)];

	return cat(parts, " ");
}

function insert (tableName, objects) {
	if (!objects) throw Error("CANT_INSERT_NOTHING");
	if (!Array.isArray(objects)) objects = [objects];

	var parts = ["INSERT INTO \"" + tableName + "\" (", columns(objects[0]), ") VALUES"];

	parts.push("(", cat(objects.map(function (object) {
		return values(object);
	}), "), ("), ")");

	return cat(parts, " ");
}

function upsert (tableName, insertObject, keyColumns) {
	var updateObject = {}, whereObject = {}, col;

	for(col in insertObject) {
		if (keyColumns.indexOf(col) < 0) {
			updateObject[col] = insertObject[col];
		} else {
			whereObject[col] = insertObject[col];
		}
	}

	return [
		lock(keyColumns.sort().map(function (column) { return whereObject[column]; }).join(":")),
		cat([update(tableName, updateObject), "WHERE", nameValues(whereObject, " AND ")]),
		cat([
			"INSERT INTO \"" + tableName + "\" (",
			columns(insertObject),
			") SELECT ",
			values(insertObject),
			"WHERE NOT EXISTS (SELECT 1 FROM " + tableName,
			"WHERE", nameValues(whereObject, " AND "), ")"
		])
	];
}

exports.nameValues = nameValues;
exports.columns = columns;
exports.values = values;
exports.update = update;
exports.insert = insert;
exports.upsert = upsert;
exports.lock = lock;

// --------------------------------------------------------------------

function paramize (query) {
	var ixs = {}, sql, vals=[];
	function getIndex(p, v) {
		if(!(p in ixs)) {
			vals.push(v);
			ixs[p] = vals.length - 1;
		}
		return ixs[p];
	}

	function paren(p, v, wrap) {
		if(typeof v === 'undefined') {
			throw Error("Parameter " + p + " is undefined");
		}

		if(Array.isArray(v)) {
			var r = (wrap? "(": "") +
				v.map(function (iv, ix) { return paren(p + "-" + ix, iv, true); }).join(", ") +
				(wrap? ")": "");
			return r;
		} else {
			return "$" + (getIndex(p, v) + 1);
		}
	}

	if(!query.$) {
		console.log("Invalid query", query);
		throw Error("INVALID_QUERY");
	}

	sql = query.$.replace(/\$\{(\w+)\}/g, function (m, p) { return "$" + (getIndex(p, query[p]) + 1); })
		.replace(/\$\((\w+)\)/g, function (m, p) { return paren(p, query[p]); });
	log.d(sql, vals);
	return { q: sql, v: vals };
}

exports.paramize = paramize;

exports.read = function (connStr, query, cb) {
	var start = Date.now();
	log.d("PgRead start", query);
	pg.connect(connStr, function(error, client, done) {
		if (error) {
			log.e("Unable to connect to " + connStr, error, query);
			done();
			return cb(error);
		}

		var qv = paramize(query);
		log.d("Querying", qv);
		client.query(qv.q, qv.v, function(queryErr, result) {
			done();
			if(queryErr) {
				log.e("Query error", queryErr, qv);
				return cb(queryErr);
			}
			log.i("PgRead ", query, "result", result.rows.length, " rows in ", Date.now() - start, "ms");
			cb(null, result.rows);
		});
	});
};

exports.readStream = function (connStr, query) {
	var rstream = new EventEmitter();
	log.d("PgReadStream ", query);
	pg.connect(connStr, function(error, client, done) {
		var stream;
		if (error) {
			log.e("Unable to connect to " + connStr, error, query);
			done();
			return rstream.emit('error', error);
		}

		var qv = paramize(query);
		log.d("Querying", qv);
		stream = client.query(qv.q, qv.v);

		stream.on('row', function (row, result) { rstream.emit('row', row, result); });
		stream.on('end', function (result) { done(); rstream.emit('end', result); });
		stream.on('error', function (err) { done(); rstream.emit('error', err); });
	});

	return rstream;
};

function rollback(error, client, done) {
	client.query('ROLLBACK', function(err) {
		log.e("Rollback", error, err);
		return done(error);
	});
}

exports.write = function (connStr, queries, cb) {
	if (!queries || !queries.length) {
		return cb(null, []);
	}
	var start = Date.now();
	log.d("PgWrite starting ", queries);
	pg.connect(connStr, function(error, client, done) {
		if (error) {
			log.e("Unable to connect to " + connStr, error, queries);
			done();
			return cb(error);
		}

		if (shuttingDown) {
			return cb(Error("ERR_SERVER_SHUTDOWN"));
		}

		var id = generate.uid();
		runningQueries[id] = client;

		function callback(err, results) {
			delete runningQueries[id];
			done();
			cb(err, results);
		}

		client.query("BEGIN", function(err) {
			var results = [];
			if (err) rollback(err, client, callback);

			function run(i) {
				if(shuttingDown) { return cb(Error("ERR_SERVER_SHUTDOWN")); }
				if (i < queries.length) {
					var qv = paramize(queries[i]);
					log.d("Querying", qv);
					client.query(qv.q, qv.v, function(queryErr, result) {
						results[i] = result;
						if (queryErr) {
							log.d("Rollback:", qv.q, qv.v);
							rollback(queryErr, client, callback);
						} else {
							run(i + 1);
						}
					});
				} else {
					client.query("COMMIT", function(commitErr) {
						log.i("PgWrite", queries, "completed in ", Date.now() - start, "ms");
						callback(commitErr, results);
					});
				}
			}
			run(0);
		});
	});
};

function onShutDownSignal() {
	shuttingDown = true;
	log.w("Process killed, rolling back queries");

	var ct = 1; // This is intentionally 1, not zero, and the comparison happens after the decrement, not before.
	// This is a weird roundabout way of ensuring that the process exits even if there are no running queries.
	// Perhaps rewrite?
	function done() {
		ct--;
		if (ct === 0) {
			log("Complete: shutting down now.");
			process.exit(0);
		}
	}
	for (var key in runningQueries) {
		if (runningQueries.hasOwnProperty(key)) {
			ct++;
			rollback(new Error("error: SIGINT/SIGTERM"), runningQueries[key], done);
		}
	}
	done();
}

process.on('SIGINT', onShutDownSignal);
process.on('SIGTERM', onShutDownSignal);


