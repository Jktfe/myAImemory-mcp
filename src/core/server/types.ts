/**
 * Server types and interfaces
 */
import { TransportStrategy } from '../transport/TransportStrategy.js';

/**
 * Available transport types
 */
export type Transport = 'stdio' | 'http';

/**
 * Options for creating an MCP server
 */
export interface McpServerOptions {
  name: string;
  version: string;
  useDirectImplementation?: boolean;
  port?: number;
  debug?: boolean;
}

/**
 * Interface for MCP server implementations
 */
export interface IMcpServer {
  /**
   * Initialize the server
   */
  initialize(): Promise<void>;
  
  /**
   * Set the transport strategy for the server
   */
  setTransport(transport: TransportStrategy): Promise<void>;
  
  /**
   * Start the server
   */
  start(): Promise<void>;
  
  /**
   * Stop the server
   */
  stop(): Promise<void>;
}