#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting simple MCP server test...');

// Path to the server script
const serverPath = join(__dirname, 'dist', 'index.js');
console.log(`Using server at: ${serverPath}`);

// Spawn the server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Create readline interfaces for stdout and stderr
const stdoutReader = readline.createInterface({
  input: serverProcess.stdout,
  terminal: false
});

const stderrReader = readline.createInterface({
  input: serverProcess.stderr,
  terminal: false
});

// Handle stdout
stdoutReader.on('line', (line) => {
  console.log(`[SERVER STDOUT] ${line}`);
  
  try {
    // Try to parse as JSON
    const json = JSON.parse(line);
    console.log(`[SERVER RESPONSE] ${JSON.stringify(json, null, 2)}`);
  } catch (err) {
    // Not JSON, just log it
  }
});

// Handle stderr
stderrReader.on('line', (line) => {
  console.log(`[SERVER STDERR] ${line}`);
});

// Handle process exit
serverProcess.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  process.exit(0);
});

// Send test requests after a short delay
setTimeout(() => {
  console.log('Sending initialize request...');
  const initializeRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '0.3.0',
      capabilities: {
        tools: {}
      }
    }
  };
  
  serverProcess.stdin.write(JSON.stringify(initializeRequest) + '\n');
  
  // Send listTools request after another delay
  setTimeout(() => {
    console.log('Sending listTools request...');
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'listTools',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    // Send get_template request after another delay
    setTimeout(() => {
      console.log('Sending get_template request...');
      const getTemplateRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'get_template',
        params: {}
      };
      
      serverProcess.stdin.write(JSON.stringify(getTemplateRequest) + '\n');
      
      console.log('All test requests sent. Waiting for responses...');
      
      // Exit after 5 seconds
      setTimeout(() => {
        console.log('Test completed. Terminating server...');
        serverProcess.kill();
      }, 5000);
    }, 1000);
  }, 1000);
}, 2000);

// Handle SIGINT
process.on('SIGINT', () => {
  console.log('Received SIGINT. Terminating server...');
  serverProcess.kill();
  process.exit(0);
});
