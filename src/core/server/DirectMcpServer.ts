/**
 * DirectMcpServer - Custom implementation of the MCP server without the SDK
 * Provides the same functionality as the SDK-based server, but with direct control
 */
import { IMcpServer, McpServerOptions } from './types.js';
import { TransportStrategy } from '../transport/TransportStrategy.js';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { DirectRequestHandler } from '../handlers/DirectRequestHandler.js';

export class DirectMcpServer implements IMcpServer {
  private options: McpServerOptions;
  private transport: TransportStrategy | null = null;
  private requestHandler: DirectRequestHandler;
  private initialized: boolean = false;
  private nextId: number = 1;
  
  constructor(options: McpServerOptions) {
    this.options = options;
    this.requestHandler = new DirectRequestHandler(options);
  }
  
  /**
   * Initialize the server
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Initialize services
      await ServiceFactory.initializeServices();
      
      this.initialized = true;
      console.error('Direct MCP server initialized');
    } catch (error) {
      console.error(`Error initializing Direct MCP server: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Set the transport strategy for the server
   */
  async setTransport(transport: TransportStrategy): Promise<void> {
    try {
      this.transport = transport;
      
      // Initialize the transport
      await this.transport.initialize();
      
      // Register request handler
      this.transport.onRequest(async (request) => {
        return this.requestHandler.handleRequest(request);
      });
      
      console.error(`Direct MCP server connected to ${transport.constructor.name}`);
    } catch (error) {
      console.error(`Error setting transport: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (!this.transport) {
      throw new Error('Transport must be set before starting the server');
    }
    
    try {
      // Start the transport
      await this.transport.start();
      
      console.error(`Direct MCP server is running...`);
    } catch (error) {
      console.error(`Error starting Direct MCP server: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.transport) {
      await this.transport.stop();
    }
    
    console.error('Direct MCP server stopped');
  }
}