#!/usr/bin/env node

/**
 * Test script for the direct wrapper MCP server implementation
 * 
 * This script spawns the direct wrapper MCP server and sends test requests to it
 */

import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the wrapper script
const wrapperPath = join(__dirname, 'direct-wrapper.js');

console.log('Starting Direct Wrapped MCP server test...');
console.log(`Using wrapper script at: ${wrapperPath}`);

// Spawn the server process
const serverProcess = spawn('node', [wrapperPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    DEBUG: 'true'
  }
});

// Log server output
serverProcess.stdout.on('data', (data) => {
  console.log(`[Server stdout] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.log(`[Server log] ${data.toString().trim()}`);
});

// Wait for the server to start
setTimeout(() => {
  console.log('Sending request: ' + JSON.stringify({
    jsonrpc: '2.0',
    id: 5078,
    method: 'initialize',
    params: {
      protocolVersion: '0.3.0',
      capabilities: {
        tools: {}
      }
    }
  }, null, 2));
  
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
    console.log('Sending request: ' + JSON.stringify({
      jsonrpc: '2.0',
      id: 7581,
      method: 'listTools',
      params: {}
    }, null, 2));
    
    const listToolsRequest = {
      jsonrpc: '2.0',
      id: 7581,
      method: 'listTools',
      params: {}
    };
    
    serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    setTimeout(() => {
      console.log('Sending request: ' + JSON.stringify({
        jsonrpc: '2.0',
        id: 7512,
        method: 'get_template',
        params: {}
      }, null, 2));
      
      const getTemplateRequest = {
        jsonrpc: '2.0',
        id: 7512,
        method: 'get_template',
        params: {}
      };
      
      serverProcess.stdin.write(JSON.stringify(getTemplateRequest) + '\n');
      
      setTimeout(() => {
        console.log('Sending request: ' + JSON.stringify({
          jsonrpc: '2.0',
          id: 2678,
          method: 'get_section',
          params: {
            sectionName: 'User Information'
          }
        }, null, 2));
        
        const getSectionRequest = {
          jsonrpc: '2.0',
          id: 2678,
          method: 'get_section',
          params: {
            sectionName: 'User Information'
          }
        };
        
        serverProcess.stdin.write(JSON.stringify(getSectionRequest) + '\n');
        
        console.log('Tests completed, waiting for responses...');
        
        // Wait for responses and then terminate
        setTimeout(() => {
          console.log('Tests completed, terminating server...');
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
