/**
 * TransportStrategy - Interface for all transport implementations
 * Abstracts the communication protocol (HTTP, stdio, etc.)
 */

export interface TransportStrategy {
  /**
   * Initialize the transport
   */
  initialize(): Promise<void>;
  
  /**
   * Start the transport 
   */
  start(): Promise<void>;
  
  /**
   * Send a response through the transport
   */
  sendResponse(response: any): Promise<void>;
  
  /**
   * Register a request handler
   */
  onRequest(handler: (request: any) => Promise<any>): void;
  
  /**
   * Stop the transport
   */
  stop(): Promise<void>;
}