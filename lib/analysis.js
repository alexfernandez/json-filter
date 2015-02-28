'use strict';

/**
 * Analyzer for filter server.
 * (C) 2015 MediaSmart Mobile.
 */

// requires
var testing = require('testing');
var microprofiler = require('microprofiler');
var Log = require('log');

// globals
var log = new Log('info');

// constants
var HTTP_NO_RESPONSE = 'HTTP/1.1 204 No content\r\nConnection: keep-alive\r\n\r\n';
var HTTP_OK = 'HTTP/1.1 200 OK\r\nContent-length: 2\r\nConnection: keep-alive\r\n\r\nOK';
var GET_NOP = 'GET /nop';


/**
 * Analyzer for the request or the response. Params:
 *	- pass: function that receives the message and returns true
 *	if the request must be passed along, false for a 204.
 */
exports.Analyzer = function(pass)
{
	// self-reference
	var self = this;

	self.init = function()
	{
		self.received = [];
		self.totalLength = 0;
		self.contentLength = 0;
		self.chunks = null;
		self.chunkLength = 0;
		self.startLine = null;
		self.headers = {};
		self.body = null;
		self.json = null;
		self.finished = false;
		self.response = null;
		self.resend = null;
	};

	self.init();

	self.analyze = function(data)
	{
		var start = microprofiler.start();
		analyzePackage(data);
		microprofiler.measureFrom(start, 'analyze-package', 100000);
		if (self.response)
		{
			return;
		}
		if (self.startLine.startsWith(GET_NOP))
		{
			self.response = HTTP_OK;
			return;
		}
		if (!self.finished)
		{
			return;
		}
		if (pass(self))
		{
			self.resend = Buffer.concat(self.received, self.totalLength);
		}
		else
		{
			self.response = HTTP_NO_RESPONSE;
		}
		microprofiler.measureFrom(start, 'pass', 100000);
	};

	function analyzePackage(data)
	{
		self.received.push(data);
		self.totalLength += data.length;
		var buffer = Buffer.concat(self.received, self.totalLength);
		if (self.contentLength)
		{
			if (self.totalLength < self.contentLength)
			{
				return;
			}
			return analyzeBody(buffer, 0);
		}
		if (self.chunks)
		{
			return analyzeChunked(buffer, 0);
		}
		analyzeFullMessage(buffer);
	}

	function analyzeFullMessage(buffer)
	{
		var start = microprofiler.start();
		var pos = 0;
		while (buffer[pos] != 13 || buffer[pos + 1] != 10)
		{
			pos += 1;
			if (pos == buffer.length - 1)
			{
				return showError('Header is too long');
			}
		}
		self.startLine = buffer.toString('utf8', 0, pos);
		log.debug('Start line: %s', self.startLine);
		microprofiler.measureFrom(start, 'read-start', 100000);
		pos += 2;
		while (buffer[pos] != 13 || buffer[pos + 1] != 10)
		{
			var headerStart = pos;
			while (buffer[pos] != 13 || buffer[pos + 1] != 10)
			{
				pos += 1;
				if (pos == buffer.length - 1)
				{
					return showError('Headers not finished');
				}
			}
			var colon = headerStart + 1;
			while (colon < pos)
			{
				if (colon == pos - 1)
				{
					return showError('Invalid header without colon');
				}
				// find :
				if (buffer[colon] == 58)
				{
					break;
				}
				colon += 1;
			}
			var key = buffer.toString('utf8', headerStart, colon).toLowerCase();
			var value = buffer.toString('utf8', colon + 1, pos).trim();
			log.debug('Header %s: %s', key, value);
			self.headers[key] = value;
			pos += 2;
			if (pos == buffer.length - 1)
			{
				return showError('Headers not finished after last');
			}
		}
		pos += 2;
		microprofiler.measureFrom(start, 'read-headers', 100000);
		if (self.headers['content-length'])
		{
			self.contentLength = parseInt(self.headers['content-length']);
			if (pos + self.contentLength > buffer.length)
			{
				self.received = [buffer.slice(pos)];
				self.totalLength = buffer.length - pos;
				log.debug('Read %s out of %s, waiting for more', buffer.length - pos, self.contentLength);
				return;
			}
			if (pos + self.contentLength < buffer.length)
			{
				return showError('Message is too short: should be %s, but stops at %s', pos + self.contentLength, buffer.length);
			}
			return analyzeBody(buffer, pos);
		}
		if (self.headers['transfer-encoding'] == 'chunked')
		{
			return analyzeChunked(buffer, pos);
		}
		if (pos != buffer.length)
		{
			return showError('Invalid length %s of %s', pos, buffer.length);
		}
		self.finished = true;
	}

	function analyzeBody(buffer, pos)
	{
		var start = microprofiler.start();
		self.body = buffer.toString('utf8', pos);
		log.debug('Body: %s', self.body);
		if (self.headers['content-type'] == 'application/json')
		{
			try
			{
				self.json = JSON.parse(self.body);
				log.debug('JSON body: %s', self.json);
				microprofiler.measureFrom(start, 'parse-json', 100000);
			}
			catch(error)
			{
				return showError('Could not parse JSON: %s', error);
			}
		}
		self.finished = true;
	}

	function analyzeChunked(buffer, pos)
	{
		self.chunks = [];
		self.received = [];
		var chunkStart = pos;
		var chunkLength = 0;
		while (pos < buffer.length)
		{
			while (buffer[pos] != 13 || buffer[pos + 1] != 10)
			{
				pos += 1;
				if (pos >= buffer.length)
				{
					return showError('Invalid chunk');
				}
			}
			var hex = buffer.toString('utf8', chunkStart, pos);
			chunkLength = parseInt(hex, 16);
			log.debug('Read chunk of length %s (%s)', chunkLength, hex);
			pos += 2;
			self.chunks.push(buffer.slice(pos, pos + chunkLength));
			self.chunkLength += chunkLength;
			pos += chunkLength;
			if (buffer[pos] != 13 || buffer[pos + 1] != 10)
			{
				return showError('Chunk should terminate in CRLF');
			}
			pos += 2;
		}
		log.debug('Final chunk of length %s', chunkLength);
		if (chunkLength)
		{
			return;
		}
		var body = Buffer.concat(self.chunks, self.chunkLength);
		analyzeBody(body, 0);
	}

	function showError()
	{
		log.error.apply(log, arguments);
		self.response = HTTP_NO_RESPONSE;
	}
};

