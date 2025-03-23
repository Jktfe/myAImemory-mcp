#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Start the MCP server with HTTP transport
echo "Starting MCP server with HTTP transport on port 3000..."
node dist/server.js