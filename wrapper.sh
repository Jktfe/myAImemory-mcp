#!/bin/bash

# Wrapper script for myai-memory-sync MCP server
# This script ensures that only valid JSON-RPC messages are sent to stdout
# All other output is redirected to stderr
# This is critical for Claude Desktop compatibility

# Path to the Node.js executable
NODE_BIN=$(which node)

# Path to the actual server script
SERVER_SCRIPT="$(dirname "$0")/dist/index.js"

# Log to stderr
echo "[wrapper.sh] Starting server from $SERVER_SCRIPT" >&2

# Set environment variable to indicate we're running in wrapper mode
export MCP_WRAPPER_MODE="true"

# Run the server with stdout and stderr separated
# The grep filter ensures only lines that look like valid JSON-RPC objects are sent to stdout
# The pattern matches: {"jsonrpc":"2.0",...} with possible whitespace
$NODE_BIN $SERVER_SCRIPT 2>&1 | grep -E '^\s*\{\s*"jsonrpc"\s*:\s*"2\.0".*\}\s*$'

# Capture the exit code
EXIT_CODE=$?

# Log to stderr
echo "[wrapper.sh] Server process exited with code $EXIT_CODE" >&2

# Exit with the same code
exit $EXIT_CODE
