'use strict';

/**
 * A proxy server.
 * (C) 2015 MediaSmart Mobile.
 */

// requires
var net = require('net');
var testing = require('testing');
var microprofiler = require('microprofiler');
var Log = require('log');
var noContent = require('./noContent.js');
var analysis = require('./analysis.js');

// globals
var log = new Log('info');


/**
 * Start a proxy server that resends everything. Params:
 *	- options: can contain:
 *		- port: to start the server on.
 *		- destination: to send messages to.
 *	- callback: function(error, result) to send the result.
 */
exports.start = function(options, callback)
{
	if (!options.destination.contains(':'))
	{
		return callback('Invalid destination ' + options.destination);
	}
	var server = net.createServer(function(connection)
	{
		log.info('Connection open to port %s', options.port);
		var socket = openConnection(options, function(error)
		{
			if (error)
			{
				log.error('Could not open connection: %s', error);
			}
			var analyzer = new analysis.Analyzer();
			connection.on('data', function(data)
			{
				var start = microprofiler.start();
				analyzer.analyzeRequest(data);
				microprofiler.measureFrom(start, 'afterAnalyze', 10000);
				if (analyzer.resend)
				{
					socket.write(analyzer.resend);
					microprofiler.measureFrom(start, 'resend', 10000);
				}
				else if (analyzer.response)
				{
					connection.write(analyzer.response);
					microprofiler.measureFrom(start, 'response', 10000);
				}
			});
			socket.on('data', function(data)
			{
				connection.write(data);
				analyzer.analyzeResponse(data);
			});
		});
		connection.setNoDelay(true);
		connection.on('error', function(error)
		{
			log.error('Error on connection: %s', error);
		});
		connection.on('end', function()
		{
			log.notice('Connection to proxy server closed');
			socket.end();
		});
	});
	server.on('error', function(error)
	{
		log.error('Server error: %s', error);
	});
	server.listen(options.port, callback);
	return server;
};

function openConnection(options, callback)
{
	var host = options.destination.substringUpTo(':');
	var port = options.destination.substringFrom(':');
	var socket = net.connect(port, host, callback);
	socket.setNoDelay();
	socket.setTimeout(100000, function()
	{
		if (socket)
		{
			socket.end();
		}
	});
	socket.on('error', function(error)
	{
		log.error('Socket error: %s', error);
	});
	socket.on('end', function()
	{
		log.notice('Socket ended');
	});
	if (options.verbose)
	{
		log.info('Opened connection to %s', options.endpoint);
	}
	return socket;
}

/**
 * Test the proxy.
 */
function testProxy(callback)
{
	var innerPort = 55543;
	var options = {
		port: 55542,
		destination: 'localhost:' + innerPort,
	};
	var noContentServer = noContent.start({port: innerPort}, function(error)
	{
		testing.check(error, 'Could not start noContent server', callback);
		var server = exports.start(options, function(error)
		{
			testing.check(error, 'Could not start server', callback);
			var socket = net.connect(options.port, function(error)
			{
				testing.check(error, 'Could not connect', callback);
				var message = 'hello';
				socket.write(message);
				socket.on('error', function(error)
				{
					testing.check(error, 'Socket error', callback);
				});
				socket.on('data', function(data)
				{
					testing.assert(String(data).contains('204'), 'Invalid data received', callback);
					socket.end(function()
					{
						server.close(function(error)
						{
							testing.check(error, 'Error closing server', callback);
							noContentServer.close(function(error)
							{
								testing.check(error, 'Error closing noContent server', callback);
								testing.success(callback);
							});
						});
					});
				});
			});
		});
	});
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	log.debug('Running tests');
	testing.run([
		testProxy,
	], 5000, callback);
};

// run tests if invoked directly.
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

