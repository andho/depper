var EventEmitter = require('events').EventEmitter;
var git = require('nodegit');
var gitBasic = require('../../lib/git-basic');
var fs = require('fs');
var Repo = require('../util/repo');

function Cache(path) {
	if (!fs.existsSync(path)) {
		console.log("Creating cache dir: .depper");
		fs.mkdirSync(path);
	}

	this.path = path;
}

Cache.prototype.getRepo = function(pkg, src) {
	var path = "./.depper/" + pkg;
	/*if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}*/
	//path += "/.git";

	return new Repo(path, src);
};

module.exports = {
	Cache: Cache
};