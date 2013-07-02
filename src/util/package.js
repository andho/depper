var EventEmitter = require('events').EventEmitter;

function Package(name, version, repo) {
	this.name = name;
	this.version = version;
	this.repo = repo;
}

Package.prototype = Object.create(EventEmitter.prototype);
Package.prototype.constructor = Package;

Package.prototype.install = function() {console.log("Fetching updates from remote");
	this.repo.fetchRemote()
	.on('fetch', function() {
		if (this.version !== 'master') {
			this.repo.getVersions()
			.on('versions', function(versions) {
				console.log(versions);
				var getVersion = null;
				while ((ver = versions.shift())) {
					if (semver.satisfies(ver, this.version)) {
						getVersion = ver;
						break;
					}
				}

				if (!getVersion) {
					console.log("Cannot find version: " + this.version);
					return;
				}

				console.log("Found match for: " + this.version + ". Version " + getVersion + " selected");

				console.log("Checking out " + getVersion);
				this.repo.checkout(getVersion)
				.on('checkout', function() {
					console.log("Checked out " + getVersion);
				});
			});
		} else {
			console.log("Checking out: master");
			this.repo.checkout(this.version)
			.on('checkout', function() {
				console.log("Checkout out: master");
			});
		}
	});

	return this;
};

module.exports = Package;