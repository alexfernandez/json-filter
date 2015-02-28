#!/bin/bash
# Alex 2015-02-22: test using ab and sending a file

ab -t 10 -c 10 -k -p sample/webapp.json -T application/json http://localhost:55501/

