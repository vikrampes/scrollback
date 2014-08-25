var less = require("less"),
	fs = require("fs");

module.exports = function(core) {
	var parser = new less.Parser({
			compress: true,
			yuicompress: true
		}),
		lessBase = fs.readFileSync(__dirname + "/customization.less", "utf8"),
		genCss = function(action, next) {
			var room = action.room,
				lessVars = "",
				lessSrc,
				options;

			if (!(room && room.guides && room.guides.customization && room.guides.customization.options)) {
				return next();
			}

			options = room.guides.customization.options;

			for (var opt in options) {
				lessVars += "@" + opt + ":" + options[opt] + ";";
			}

			if (!lessVars) {
				return next();
			}

			lessSrc = lessVars + lessBase;

			parser.parse(lessSrc, function(error, cssTree) {
				var css;

				if (error) {
					less.writeError(error);
					return next();
				}

				css = cssTree.toCSS();

				room.guides.customization.css = (css) ? css.replace("<", "\\3c").replace(">", "\\3e") : "";

				next();
			});
		};

	core.on("room", genCss, "modifier");
	core.on("back", genCss, "modifier");
};
