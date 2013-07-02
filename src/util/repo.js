var EventEmitter = require('events').EventEmitter;
var git = require('./git-cmd');
var semver = require('semver');
var fs = require('fs');

function Repo(path, url) {
	this.path = path;
	this.url = url;
}

Repo.prototype = Object.create(EventEmitter.prototype);
Repo.prototype.constructor = Repo;

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

Repo.prototype.checkout = function(version) {
	var cp = git(['checkout', version], {cwd: this.path}, this);
	cp.on('close', function(code) {
		if (code) return;

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