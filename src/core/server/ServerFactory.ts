/**
 * ServerFactory - Unified factory for creating MCP servers
 * Abstracts the creation of different server implementations (SDK, Direct)
 * with different transport strategies.
 */
import { McpServerOptions, Transport } from './types.js';
import { McpServer } from './McpServer.js';
import { DirectMcpServer } from './DirectMcpServer.js';
import { TransportStrategy } from '../transport/TransportStrategy.js';
import { StdioTransport } from '../transport/StdioTransport.js';
import { HttpTransport } from '../transport/HttpTransport.js';

export class ServerFactory {
  /**
   * Create a new MCP server instance with the specified options and transport
   */
  static async createServer(
    options: McpServerOptions,
    transportType: Transport = 'stdio'
  ): Promise<McpServer | DirectMcpServer> {
    // Choose the transport strategy based on type
    const transportStrategy = this.createTransportStrategy(transportType, options.port);
    
    // Create the appropriate server implementation based on options
    if (options.useDirectImplementation) {
      return this.createDirectServer(options, transportStrategy);
    } else {
      return this.createSdkServer(options, transportStrategy);
    }
  }
  
  /**
   * Create an SDK-based MCP server
   */
  private static async createSdkServer(
    options: McpServerOptions, 
    transportStrategy: TransportStrategy
  ): Promise<McpServer> {
    const server = new McpServer(options);
    await server.initialize();
    await server.setTransport(transportStrategy);
    return server;
  }
  
  /**
   * Create a direct (non-SDK) MCP server
   */
  private static async createDirectServer(
    options: McpServerOptions,
    transportStrategy: TransportStrategy
  ): Promise<DirectMcpServer> {
    const server = new DirectMcpServer(options);
    await server.initialize();
    await server.setTransport(transportStrategy);
    return server;
  }
  
  /**
   * Create transport strategy based on transport type
   */
  private static createTransportStrategy(
    transportType: Transport,
    port?: number
  ): TransportStrategy {
    switch (transportType) {
      case 'http':
        return new HttpTransport(port || 3000);
      case 'stdio':
      default:
        return new StdioTransport();
    }
  }
}