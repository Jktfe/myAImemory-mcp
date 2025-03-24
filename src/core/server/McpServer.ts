/**
 * McpServer - SDK-based implementation of the MCP server
 * Uses the official MCP SDK to handle requests
 */
import { McpServer as SdkMcpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HttpServerTransport } from '@modelcontextprotocol/sdk/server/http.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { IMcpServer, McpServerOptions } from './types.js';
import { TransportStrategy } from '../transport/TransportStrategy.js';
import { ServiceFactory } from '../services/ServiceFactory.js';
import { registerToolHandlers } from '../handlers/ToolHandlers.js';

export class McpServer implements IMcpServer {
  private sdkServer: SdkMcpServer;
  private options: McpServerOptions;
  private initialized: boolean = false;
  
  constructor(options: McpServerOptions) {
    this.options = options;
    
    // Create the SDK-based MCP server
    this.sdkServer = new SdkMcpServer({
      name: options.name,
      version: options.version
    });
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
      
      // Register tool handlers
      registerToolHandlers(this.sdkServer);
      
      this.initialized = true;
      console.error('SDK-based MCP server initialized');
    } catch (error) {
      console.error(`Error initializing MCP server: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Set the transport strategy for the server
   */
  async setTransport(transport: TransportStrategy): Promise<void> {
    try {
      // Map our TransportStrategy to SDK transport
      let sdkTransport;
      
      if (transport.constructor.name === 'HttpTransport') {
        // Use the SDK's HTTP transport
        const port = (this.options.port || 3000);
        sdkTransport = new HttpServerTransport({ port });
      } else {
        // Default to stdio transport
        sdkTransport = new StdioServerTransport();
      }
      
      // Connect the server with the transport
      await this.sdkServer.connect(sdkTransport);
      
      console.error(`SDK-based MCP server connected to ${transport.constructor.name}`);
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
    
    console.error(`SDK-based MCP server is running...`);
    // No explicit start needed for SDK server, as it starts when connected to a transport
  }
  
  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    // SDK server does not have an explicit stop method
    console.error('SDK-based MCP server stopped');
  }
}