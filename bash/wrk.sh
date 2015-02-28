#!/bin/bash
# Alex 2015-02-22: test using wrk

wrk -c 10 -t 10 http://localhost:55501/ -s sample/caller.lua -d 10

