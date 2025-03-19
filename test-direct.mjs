#!/usr/bin/env node

/**
 * Test script for the direct MCP server implementation
 * 
 * This script spawns the direct MCP server and sends test requests to it
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the server script
const serverPath = join(__dirname, 'direct-server.js');

console.log('Starting Direct MCP server test...');
console.log(`Using server at: ${serverPath}`);

// Spawn the server process
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DEBUG: 'true'
  }
});

// Log server output
serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER STDOUT] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.log(`[SERVER STDERR] ${data.toString().trim()}`);
});

// Wait for the server to start
setTimeout(() => {
  console.log('Sending initialize request...');
  
  const initializeRequest = {
    jsonrpc: '2.0',
    id: 5078,
    method: 'initialize',
    params: {
      protocolVersion: '0.3.0',
      capabilities: {
        tools: {}
      }
    }
  };
  
  serverProcess.stdin.write(JSON.stringify(initializeRequest) + '\n');
  
  setTimeout(() => {
    console.log('Sending listTools request...');
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 7581,
      method: 'listTools',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    setTimeout(() => {
      console.log('Sending get_template request...');
      
      const getTemplateRequest = {
        jsonrpc: '2.0',
        id: 7512,
        method: 'get_template',
        params: {}
      };
      
      serverProcess.stdin.write(JSON.stringify(getTemplateRequest) + '\n');
      
      setTimeout(() => {
        console.log('Sending get_section request...');
        
        const getSectionRequest = {
          jsonrpc: '2.0',
          id: 2678,
          method: 'get_section',
          params: {
            sectionName: 'User Information'
          }
        };
        
        serverProcess.stdin.write(JSON.stringify(getSectionRequest) + '\n');
        
        console.log('All test requests sent. Waiting for responses...');
        
        // Wait for responses and then terminate
        setTimeout(() => {
          console.log('Test completed. Terminating server...');
          serverProcess.kill('SIGTERM');
        }, 2000);
      }, 500);
    }, 500);
  }, 500);
}, 1000);

// Handle server process exit
serverProcess.on('exit', (code, signal) => {
  console.log(`Server process exited with code ${code} and signal ${signal}`);
  process.exit(0);
});
