#!/bin/bash

# Build the project
echo "Building direct MCP server..."
npm run build

# Start the direct MCP server with HTTP transport
echo "Starting direct MCP server with HTTP transport on port 3030..."
node dist/direct-server.js --port 3030