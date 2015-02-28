'use strict';

/**
 * A server that responds 204 No Content.
 * (C) 2015 MediaSmart Mobile.
 */

// requires
var net = require('net');
var testing = require('testing');
var microprofiler = require('microprofiler');
var Log = require('log');

// globals
var log = new Log('info');

// constants
var HTTP_NO_RESPONSE = 'HTTP/1.1 204 No content\r\nConnection: keep-alive\r\n\r\n';


/**
 * Start a server that answers 204 No Content. Params:
 *	- options: can contain:
 *		- port: to start the server on.
 *		- delay: ms to wait before answering.
 *	- callback: function(error, result) to send the result.
 */
exports.start = function(options, callback)
{
	var server = net.createServer(function(connection)
	{
		log.debug('Connection open to port %s', options.port);
		connection.setNoDelay(true);
		connection.on('data', function(data)
		{
			var start = microprofiler.start();
			log.debug('Got data %s', data);
			if (!options.delay)
			{
				connection.write(HTTP_NO_RESPONSE);
				microprofiler.measureFrom(start, 'writeNoContent', 10000);
				return;
			}
			setTimeout(function()
			{
				connection.write(HTTP_NO_RESPONSE);
				microprofiler.measureFrom(start, 'writeNoContent', 10000);
			}, options.delay);
		});
		connection.on('error', function(error)
		{
			log.error('Error on connection: %s', error);
		});
		connection.on('end', function()
		{
			log.debug('Connection to no content server closed');
		});
	});
	server.on('error', function(error)
	{
		log.error('Server error: %s', error);
	});
	server.listen(options.port, function(error)
	{
		callback(error);
	});
	return server;
};

/**
 * Test the no content server.
 */
function testNoContent(callback)
{
	var options = {
		port: 55542,
	};
	var server = exports.start(options, function(error)
	{
		testing.check(error, 'Could not start no content', callback);
		var socket = net.connect(options.port, function(error)
		{
			testing.check(error, 'Could not connect', callback);
			var message = 'hello';
			socket.setNoDelay();
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
						testing.check(error, 'Could not close', callback);
						testing.success(callback);
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
		testNoContent,
	], callback);
};

// run tests if invoked directly.
if (__filename == process.argv[1])
{
	exports.test(testing.show);
}

