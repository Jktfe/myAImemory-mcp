/**
 * StdioTransport - Implementation of the TransportStrategy for stdio
 * Handles stdin/stdout communication for MCP servers
 */
import { TransportStrategy } from './TransportStrategy.js';
import { createInterface } from 'readline';

export class StdioTransport implements TransportStrategy {
  private requestHandler: ((request: any) => Promise<any>) | null = null;
  private buffer: string = '';
  private running: boolean = false;
  
  /**
   * Initialize the stdio transport
   */
  async initialize(): Promise<void> {
    process.stdin.setEncoding('utf-8');
    
    // Set up process event handlers
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully');
      this.stop().then(() => process.exit(0));
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully');
      this.stop().then(() => process.exit(0));
    });
    
    // Debug message
    console.error('Stdio transport initialized');
  }
  
  /**
   * Start listening for incoming requests
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    
    this.running = true;
    
    // Process input line by line
    process.stdin.on('data', this.handleInput.bind(this));
    
    console.error('Stdio transport started');
  }
  
  /**
   * Register a request handler
   */
  onRequest(handler: (request: any) => Promise<any>): void {
    this.requestHandler = handler;
  }
  
  /**
   * Send a response through stdout
   */
  async sendResponse(response: any): Promise<void> {
    process.stdout.write(JSON.stringify(response) + '\n');
  }
  
  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    this.running = false;
    process.stdin.removeAllListeners('data');
    console.error('Stdio transport stopped');
  }
  
  /**
   * Handle incoming data from stdin
   */
  private handleInput(chunk: Buffer): void {
    this.buffer += chunk.toString();
    
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.substring(0, newlineIndex);
      this.buffer = this.buffer.substring(newlineIndex + 1);
      
      try {
        const request = JSON.parse(line);
        this.processRequest(request);
      } catch (error) {
        console.error(`Error parsing request: ${error instanceof Error ? error.message : String(error)}`);
        
        // Send error response
        const errorResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
          id: null,
        };
        
        this.sendResponse(errorResponse);
      }
    }
  }
  
  /**
   * Process a parsed request
   */
  private async processRequest(request: any): Promise<void> {
    if (!this.requestHandler) {
      console.error('No request handler registered');
      return;
    }
    
    try {
      const response = await this.requestHandler(request);
      if (response) {
        await this.sendResponse(response);
      }
    } catch (error) {
      console.error(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
      
      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
        },
        id: request.id || null,
      };
      
      await this.sendResponse(errorResponse);
    }
  }
}