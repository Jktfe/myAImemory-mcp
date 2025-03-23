#!/bin/bash

# Emergency sync script for myAI Memory Sync
# This script runs the emergency sync command to fix permissions and update all platforms

# Build the project first
npm run build

echo "Starting myAI Memory emergency sync..."
node dist/cli.js --emergency-sync

if [ $? -eq 0 ]; then
  echo "✅ Emergency sync completed successfully!"
else
  echo "❌ Emergency sync failed. Please check the logs for details."
  exit 1
fi

# Also sync with Claude.ai profile settings
echo "Also syncing with Claude.ai profile settings..."
node test-profile-sync.js

echo "Emergency sync completed!"
