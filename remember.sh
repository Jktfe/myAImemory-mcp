#!/bin/bash

# Remember script for myAI Memory Sync
# This script processes a natural language memory command

if [ $# -eq 0 ]; then
  echo "Usage: ./remember.sh 'I prefer dark mode in my code editors'"
  exit 1
fi

# Combine all arguments into a single string with proper quoting
COMMAND="$*"

echo "Processing memory command: $COMMAND"
node --loader ts-node/esm src/cli.ts --remember "$COMMAND"

if [ $? -eq 0 ]; then
  echo "✅ Memory saved successfully!"
else
  echo "❌ Failed to save memory. Please check the logs for details."
  exit 1
fi