function testAnalyzer(callback)
{
	var analyzer = new exports.Analyzer(alwaysTrue);
	analyzer.analyze(new Buffer('GET /\r\n\r\n'));
	testing.assert(analyzer.resend, 'Should resend', callback);
	testing.success(callback);
}

function alwaysTrue()
{
	return true;
}

function testNegative(callback)
{
	var analyzer = new exports.Analyzer(function() {return false;});
	analyzer.analyze(new Buffer('GET /\r\n\r\n'));
	testing.assert(!analyzer.resend, 'Should not resend', callback);
	testing.assert(analyzer.response, 'Should respond', callback);
	testing.success(callback);
}

function testReadBody(callback)
{
	var message = 'first line\r\ncontent-length: 4\r\n\r\nbody';
	var analyzer = new exports.Analyzer(alwaysTrue);
	analyzer.analyze(new Buffer(message));
	testing.assert(analyzer.resend, 'Should resend', callback);
	testing.assert(!analyzer.response, 'Should not have response', callback);
	testing.success(callback);
}

function testReadTwoPieces(callback)
{
	var body = 'longish body now';
	var message = 'first line\r\ncontent-length: ' + body.length + '\r\n\r\n' + body;
	var messages = [message.substring(0, 35), message.substring(35)];
	var analyzer = new exports.Analyzer(alwaysTrue);
	analyzer.analyze(new Buffer(messages[0]));
	testing.assert(!analyzer.resend, 'Should not resend yet', callback);
	testing.assert(!analyzer.response, 'Should not have response yet', callback);
	analyzer.analyze(new Buffer(messages[1]));
	testing.assert(analyzer.resend, 'Should resend now', callback);
	testing.assert(!analyzer.response, 'Should not have response now', callback);
	testing.success(callback);
}

function testReadChunked(callback)
{
	var body = 'longer body now for chunked';
	var message = 'first line\r\ntransfer-encoding: chunked\r\n\r\n';
	var first = message + 'a\r\n' + body.substring(0, 10) + '\r\n';
	var second = (body.length - 10).toString(16) + '\r\n' + body.substring(10) + '\r\n';
	var third = '0\r\n\r\n';
	var analyzer = new exports.Analyzer(alwaysTrue);
	analyzer.analyze(new Buffer(first));
	testing.assert(!analyzer.resend, 'Should not resend on first', callback);
	testing.assert(!analyzer.response, 'Should not have response on first', callback);
	analyzer.analyze(new Buffer(second));
	testing.assert(!analyzer.resend, 'Should not resend on second either', callback);
	testing.assert(!analyzer.response, 'Should not have response on second either', callback);
	analyzer.analyze(new Buffer(third));
	testing.assert(analyzer.resend, 'Should resend on third', callback);
	testing.assert(!analyzer.response, 'Should not have response on third either', callback);
	testing.success(callback);
}

/**
 * Run all tests.
 */
exports.test = function(callback)
{
	log.debug('Running tests');
	testing.run([
		testAnalyzer,
		testNegative,
		testReadBody,
		testReadTwoPieces,
		testReadChunked,
	], 5000, callback);
};

// run tests if invoked directly.
if (__filename == process.argv[1])
{
	log = new Log('debug');
	exports.test(testing.show);
}

