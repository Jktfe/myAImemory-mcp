#!/usr/bin/env node

/**
 * Wrapper script for MCP server
 * 
 * This script runs the MCP server as a child process and filters its output
 * to ensure that only valid JSON-RPC messages are sent to stdout while all
 * other output is redirected to stderr. This prevents Claude Desktop from
 * encountering JSON parsing errors.
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the actual server script
const serverPath = join(__dirname, 'dist', 'index.js');

// Debug mode
const DEBUG = process.env.DEBUG === 'true';

// Log to stderr
function log(message) {
  process.stderr.write(`[wrapper] ${message}\n`);
}

function debug(message) {
  if (DEBUG) {
    process.stderr.write(`[wrapper:debug] ${message}\n`);
  }
}

// Log that we're starting
log(`Starting server from ${serverPath}`);

// Spawn the server process with environment variables
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    MCP_WRAPPER_MODE: 'true',
    NODE_OPTIONS: '--trace-warnings'
  }
});

// Create readline interfaces for stdout and stderr
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
    // Skip empty lines
    if (!line.trim()) {
      return;
    }
    
    // Try to parse as JSON to validate
    try {
      const parsed = JSON.parse(line);
      
      // Only forward valid JSON-RPC messages
      if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
        debug(`Forwarding server response: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        process.stdout.write(line + '\n');
      } else {
        // Not a valid JSON-RPC message, redirect to stderr
        process.stderr.write(`[wrapper:redirect:not-jsonrpc] ${line}\n`);
      }
    } catch (err) {
      // Not valid JSON, redirect to stderr
      process.stderr.write(`[wrapper:redirect:not-json] ${line}\n`);
    }
  } catch (err) {
    // Error processing line
    process.stderr.write(`[wrapper:error] Error processing stdout line: ${err.message}\n`);
  }
});

// Redirect all stderr output from the server
stderrRl.on('line', (line) => {
  process.stderr.write(`[wrapper:stderr] ${line}\n`);
});

// Handle stdin (from client) and forward to server
const stdinRl = createInterface({
  input: process.stdin,
  terminal: false
});

stdinRl.on('line', (line) => {
  try {
    // Skip empty lines
    if (!line.trim()) {
      return;
    }
    
    // Try to parse as JSON to validate
    try {
      const parsed = JSON.parse(line);
      
      // Only forward valid JSON-RPC messages
      if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
        debug(`Forwarded client request: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        serverProcess.stdin.write(line + '\n');
      } else {
        // Not a valid JSON-RPC message, log warning
        process.stderr.write(`[wrapper:warning] Received non-JSON-RPC message from client: ${line}\n`);
      }
    } catch (err) {
      // Not valid JSON, log warning
      process.stderr.write(`[wrapper:warning] Received non-JSON input from client: ${line}\n`);
    }
  } catch (err) {
    // Error processing line
    process.stderr.write(`[wrapper:error] Error processing stdin line: ${err.message}\n`);
  }
});

// Handle process signals
process.on('SIGINT', () => {
  log('Received SIGINT, forwarding to server');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, forwarding to server');
  serverProcess.kill('SIGTERM');
});

// Handle server process exit
serverProcess.on('exit', (code) => {
  log(`Server process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle server process errors
serverProcess.on('error', (err) => {
  log(`Server process error: ${err.message}`);
  process.exit(1);
});

// Log that we're ready
log('Wrapper initialized and ready');