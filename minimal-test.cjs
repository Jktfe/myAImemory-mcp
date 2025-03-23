#!/usr/bin/env node

/**
 * Minimal MCP test server with a single tool
 */

const readline = require('readline');

// Configure the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr, // Only use stderr for readline output
  terminal: false
});

// MCP Message Handler
function handleMessage(message) {
  try {
    const parsed = JSON.parse(message);
    
    // Log the received message to stderr
    console.error(`[MCP] Received message: "${parsed.method || 'unknown'}" (id: ${parsed.id || 'none'})`);
    
    // Handle initialize message
    if (parsed.method === 'initialize') {
      // Construct a proper initialize response
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          protocolVersion: parsed.params.protocolVersion || '2024-11-05',
          serverInfo: {
            name: 'MCP Test Server',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              enabled: true
            }
          }
        }
      };
      
      // Send the response to stdout
      console.error('[MCP] Sending initialize response');
      process.stdout.write(JSON.stringify(response) + '\n');
    } 
    // Handle tools/list message
    else if (parsed.method === 'tools/list') {
      // Respond with a list of available tools
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          tools: [
            {
              name: 'test_tool',
              description: 'A simple test tool',
              parameters: {
                message: {
                  type: 'string',
                  description: 'A message to echo back'
                }
              }
            }
          ]
        }
      };
      
      console.error('[MCP] Sending tools/list response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for test_tool
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'test_tool') {
      const message = parsed.params.arguments.message || 'No message provided';
      
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: `You said: ${message}`
            }
          ]
        }
      };
      
      console.error('[MCP] Sending test_tool response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle any other message with a generic response
    else if (parsed.id) {
      // Generic response for any request with an ID
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {}
      };
      
      console.error(`[MCP] Sending generic response for ${parsed.method || 'unknown method'}`);
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    
  } catch (err) {
    console.error(`[MCP] Error handling message: ${err.message}`);
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
  console.error('[MCP] Received SIGINT, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP] Received SIGTERM, exiting');
  process.exit(0);
});

// Notify that we're ready
console.error('[MCP] Test server ready and waiting for messages');