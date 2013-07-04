var EventEmitter = require('events').EventEmitter;
var semver = require('semver');

function Package(name, version, repo) {
	this.name = name;
	this.version = version;
	this.repo = repo;
}

Package.prototype = Object.create(EventEmitter.prototype);
Package.prototype.constructor = Package;

Package.prototype.install = function() {console.log("Fetching updates from remote");
	this.repo.checkoutBestMatch(this.version)
	.on('checkout', this.runScripts.bind(this));
	return this;
};

Package.prototype.runScripts = function() {
	try {
		var config = require(this.repo.path + '/package.json');
	} catch (e) {
		console.log("No configuration for " + this.name);
		return;
	}
};

module.exports = Package;