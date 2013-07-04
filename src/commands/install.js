var Emitter = require('events').EventEmitter;
var nopt    = require('nopt');
var fs      = require('fs');
var path    = require('path');

var Package = require('../util/package');

var optionTypes = { help: Boolean, save: Boolean, 'save-dev': Boolean, force: Boolean, 'force-latest': Boolean, production: Boolean };
var shorthand   = { 'h': ['--help'], 'S': ['--save'], 'D': ['--save-dev'], 'f': ['--force'], 'F': ['--force-latest'], 'p': ['--production'] };

var cache = require('../util/cache');

module.exports = function(paths, options) {
	var emitter = new Emitter;
	console.log("Installing");

	var packages = [];
	if (paths.length == 0) {
		var config = require('../core/config');
		if (!config.depper) {
			return emitter;
		}

		packages = config.depper.map(function(pkg) {
			if (process.env.APPLICATION_ENV !== 'production') {
				if (pkg.devSource) {
					pkg.source = pkg.devSource;
				}

				return pkg;
			} 
		});
	} else {
		if (!paths[1]) {
			console.log("No source specified");

			return emitter;
		}
		var src = paths[1];

		var pkgArr = paths[0].split('#');
		var pkg = pkgArr[0];
		var pkgV = pkgArr[1];
		if (!pkgV) {
			pkgV = 'master';
		}

		packages.push({
			name: pkg,
			version: pkgV,
			source: src
		});
	}

	var Cache = new cache.Cache("./.depper");

	for (var i=0; i<packages.length; i++) {
		var repo = Cache.getRepo(packages[i].name, packages[i].source);

		var pkg = new Package(packages[i].name, packages[i].version, repo);
		pkg.install()
		.on('install', function() {
			emitter.emit('end');
		});
	}

	return emitter;
};

module.exports.line = function(argv) {
  var options = nopt(optionTypes, shorthand, argv);
  var paths   = options.argv.remain.slice(1);

  if (options.help) return help('install');
  return module.exports(paths, options);
};