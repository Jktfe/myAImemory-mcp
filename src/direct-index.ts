/**
 * Entry point for the direct MCP server implementation
 */
import { createDirectMcpServer } from './direct-mcp.js';

async function main() {
  try {
    // Create and start the direct MCP server
    const server = await createDirectMcpServer();
    
    // Set up process event handlers
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      // Continue running
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      // Continue running
    });
    
    // Start the server with stdio transport
    server.startStdio();
    
    console.error('Direct myAI Memory Sync MCP server is running...');
  } catch (error) {
    console.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
main();