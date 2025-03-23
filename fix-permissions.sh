#!/bin/bash

echo "🔧 Setting up myAI Memory Sync permissions..."

# Ensure the master file has proper permissions
if [ -f "myAI Master.md" ]; then
  echo "📄 Setting permissions for myAI Master.md"
  chmod 644 "myAI Master.md"
else
  echo "⚠️ myAI Master.md not found in current directory"
fi

# Make sure the Windsurf directory exists
WINDSURF_DIR="$HOME/.codeium/windsurf/memories"
echo "📁 Ensuring Windsurf memory directory exists at $WINDSURF_DIR"
mkdir -p "$WINDSURF_DIR"

# Check if we can access the Windsurf memory file
WINDSURF_FILE="$WINDSURF_DIR/global_rules.md"
if [ -f "$WINDSURF_FILE" ]; then
  echo "📄 Setting permissions for $WINDSURF_FILE"
  chmod 644 "$WINDSURF_FILE"
else
  echo "📝 Creating empty $WINDSURF_FILE"
  touch "$WINDSURF_FILE"
  chmod 644 "$WINDSURF_FILE"
fi

echo "✅ Permissions setup complete! You can now run sync again."
