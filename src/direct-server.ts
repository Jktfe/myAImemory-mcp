/**
 * HTTP server for the direct MCP server implementation
 */
import { createDirectMcpServer } from './direct-mcp.js';

async function main() {
  try {
    // Create the direct MCP server
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
    
    // Parse command line arguments for port
    const args = process.argv.slice(2);
    const portArg = args.findIndex(arg => arg === '--port');
    const cmdPort = portArg >= 0 && args.length > portArg + 1 ? parseInt(args[portArg + 1], 10) : null;
    
    // Start the server with HTTP transport
    const port = cmdPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
    server.startHttp(port);
    
    console.error(`Direct myAI Memory Sync MCP server is running on port ${port}...`);
  } catch (error) {
    console.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server when this file is run directly
main();

export { main };