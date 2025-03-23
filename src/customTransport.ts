import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import * as readline from 'node:readline';
import { z } from 'zod';

/**
 * JSON-RPC 2.0 message schema for validation
 */
const jsonRpcSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string().optional(),
  params: z.any().optional(),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional(),
  }).optional(),
}).refine(data => {
  // Either method (request) or result/error (response) must be present
  return (data.method !== undefined) || (data.result !== undefined) || (data.error !== undefined);
}, {
  message: 'Invalid JSON-RPC message: must contain either method, result, or error',
});

/**
 * Custom transport implementation that uses stdin/stdout
 * with strict JSON-RPC validation to ensure compatibility with Claude Desktop
 */
export class CustomStdioTransport implements Transport {
  private onMessageCallback: ((message: JSONRPCMessage) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private stdinReader: readline.Interface | null = null;
  private isStarted = false;
  private isWrapperMode = process.env.MCP_WRAPPER_MODE === 'true';
  private messageQueue: JSONRPCMessage[] = [];
  private isConnected = false;

  constructor() {
    console.error('[transport] Initializing CustomStdioTransport');
  }

  /**
   * Register a callback to be called when a message is received
   */
  onMessage(callback: (message: JSONRPCMessage) => void): void {
    console.error('[transport] Setting message handler');
    this.onMessageCallback = callback;
    this.isConnected = true;
    
    // Process any queued messages
    if (this.messageQueue.length > 0) {
      console.error(`[transport] Processing ${this.messageQueue.length} queued messages`);
      const queueCopy = [...this.messageQueue];
      this.messageQueue = [];
      
      // Process each queued message
      queueCopy.forEach(message => {
        if (this.onMessageCallback) {
          try {
            this.onMessageCallback(message);
          } catch (err) {
            console.error(`[transport:error] Error processing queued message: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      });
    }
  }

  /**
   * Register a callback to be called when the transport is closed
   */
  onClose(callback: () => void): void {
    console.error('[transport] Setting close handler');
    this.onCloseCallback = callback;
  }

  /**
   * Start the transport
   */
  start(): Promise<void> {
    if (this.isStarted) {
      console.error('[transport] Transport already started');
      return Promise.resolve();
    }

    console.error('[transport] Starting transport');
    
    if (!this.onMessageCallback) {
      console.error('[transport:error] No message handler registered before starting transport');
      // Continue anyway, we'll queue messages until a handler is registered
    }
    
    // Create readline interface for stdin
    this.stdinReader = readline.createInterface({
      input: process.stdin,
      terminal: false,
    });

    // Set up message handler
    this.stdinReader.on('line', (line) => {
      try {
        // Skip empty lines
        if (!line.trim()) {
          return;
        }

        console.error(`[transport:debug] Received raw input: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        
        try {
          // Parse the message
          const message = JSON.parse(line);
          
          // Validate the message
          const validationResult = jsonRpcSchema.safeParse(message);
          
          if (!validationResult.success) {
            console.error(`[transport:error] Received invalid JSON-RPC message: ${validationResult.error.message}`);
            
            // If it has an ID, send an error response
            if (message && typeof message === 'object' && 'id' in message) {
              this.send({
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32600,
                  message: 'Invalid Request: ' + validationResult.error.message
                }
              });
            }
            return;
          }
          
          // Call the callback if registered, otherwise queue the message
          if (this.onMessageCallback) {
            console.error(`[transport:debug] Forwarding message to handler: ${JSON.stringify(message).substring(0, 100)}...`);
            try {
              this.onMessageCallback(message);
            } catch (err) {
              console.error(`[transport:error] Error in message handler: ${err instanceof Error ? err.message : String(err)}`);
              
              // Send error response if possible
              if ('id' in message) {
                this.send({
                  jsonrpc: '2.0',
                  id: message.id,
                  error: {
                    code: -32000,
                    message: `Internal error: ${err instanceof Error ? err.message : String(err)}`
                  }
                });
              }
            }
          } else {
            console.error('[transport:debug] No message handler registered, queueing message');
            this.messageQueue.push(message);
          }
        } catch (err) {
          console.error(`[transport:error] Error parsing message: ${err instanceof Error ? err.message : String(err)}`);
          
          // Try to send a parse error response
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object' && 'id' in parsed) {
              this.send({
                jsonrpc: '2.0',
                id: parsed.id,
                error: {
                  code: -32700,
                  message: 'Parse error'
                }
              });
            }
          } catch {
            // If we can't parse it at all, we can't send a proper response
            console.error('[transport:error] Could not parse message to extract ID for error response');
          }
        }
      } catch (err) {
        console.error(`[transport:error] Error processing message: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    // Handle stdin close
    this.stdinReader.on('close', () => {
      console.error('[transport] Input stream closed');
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    });

    this.isStarted = true;
    console.error('[transport] Transport started');
    return Promise.resolve();
  }

  /**
   * Send a message through the transport
   */
  send(message: JSONRPCMessage): Promise<void> {
    try {
      // Validate the message before sending
      const validationResult = jsonRpcSchema.safeParse(message);
      
      if (!validationResult.success) {
        console.error(`[transport:error] Invalid JSON-RPC message: ${validationResult.error.message}`);
        return Promise.resolve();
      }

      // Convert to string
      const messageStr = JSON.stringify(message);
      
      // Debug log
      console.error(`[transport:debug] Sending message: ${messageStr.substring(0, 100)}...`);
      
      // Write directly to stdout
      process.stdout.write(messageStr + '\n');
      
      return Promise.resolve();
    } catch (err) {
      console.error(`[transport:error] Error sending message: ${err instanceof Error ? err.message : String(err)}`);
      return Promise.resolve();
    }
  }

  /**
   * Close the transport
   */
  close(): Promise<void> {
    if (this.stdinReader) {
      this.stdinReader.close();
      this.stdinReader = null;
    }
    
    this.isStarted = false;
    this.isConnected = false;
    console.error('[transport] Transport stopped');
    return Promise.resolve();
  }
}
