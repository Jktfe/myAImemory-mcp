/**
 * HttpTransport - Implementation of the TransportStrategy for HTTP
 * Handles HTTP communication for MCP servers
 */
import { TransportStrategy } from './TransportStrategy.js';
import express from 'express';
import cors from 'cors';
import http from 'http';

export class HttpTransport implements TransportStrategy {
  private app: express.Application;
  private server: http.Server | null = null;
  private requestHandler: ((request: any) => Promise<any>) | null = null;
  private running: boolean = false;
  
  constructor(private port: number = 3000) {
    // Initialize Express app
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors());
  }
  
  /**
   * Initialize the HTTP transport
   */
  async initialize(): Promise<void> {
    // Set up routes
    this.app.post('/', this.handleHttpRequest.bind(this));
    
    // Add health check route
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'myAI Memory Sync MCP' });
    });
    
    // Debug message
    console.error(`HTTP transport initialized on port ${this.port}`);
  }
  
  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          this.running = true;
          console.error(`HTTP transport started on port ${this.port}`);
          resolve();
        });
        
        // Handle server errors
        this.server.on('error', (error) => {
          console.error(`HTTP server error: ${error.message}`);
          reject(error);
        });
      } catch (error) {
        console.error(`Error starting HTTP server: ${error instanceof Error ? error.message : String(error)}`);
        reject(error);
      }
    });
  }
  
  /**
   * Register a request handler
   */
  onRequest(handler: (request: any) => Promise<any>): void {
    this.requestHandler = handler;
  }
  
  /**
   * Send a response (used internally)
   * This is automatically handled by the express response object in handleHttpRequest
   */
  async sendResponse(response: any): Promise<void> {
    // This is a placeholder since HTTP responses are sent directly in handleHttpRequest
    // This method exists to satisfy the TransportStrategy interface
  }
  
  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (!this.running || !this.server) {
      return;
    }
    
    return new Promise<void>((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          console.error(`Error stopping HTTP server: ${error.message}`);
          reject(error);
        } else {
          this.running = false;
          console.error('HTTP transport stopped');
          resolve();
        }
      });
    });
  }
  
  /**
   * Handle incoming HTTP requests
   */
  private async handleHttpRequest(req: express.Request, res: express.Response): Promise<void> {
    if (!this.requestHandler) {
      console.error('No request handler registered');
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Server error: No request handler registered',
        },
        id: req.body.id || null,
      });
      return;
    }
    
    try {
      const request = req.body;
      const response = await this.requestHandler(request);
      
      // Send the response
      res.json(response);
    } catch (error) {
      console.error(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
      
      // Send error response
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
        },
        id: req.body.id || null,
      });
    }
  }
}