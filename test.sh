#!/bin/bash

# loop 10 times, run a command and sleep for 50s

for i in {1..10}
do
    echo "Running command $i"
    gh workflow run run-e2e-tests.yaml --ref debug/write-transfers
    sleep 50
done
