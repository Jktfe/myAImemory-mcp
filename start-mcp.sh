#!/bin/bash

# Build the project
echo "Building project..."
npm run build

# Start the MCP server with stdio transport
echo "Starting MCP server with stdio transport..."
node dist/index.js