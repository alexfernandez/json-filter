# Load testing the JSON filter

The JSON filter is a web server that receives HTTP requests and sends some of them to a backend server.
It has been fine-tuned for high performance, and it can process a lot of requests per second.
How many? Let us find out.

## Setup

The JSON filter has a simple mission: relay some requests to a backend server which takes 30 ms to answer,
and then relays the response back to the caller.
The decision on what requests to relay depends on a function that receives the JSON; if it returns
`false` then an HTTP 204 "No content" response is returned immediately to the caller and the request is not relayed to the backend.

### Backend Server

The backend server is run using the `noContent.js` server.
It returns always a 204 "No content",
but only after it has spent 30 ms thinking.
This server simulates a backend that takes some time to answer.
It is started using this command:

    $ node --max_inlined_source_size=600000 bin/noContent.js -c -d 30

### JSON Filter

The filter server is started using this command:

    $ node --max_inlined_source_size=600000 bin/filter.js -c

### Optimizations

The web server does not use the Node.js `http` library;
instead it is a custom socket server with its own parsing of headers and body.

The Node.js virtual machine is started with the option `--max_inlined_source_size=600000`,
so that all functions are inlined. This trick accelerates execution of functions,
with little or no downsides.

## Results

The following results have been gathered in several runs.
For comparison, a custom Erlang server has been added, although I am not at liberty
of publishing the code.

Tests are run for 20 seconds with wrk, using this command:

    $ wrk -c 2500 -t 1000 http://localhost:55501/ -s sample/caller.lua -d 20

where `sample/caller.lua` is in this repo: it just sends a sample JSON file.
The average krps is rounded to the first decimal.

|server|engine          |1 core  |cluster |
|------|----------------|--------|--------|
|local |Node.js v0.10.36|5.3 krps|7.2 krps|
|local |Node.js v0.12   |5.1 krps|7.7 krps|
|local |io.js v1.4.1    |4.3 krps|7.6 krps|

The "local" server is a rather puny Intel(R) Core(TM) i3-2120T CPU @ 2.60GHz,
with two cores. Operating system is Debian testing.
The JSON filter is tested using the fastest backend (which is currently io.js),
set to 30 ms delay.
Local results are a bit noisy: e.g. the cluster results for io.js v1.4.1 range
from 6.8 to 7.7 krps with no apparent change in the server load.

|server|engine          |1 core  |cluster |
|------|----------------|--------|--------|
|c4.2xlarge|Node.js v0.10.36|5.3 krps|26.5 krps|
|c4.2xlarge|Node.js v0.12   |5.1 krps|32.1 krps|
|c4.2xlarge|io.js v1.4.1    |4.3 krps|31.4 krps|

The "c4.2xlarge" server is an Amazon EC2 instance of the same name,
using Ubuntu 14.04 LTS.
Again the backend is run using io.js with a 30 ms delay.

## Improve Me

Do you think you can improve my results? 
Just fork the repo and give it a go.
Send a pull request when you are ready;
be sure to include your results in a text file or something.

Are you an Erlang expert eager to write a better implementation
that blows the present one out of the water? Please do!
Send it to me by mail or include it in a pull request
in the `src/` directory, complete with clear instructions for running it.

## Contact

You can contact me at [<alexfernandeznpm@gmail.com>](mailto:alexfernandeznpm@gmail.com).

