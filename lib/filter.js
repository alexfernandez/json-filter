'use strict';

/**
 * A filter server.
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
 * Start a filter server that resends everything. Params:
 *	- options: can contain:
 *		- port: to start the server on.
 *		- destination: to send messages to.
 *		- passRequest: function that receives the request and returns true
 *		if the request must be passed along, false for a 204.
 *		- passResponse: function that receives the response and returns true
 *		if the response must be returned, false for a 204.
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
		log.debug('Connection open to port %s', options.port);
		var socket = openConnection(options, function(error)
		{
			if (error)
			{
				log.error('Could not open connection: %s', error);
			}
			var requestAnalyzer = new analysis.Analyzer(options.passRequest);
			var responseAnalyzer = new analysis.Analyzer(options.passResponse);
			connection.on('data', function(data)
			{
				var start = microprofiler.start();
				requestAnalyzer.analyze(data);
				microprofiler.measureFrom(start, 'request-analyze', 100000);
				if (requestAnalyzer.resend)
				{
					socket.write(requestAnalyzer.resend);
					requestAnalyzer.init();
					microprofiler.measureFrom(start, 'request-resend', 100000);
				}
				else if (requestAnalyzer.response)
				{
					connection.write(requestAnalyzer.response);
					requestAnalyzer.init();
					microprofiler.measureFrom(start, 'request-respond', 100000);
				}
			});
			socket.on('data', function(data)
			{
				var start = microprofiler.start();
				responseAnalyzer.analyze(data);
				microprofiler.measureFrom(start, 'response-analyze', 100000);
				if (responseAnalyzer.resend)
				{
					connection.write(responseAnalyzer.resend);
					responseAnalyzer.init();
					microprofiler.measureFrom(start, 'response-resend', 100000);
				}
				else if (responseAnalyzer.response)
				{
					connection.write(responseAnalyzer.response);
					responseAnalyzer.init();
					microprofiler.measureFrom(start, 'response-respond', 100000);
				}
			});
		});
		connection.setNoDelay(true);
		connection.on('error', function(error)
		{
			log.debug('Error on connection: %j', error);
			connection.end();
		});
		connection.on('end', function()
		{
			log.debug('Connection to filter server closed');
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
		log.debug('Socket ended');
	});
	if (options.verbose)
	{
		log.debug('Opened connection to %s', options.endpoint);
	}
	return socket;
}

/**
 * Test the filter.
 */
function testFilter(callback)
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
		testFilter,
	], 5000, callback);
};

// run tests if invoked directly.
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

