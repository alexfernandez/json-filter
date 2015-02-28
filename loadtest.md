# Load testing the JSON filter

The JSON filter is a web server that receives HTTP requests and sends some of them to a backend server.
It has been fine-tuned for high performance, and it can process a lot of requests per second.
How many? Let us find out.

## Setup

## Optimizations

The web server does not use the Node.js `http` library;
instead it is a custom socket server with its own parsing of headers and body.

The Node.js virtual machine is started with the option `--max_inlined_source_size=600000`,
so that all functions are inlined. This trick accelerates execution of functions,
with little or no downsides.

## Results

The following results have been gathered in several runs.
For comparison, a custom Erlang server has been added, although I am not at liberty
of publishing the code.

The table shows krps rounded to the first decimal.

|setup|version|backend delay|backend (1 core)|backend (cluster)|filter (1 core)|filter (cluster)|
|-----|-------|-------------|----------------|-----------------|---------------|----------------|
|local|v0.10.25|0 ms        |

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

