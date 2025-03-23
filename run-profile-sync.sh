#!/bin/bash

# Build the project first
npm run build

# Run the test script
node test-profile-sync.js
