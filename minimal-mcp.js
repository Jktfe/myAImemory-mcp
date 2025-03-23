#!/usr/bin/env node

/**
 * Minimal MCP server implementation that directly handles the JSON-RPC protocol
 * Designed specifically to overcome the initialization issues
 */

import readline from 'node:readline';

// Configure the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr, // Only use stderr for readline output
  terminal: false
});

// Handler for incoming JSON-RPC messages
function handleMessage(message) {
  try {
    const parsed = JSON.parse(message);
    
    // Log the received message to stderr
    console.error(`[MINIMAL-MCP] Received message: ${JSON.stringify(parsed.method || 'unknown')}`);
    
    // Handle initialize message
    if (parsed.method === 'initialize') {
      // Construct a proper initialize response
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          protocolVersion: parsed.params.protocolVersion || '2024-11-05',
          serverInfo: {
            name: 'myAI Memory Sync',
            version: '1.0.0'
          },
          capabilities: {
            tools: {}
          }
        }
      };
      
      // Send the response to stdout
      console.error('[MINIMAL-MCP] Sending initialize response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    
    // Other message types would be handled here...
    
  } catch (err) {
    console.error(`[MINIMAL-MCP] Error handling message: ${err.message}`);
  }
}

// Listen for messages on stdin
rl.on('line', (line) => {
  if (line.trim()) {
    handleMessage(line);
  }
});

// Setup signal handlers
process.on('SIGINT', () => {
  console.error('[MINIMAL-MCP] Received SIGINT, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MINIMAL-MCP] Received SIGTERM, exiting');
  process.exit(0);
});

// Notify that we're ready
console.error('[MINIMAL-MCP] Server ready and waiting for messages');