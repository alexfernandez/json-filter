#!/usr/bin/env node
'use strict';

/**
 * Binary to run a proxy.
 * (C) 2015 MediaSmart Mobile.
 */

// requires
var cluster = require('cluster');
var stdio = require('stdio');
var Log = require('log');
var proxy = require('../lib/proxy.js');

// globals
var log = new Log();
var numCPUs = require('os').cpus().length;

// constants
var PORT = 55501;

// init
processArgs();


/** 
 * Read command line arguments.
 */
function processArgs()
{
	var options = stdio.getopt({
		port: {key: 'p', args: 1, description: 'port to run the proxy server on', default: PORT},
		destination: {key: 'd', args: 1, description: 'destination as server:port', default: 'localhost:55500'},
		cluster: {key: 'c', description: 'start in cluster mode'},
	});
	if (!options.cluster || !cluster.isMaster)
	{
		return start(options);
	}
	for (var i = 0; i < numCPUs; i++)
	{
		cluster.fork();
	}
	cluster.on('exit', function(worker, code, signal)
	{
		log.error('Worker died: code %s, signal %s', code, signal);
		cluster.fork();
	});
}

function start(options)
{
	proxy.start(options, function(error)
	{
		if (error)
		{
			return log.error('Could not start proxy server: %s', error);
		}
		log.notice('Proxy listening on port %s', options.port);
	});
}

