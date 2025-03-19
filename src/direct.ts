#!/usr/bin/env node

import { DirectMcpServer } from './directServer.js';

// Main function
async function main() {
  try {
    console.error('Starting myAI Memory Sync Direct MCP server');
    
    // Create and start the server
    const server = new DirectMcpServer();
    server.start();
    
    console.error('Direct MCP server ready');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down...');
      server.stop();
      process.exit(0);
    });
    
    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down...');
      server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
main();
