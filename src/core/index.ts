/**
 * Core server implementation
 * Unified entry point for the myAI Memory Sync MCP server
 */
import { ServerFactory } from './server/ServerFactory.js';
import { McpServerOptions, Transport } from './server/types.js';
import { ServiceFactory, ImplementationType } from './services/ServiceFactory.js';
import { version } from '../version.js';

// Export public API
export { ServiceFactory, ImplementationType };
export * from './services/TemplateService.js';
export * from './services/PlatformService.js';
export * from './server/types.js';

/**
 * Start the MCP server with the specified options
 */
export async function startServer(options: {
  name?: string;
  version?: string;
  useDirectImplementation?: boolean;
  transport?: Transport;
  port?: number;
  debug?: boolean;
  implementationType?: ImplementationType;
}) {
  try {
    const serverOptions: McpServerOptions = {
      name: options.name || 'myAI Memory Sync',
      version: options.version || version,
      useDirectImplementation: options.useDirectImplementation ?? false,
      port: options.port,
      debug: options.debug
    };
    
    // Enable debug logging if requested
    if (options.debug) {
      process.env.DEBUG = 'true';
      console.error('Debug mode enabled');
    }
    
    // Set the implementation type if specified in options, otherwise use config default
    if (options.implementationType) {
      ServiceFactory.setImplementationType(options.implementationType);
      console.error(`Using ${options.implementationType} service implementation (from CLI options)`);
    } else {
      // Reset to configuration defaults
      ServiceFactory.resetToConfigDefaults();
      console.error(`Using ${ServiceFactory.getImplementationTypeString()} service implementation (from config)`);
    }
    
    // Initialize services
    await ServiceFactory.initializeServices();
    
    // Set up process event handlers
    setupProcessHandlers();
    
    // Create and start the server
    const server = await ServerFactory.createServer(serverOptions, options.transport);
    await server.start();
    
    console.error(`myAI Memory Sync server started with ${options.transport || 'stdio'} transport`);
    console.error(`Server implementation: ${options.useDirectImplementation ? 'Direct' : 'SDK-based'}`);
    console.error(`Service implementation: ${ServiceFactory.getImplementationTypeString()}`);
    
    if (options.transport === 'http') {
      console.error(`HTTP server listening on port ${options.port || 3000}`);
    }
    
    return server;
  } catch (error) {
    console.error(`Error starting server: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Set up process event handlers
 */
function setupProcessHandlers() {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(`Uncaught exception: ${error.message}\n${error.stack}`);
    // Continue running
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error(`Unhandled promise rejection: ${reason}`);
    // Continue running
  });
}