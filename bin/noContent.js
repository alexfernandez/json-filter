#!/usr/bin/env node
'use strict';

/**
 * Binary to run a server that responds 204 No Content.
 * (C) 2015 MediaSmart Mobile.
 */

// requires
var cluster = require('cluster');
var stdio = require('stdio');
var Log = require('log');
var noContent = require('../lib/noContent.js');

// globals
var log = new Log();
var numCPUs = require('os').cpus().length;

// constants
var PORT = 55500;

// init
processArgs();


/** 
 * Read command line arguments.
 */
function processArgs()
{
	var options = stdio.getopt({
		port: {key: 'p', args: 1, description: 'port to run the noContent server on', default: PORT},
		cluster: {key: 'c', description: 'start in cluster mode'},
		delay: {key: 'd', args: 1, description: 'delay in ms before answering each request'},
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
	noContent.start(options, function(error)
	{
		if (error)
		{
			return log.error('Could not start noContent server: %s', error);
		}
		log.notice('No content server listening on port %s', options.port);
	});
}

