var EventEmitter = require('events').EventEmitter;
var git = require('./git-cmd');
var semver = require('semver');
var fs = require('fs');
var when = require('simply-deferred').when;
var Deferred = require('simply-deferred').Deferred;

function Repo(path, url) {
	this.path = path;
	this.url = url;
}

Repo.prototype = Object.create(EventEmitter.prototype);
Repo.prototype.constructor = Repo;

Repo.prototype.checkoutBestMatch = function(version, defaultStability) {
	var stability = defaultStability || 'stable';
	var vSplit = version.split('@');
	if (vSplit.length > 1) {
		version = vSplit[0];
		stability = vSplit[1];
	}
	this.fetchRemote()
	.on('fetch', function() {
		var dfdVersions = new Deferred();
		var dfdBranches = new Deferred();
		var getBranch, getVersion, getRef;
		console.log("version: " + version);
		if (/^v?\d+\.\d+(\.\d+)?/.test(version)) {
			this.getVersions()
			.on('versions', function(versions) {
				console.log(versions);
				while ((ver = versions.shift())) {
					if (semver.satisfies(ver, version)) {
						getVersion = ver;
						break;
					}
				}
				dfdVersions.resolve(versions);

				this.getBranches()
				.on('branches', function(branches) {
					console.log(branches);
					var getVersion = null;
					while ((brnch = branches.shift())) {
						var prefix = '';
						if (brnch.indexOf('remotes/origin') !== -1) {
							prefix = 'remotes/origin/';
							brnch = brnch.substring(15, brnch.length);
						}
						if (brnch == version) {
							getBranch = prefix + brnch;
							break;
						}
					}
					dfdBranches.resolve(branches);
				}.bind(this));

			}.bind(this));

			when(dfdVersions, dfdBranches)
			.done(function() {
				var getRef;
				if (stability == 'dev' && getBranch) {
					getRef = getBranch;
				} else if (getVersion) {
					getRef = getVersion;
				}
				if (!getRef) {
					console.log("Cannot find version: " + version);
					return;
				}

				console.log("Found match for: " + version + ". Version " + getRef + " selected");
				this.checkout(getRef);
			}.bind(this));
		} else {
			this.checkout(version);
		}
	}.bind(this));

	return this;
};

Repo.prototype.getVersions = function() {
	var cp = git(['tag'], {cwd: this.path}, this);
	cp.stdout.setEncoding('utf8');

	var versions = '';
	cp.stdout.on('data', function(data) {
		versions += data;
	});

	cp.on('close', function(code) {
		if (code) return;

		versions = versions.split('\n');
		versions = versions.filter(function(ver) {
			return semver.valid(ver);
		});
		versions = versions.sort(function(a, b) {
			return semver.gt(a, b) ? -1 : 1;
		});

		if (versions.length) return this.emit('versions', versions);

		versions = '';
		cp = git(['log', '-n', 1, '--format=%H'], { cwd: this.gitPath }, this);

		cp.stdout.setEncoding('utf8');
		cp.stdout.on('data', function (data) {
			versions += data;
		});
		cp.on('close', function (code) {
			if (code) return;
			versions = _.compact(versions.split('\n'));
			this.emit('versions', versions);
		}.bind(this));
	}.bind(this));

	return this;
};

Repo.prototype.getBranches = function() {
	var cp = git(['branch', '-a'], {cwd: this.path}, this);
	cp.stdout.setEncoding('utf8');

	var branches = '';
	cp.stdout.on('data', function(data) {
		branches += data;
	});

	cp.on('close', function(code) {
		if (code) return;

		branches = branches.split('\n');
		branches = branches.map(function(branch) {
			if (branch.substring(0, 2) == '* ') {
				branch = branch.substring(2, branch.length);
			}

			return branch.trim();
		});
		branches = branches.filter(function(branch) {
			if (!branch) {
				return false;
			}
			if (branch == '(no branch)') {
				return;
			}
			if (branch.indexOf('HEAD') !== -1) {
				return false;
			}

			return true;
		});

		if (branches.length) return this.emit('branches', branches);
	}.bind(this));

	return this;
};

Repo.prototype.checkout = function(version) {
	console.log("Checking out: " + version);
	var cp = git(['checkout', version], {cwd: this.path}, this);
	cp.on('close', function(code) {
		if (code) return;

		console.log("Checked out: " + version);
		this.emit('checkout', version);
	}.bind(this));

	return this;
};

Repo.prototype.fetchRemote = function() {
	var cp;
	if (!fs.existsSync(this.path)) {
		cp = git(['clone', this.url, this.path], null, this);
		cp.on('close', function() {
			this.emit('fetch');
		}.bind(this));
	} else {
		cp = git(['fetch', '--prune'], {cwd: this.path}, this);
		cp.on('close', function(code) {
			if (code) return;

			cp = git(['reset', '--hard'], {cwd: this.path}, this);
			cp.on('close', function(code) {
				if (code) return;

				this.emit('fetch');
			}.bind(this));
		}.bind(this));
	}

	return this;
};

module.exports = Repo;