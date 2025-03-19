#!/usr/bin/env node

/**
 * This is a strict MCP server wrapper implementing the stdio protocol.
 * It ensures ONLY valid JSON-RPC messages are written to stdout.
 * 
 * This is implemented in CommonJS format for maximum compatibility.
 */

const childProcess = require('child_process');
const path = require('path');

// Regular expression to quickly identify potential JSON-RPC messages
const jsonRpcPattern = /^\s*\{\s*["']jsonrpc["']\s*:/;

// Path to the actual server script
const serverPath = path.join(__dirname, 'dist', 'index.js');

console.error(`[MCP-WRAPPER] Starting server from ${serverPath}`);

// Create a child process for the server
const serverProcess = childProcess.spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Force strict stdout handling
    FORCE_STRICT_STDOUT: 'true'
  }
});

console.error('[MCP-WRAPPER] Server process created');

// Handle server stdout - ONLY forward valid JSON-RPC messages
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  const lines = output.split('\n').filter(Boolean);
  
  for (const line of lines) {
    // Quick check if line starts with a JSON-RPC pattern
    if (jsonRpcPattern.test(line)) {
      try {
        // Try to parse as JSON to validate
        const parsed = JSON.parse(line);
        
        // Additional check for jsonrpc field
        if (parsed && typeof parsed === 'object' && 'jsonrpc' in parsed) {
          // Valid JSON-RPC, write to stdout
          process.stdout.write(line + '\n');
          console.error(`[MCP-WRAPPER:debug] Forwarded valid JSON-RPC message`);
        } else {
          // JSON but not JSON-RPC
          console.error(`[MCP-WRAPPER:redirect] Not a JSON-RPC message: ${line}`);
        }
      } catch (err) {
        // Not valid JSON
        console.error(`[MCP-WRAPPER:redirect] Invalid JSON from stdout: ${line}`);
      }
    } else {
      // Doesn't look like JSON-RPC at all
      console.error(`[MCP-WRAPPER:redirect] Non-JSON output: ${line}`);
    }
  }
});

// Redirect all stderr output
serverProcess.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Handle server exit
serverProcess.on('exit', (code) => {
  console.error(`[MCP-WRAPPER] Server process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle process signals
process.on('SIGINT', () => {
  console.error('[MCP-WRAPPER] Received SIGINT, forwarding to server');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.error('[MCP-WRAPPER] Received SIGTERM, forwarding to server');
  serverProcess.kill('SIGTERM');
});

// Forward stdin to the server process
process.stdin.on('data', (data) => {
  serverProcess.stdin.write(data);
});

console.error('[MCP-WRAPPER] Wrapper initialized and ready');