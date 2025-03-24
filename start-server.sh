#!/bin/bash

# myAI Memory Sync - Unified Server Script
# This script provides a single entry point for starting the server with different options

# Default settings
TRANSPORT="stdio"
PORT=3000
USE_DIRECT=false
DEBUG=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --http)
      TRANSPORT="http"
      shift
      ;;
    --port=*)
      PORT="${1#*=}"
      shift
      ;;
    --direct)
      USE_DIRECT=true
      shift
      ;;
    --debug)
      DEBUG=true
      shift
      ;;
    --help)
      echo "Usage: start-server.sh [options]"
      echo ""
      echo "Options:"
      echo "  --http           Start HTTP server instead of stdio"
      echo "  --port=NUMBER    Set HTTP server port (default: 3000)"
      echo "  --direct         Use direct implementation (no SDK)"
      echo "  --debug          Enable debug mode"
      echo "  --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  start-server.sh                   # Start stdio server with SDK implementation"
      echo "  start-server.sh --http            # Start HTTP server on port 3000"
      echo "  start-server.sh --http --port=8080 # Start HTTP server on port 8080"
      echo "  start-server.sh --direct          # Start stdio server with direct implementation"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build the project
echo "Building project..."
npm run build

# Prepare command arguments
SERVER_ARGS=("server")

if [ "$TRANSPORT" = "http" ]; then
  SERVER_ARGS+=("--transport" "http" "--port" "$PORT")
  echo "Starting HTTP server on port $PORT..."
else
  echo "Starting stdio server..."
fi

if [ "$USE_DIRECT" = true ]; then
  SERVER_ARGS+=("--direct")
  echo "Using direct implementation (no SDK)..."
fi

if [ "$DEBUG" = true ]; then
  SERVER_ARGS+=("--debug")
  echo "Debug mode enabled..."
fi

# Start the server
node dist/unified-cli.js "${SERVER_ARGS[@]}"