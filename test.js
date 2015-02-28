'use strict';

/**
 * Run tests.
 * (C) 2013 MediaSmart Mobile.
 */

// requires
require('prototypes');
var testing = require('testing');
var Log = require('log');

// globals
var log = new Log('info');

/**
 * Run all module tests.
 */
exports.test = function(callback)
{
	log.debug('Running all tests');
	var tests = {};
	var libs = [
		'./lib/noContent.js',
		'./lib/proxy.js',
		'./lib/analysis.js',
	];
	libs.forEach(function(lib)
	{
		tests[lib] = require(lib).test;
	});
	testing.run(tests, 50000, callback);
};

// run tests if invoked directly
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

