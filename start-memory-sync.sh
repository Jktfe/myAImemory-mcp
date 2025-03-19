#!/bin/bash

# Start myAI Memory Sync MCP server using stdio transport
# This script starts the server for use with Claude Desktop MCP integration

echo "Starting myAI Memory Sync MCP server..." >&2
node --loader ts-node/esm src/cli.ts --stdio
