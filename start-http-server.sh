#!/bin/bash

# Start myAI Memory Sync HTTP server
# This script starts the HTTP server for web-based access

PORT=${1:-3000}

echo "Starting myAI Memory Sync HTTP server on port $PORT..." 
PORT=$PORT node --loader ts-node/esm src/cli.ts --http
