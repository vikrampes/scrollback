module.exports = function(core, config) {
	var get = require("./get.js")(config);
	var put = require("./put.js")(config);

	core.on('user', function(action, callback) {
		if (/^guest-/.test(action.from)) {
			get("session", action.session, function(err, sessionObj) {
				var session = {
					id: action.session,
					user: action.user.id,
					origin: action.origin
				};
				if (!err) {
					session.origin = sessionObj.origin || {};

				}
				put("session", action.session, session);
				return callback();
			});
		} else {
			callback();
		}
	}, "storage");

	core.on("init", function(action, callback) {
		if (action.auth && !action.user.id) {
			return callback();
		}
		get("session", action.session, function(err, sessionObj) {
			var session = {
				id: action.session,
				user: action.user.id,
				origin: action.origin,
				restricted: sessionObj && sessionObj.restricted,
				allowedDomains: action.user.allowedDomains
			};
			if(action.auth){
				if(action.auth.jws) {
					session.restricted = true;
				}else{
					delete session.restricted;
					delete session.allowedDomains;
				}
			}
			
			if(!err) {
				if(sessionObj && sessionObj.origin && sessionObj.origin.locations) {
					Object.keys(sessionObj.origin.locations).forEach(function(resource) {
						if(session.origin && session.origin.locations){
							session.origin.locations[resource] = sessionObj.origin.locations[resource];
						}
					});
				}	
			}
			put("session", action.session, session);
			callback();
		});
	}, "storage");
};
