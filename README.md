# json-filter

A high-performance web server that parses the JSON payload and redirects requests to a different server.

## API

The JSON filter can be used in your code using the very simple API.
First install locally:

First run `npm install` to get all dependencies:

    $ npm install

Or add to the dependencies of your `package.json`.
Then start the filter from your code, for instance:

```
var jsonFilter = require('json-filter');
var options = {
    port: 8080,
    destination: 'localhost:55500',
    passRequest: function(message)
    {
        // process request
        return true;
    },
    passResponse: function(message)
    {
        // process response
        return true;
    },
};
jsonFilter.start(options, function(error)
{
    if (error)
    {
        console.error('Could not start JSON filter: %s', error);
    }
});
```

### `jsonFilter.start(options, callback)`

This function receives an object with options and a callback, and starts a JSON filter server.
The server will receive HTTP requests, and will relay to a backend server only those requests
for which the `options.passRequest` function returns `true`.
When the response comes from the backend server it will be relayed back to the caller only if
the `options.passResponse` returns `true`. In any other case the caller will receive an
HTTP 204 "No Content" response.

#### `options` object

The following attributes are required:

* `port`: the port to start the server on.
* `destination`: backend to send the filtered messages.
* `passRequest(message)`: a function that will receive the complete parsed request
and return `true` if the message passes the filter; otherwise an HTTP 204 response
will be sent back to the caller.
* `passResponse(message)`: a function that will receive the complete parsed response
and return `true` if the message passes the filter; otherwise an HTTP 204 response
will be sent back to the caller.

#### `callback`: `function(error) {...}`

A function that will be called with `error` if the server could not be started.

#### `pass(message)`

A function that receives a complete message, and returns true if it passes the filter.
Otherwise the caller will receive an HTTP 204 response. Both `options.passRequest`
and `options.passResponse` have this same structure.

The message has the following attributes:

* `startLine`: the first line of an HTTP request or response. Example:
`GET / HTTP/1.1`.
* `headers`: a map of headers as key-value.
* `body`: the body of the message as a string.
* `json`: if the MIME type of the request is `application/json`,
this attribute will contain the parsed JSON.

## Binary Usage

The JSON filter can be started using binary scripts.
As before, frst run `npm install` to get all dependencies:

    $ npm install

Then try starting the `noContent` server and the JSON `filter` server from two different consoles:

    $ node bin/noContent.js
    $ node bin/filter.js

By default the `noContent` server starts in the 55500 port,
while the `filter` server starts on the 55501 port and redirects everything to the 55500 port.

### `filter` Options

The `filter` server has some runtime options.

#### `--port` or `-p _port_`

Start the `filter` server on the given port (by default 55500).

#### `--destination` or `-d _server_:_port_`

Send the filtered requests to the given destination, as `_server_:_port_`.

#### `--cluster` or `-c`

Start the `filter` server in cluster mode, so that it has a process per core on the server.

#### Example

    $ node bin/filter -c -p 8080 -d localhost:55500

Starts the `filter` server in cluster mode, on port 8080 and redirecting to local port 55500.

### `noContent` Options

The `noContent` server also has a couple of runtime options.

#### `--cluster` or `-c`

Start the `noContent` server in cluster mode, so that it has a process per core on the server.

#### `--delay` or `-d _ms_`

Delay each request for the given number of milliseconds.
This options is particularly interesting to check if a filter server responds fast
even if the backend is somehow laggy.

#### Example

    $ node bin/noContent.js -c -d 30

Starts the `noContent` server in cluster mode and with a delay of 30 ms.

## Load tests

If you want to check the speed of the filter server, just run one of the provided load test scripts.
You can use [Apache ab](http://httpd.apache.org/docs/2.2/programs/ab.html):

    $ bash/ab.sh

Or alternatively [wrk](https://github.com/wg/wrk)

    $ bash/wrk.sh

## Acknowledgements

Sample JSON adapted from [JSON Example](http://json.org/example).

## MIT License

Copyright (C) 2015 Alex Fernández <alexfernandeznpm@gmail.com>, MediaSmart Mobile
and [contributors](https://github.com/alexfernandez/json-filter/graphs/contributors).

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

