#!/bin/bash

# Build the project
echo "Building direct MCP server..."
npm run build

# Start the direct MCP server with stdio transport
echo "Starting direct MCP server with stdio transport..."
node dist/direct-index.js