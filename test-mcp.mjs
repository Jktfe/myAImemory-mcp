#!/usr/bin/env node

/**
 * Test script for the MCP server
 * 
 * This script sends JSON-RPC requests to the MCP server and logs the responses.
 * It can be used to test both the wrapper script and the direct server.
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const USE_WRAPPER = true; // Set to true to test with wrapper
const SERVER_PATH = USE_WRAPPER 
  ? join(__dirname, 'wrapper.js')
  : join(__dirname, 'dist', 'index.js');

console.log('Starting MCP server test...');
console.log(`Using ${USE_WRAPPER ? 'wrapper script' : 'direct server'} at: ${SERVER_PATH}`);

// Spawn the server process
const serverProcess = spawn('node', [SERVER_PATH], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DEBUG: 'true',
    NODE_OPTIONS: '--trace-warnings'
  }
});

// Create readline interfaces
const stdoutRl = createInterface({
  input: serverProcess.stdout,
  terminal: false
});

const stderrRl = createInterface({
  input: serverProcess.stderr,
  terminal: false
});

// Handle stdout from the server
stdoutRl.on('line', (line) => {
  try {
    // Try to parse as JSON
    const response = JSON.parse(line);
    console.log('Received response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.log('Received non-JSON output:', line);
  }
});

// Log stderr output
stderrRl.on('line', (line) => {
  console.log('[Server log]', line);
});

// Wait for server to start
async function main() {
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test requests
  const requests = [
    {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'initialize',
      params: {
        protocolVersion: '0.3.0',
        capabilities: {
          tools: {}
        }
      }
    },
    {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'listTools',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'get_template',
      params: {}
    },
    {
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 10000),
      method: 'get_section',
      params: {
        sectionName: 'User Information'
      }
    }
  ];

  // Send each request with a delay
  for (const request of requests) {
    console.log('Sending request:', JSON.stringify(request, null, 2));
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait longer between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Wait longer for responses
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Terminate the server
  console.log('Tests completed, terminating server...');
  serverProcess.kill('SIGTERM');

  // Exit after a short delay
  setTimeout(() => {
    process.exit(0);
  }, 1000);
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
