#!/bin/bash

# Safe Memory CLI for myAI Memory Sync
# A safer alternative to direct sync with automatic backups

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Set up colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}myAI Memory Sync - Safe CLI${NC}"
echo "======================="

# Check if TypeScript is compiled
if [ ! -d "./dist" ] || [ ! -f "./dist/safe-cli.js" ]; then
  echo -e "${YELLOW}Building TypeScript files...${NC}"
  npm run build
fi

# Run the CLI with arguments
node ./dist/safe-cli.js "$@"
