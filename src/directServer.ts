#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { z } from 'zod';
import * as readline from 'node:readline';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// JSON-RPC schema for validation
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

// Default config
const DEFAULT_CONFIG = {
  email: '',
  apiKey: '',
  syncEnabled: true,
  autoSync: true,
  syncInterval: 3600, // 1 hour
  lastSync: 0,
  debug: false,
};

// Template data
const TEMPLATE = {
  name: 'Memory Template',
  description: 'Template for storing memories',
  sections: [
    {
      name: 'User Information',
      description: 'Information about the user',
      fields: [
        {
          name: 'name',
          type: 'string',
          description: 'The name of the user',
          required: true,
        },
        {
          name: 'email',
          type: 'string',
          description: 'The email of the user',
          required: true,
        },
      ],
    },
    {
      name: 'Memory',
      description: 'The memory to store',
      fields: [
        {
          name: 'title',
          type: 'string',
          description: 'The title of the memory',
          required: true,
        },
        {
          name: 'content',
          type: 'string',
          description: 'The content of the memory',
          required: true,
        },
        {
          name: 'tags',
          type: 'array',
          description: 'Tags associated with the memory',
          required: false,
        },
      ],
    },
  ],
};

// Tool definitions
const TOOLS = [
  {
    name: 'get_template',
    description: 'Get the template for storing memories',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_section',
    description: 'Get a specific section of the template',
    parameters: {
      type: 'object',
      properties: {
        sectionName: {
          type: 'string',
          description: 'The name of the section to retrieve',
        },
      },
    },
  },
  {
    name: 'save_memory',
    description: 'Save a memory to the database',
    parameters: {
      type: 'object',
      properties: {
        memory: {
          type: 'object',
          description: 'The memory to save',
        },
      },
    },
  },
  {
    name: 'get_memories',
    description: 'Get memories from the database',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The query to search for',
        },
        limit: {
          type: 'number',
          description: 'The maximum number of memories to return',
        },
      },
    },
  },
];

/**
 * Direct MCP Server implementation that handles JSON-RPC messages directly
 */
export class DirectMcpServer {
  private config: typeof DEFAULT_CONFIG;
  private stdinReader: readline.Interface | null = null;
  private isStarted = false;
  
  constructor() {
    // Load or create config
    const configPath = join(homedir(), '.myai-memory-sync', 'config.json');
    this.config = DEFAULT_CONFIG;
    
    try {
      if (existsSync(configPath)) {
        const configData = readFileSync(configPath, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
      } else {
        // Create default config
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          const { mkdir } = require('node:fs/promises');
          mkdir(configDir, { recursive: true });
        }
        writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.error('Created sample config.json file');
      }
    } catch (err) {
      console.error(`Error loading config: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    console.error(`Using email for Claude Web syncer: ${this.config.email || 'not configured'}`);
  }
  
  /**
   * Start the server
   */
  start(): void {
    if (this.isStarted) {
      console.error('Server already started');
      return;
    }
    
    console.error('Starting direct MCP server');
    
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
        
        console.error(`Received raw input: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        
        try {
          // Parse the message
          const message = JSON.parse(line);
          
          // Validate the message
          const validationResult = jsonRpcSchema.safeParse(message);
          
          if (!validationResult.success) {
            console.error(`Received invalid JSON-RPC message: ${validationResult.error.message}`);
            
            // If it has an ID, send an error response
            if (message && typeof message === 'object' && 'id' in message) {
              this.sendResponse({
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
          
          // Process the message
          this.processMessage(message);
        } catch (err) {
          console.error(`Error parsing message: ${err instanceof Error ? err.message : String(err)}`);
          
          // Try to send a parse error response
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed === 'object' && 'id' in parsed) {
              this.sendResponse({
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
            console.error('Could not parse message to extract ID for error response');
          }
        }
      } catch (err) {
        console.error(`Error processing message: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    
    this.isStarted = true;
    console.error('Direct MCP server started');
  }
  
  /**
   * Process a JSON-RPC message
   */
  private processMessage(message: any): void {
    if (!message.method) {
      console.error('Message has no method');
      return;
    }
    
    console.error(`Processing message method: ${message.method}`);
    
    switch (message.method) {
      case 'initialize':
        this.handleInitialize(message);
        break;
      case 'listTools':
        this.handleListTools(message);
        break;
      case 'get_template':
        this.handleGetTemplate(message);
        break;
      case 'get_section':
        this.handleGetSection(message);
        break;
      case 'save_memory':
        this.handleSaveMemory(message);
        break;
      case 'get_memories':
        this.handleGetMemories(message);
        break;
      default:
        this.sendResponse({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`
          }
        });
        break;
    }
  }
  
  /**
   * Handle initialize request
   */
  private handleInitialize(message: any): void {
    console.error('Handling initialize request');
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        serverInfo: {
          name: 'myAI Memory Sync',
          version: '1.0.0',
        },
        capabilities: {
          tools: {},
        },
      }
    });
  }
  
  /**
   * Handle listTools request
   */
  private handleListTools(message: any): void {
    console.error('Handling listTools request');
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: TOOLS
      }
    });
  }
  
  /**
   * Handle get_template request
   */
  private handleGetTemplate(message: any): void {
    console.error('Handling get_template request');
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        template: TEMPLATE
      }
    });
  }
  
  /**
   * Handle get_section request
   */
  private handleGetSection(message: any): void {
    console.error('Handling get_section request');
    
    const sectionName = message.params?.sectionName;
    
    if (!sectionName) {
      this.sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32602,
          message: 'Invalid params: sectionName is required'
        }
      });
      return;
    }
    
    // Find the section
    const section = TEMPLATE.sections.find(s => s.name === sectionName);
    
    if (!section) {
      this.sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32602,
          message: `Invalid params: section "${sectionName}" not found`
        }
      });
      return;
    }
    
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        section
      }
    });
  }
  
  /**
   * Handle save_memory request
   */
  private handleSaveMemory(message: any): void {
    console.error('Handling save_memory request');
    
    const memory = message.params?.memory;
    
    if (!memory) {
      this.sendResponse({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32602,
          message: 'Invalid params: memory is required'
        }
      });
      return;
    }
    
    // Here you would save the memory to your database
    // For now, just log it
    console.error(`Saving memory: ${JSON.stringify(memory)}`);
    
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        success: true,
        message: 'Memory saved successfully'
      }
    });
  }
  
  /**
   * Handle get_memories request
   */
  private handleGetMemories(message: any): void {
    console.error('Handling get_memories request');
    
    const query = message.params?.query;
    const limit = message.params?.limit || 10;
    
    // Here you would query your database for memories
    // For now, just return some sample data
    this.sendResponse({
      jsonrpc: '2.0',
      id: message.id,
      result: {
        memories: [
          {
            id: '1',
            title: 'Sample Memory 1',
            content: 'This is a sample memory',
            tags: ['sample', 'memory'],
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            title: 'Sample Memory 2',
            content: 'This is another sample memory',
            tags: ['sample', 'memory'],
            createdAt: new Date().toISOString(),
          },
        ]
      }
    });
  }
  
  /**
   * Send a JSON-RPC response
   */
  private sendResponse(response: any): void {
    try {
      // Validate the response
      const validationResult = jsonRpcSchema.safeParse(response);
      
      if (!validationResult.success) {
        console.error(`Invalid JSON-RPC response: ${validationResult.error.message}`);
        return;
      }
      
      // Convert to string
      const responseStr = JSON.stringify(response);
      
      // Debug log
      console.error(`Sending response: ${responseStr.substring(0, 100)}...`);
      
      // Write directly to stdout
      process.stdout.write(responseStr + '\n');
    } catch (err) {
      console.error(`Error sending response: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  /**
   * Stop the server
   */
  stop(): void {
    if (this.stdinReader) {
      this.stdinReader.close();
      this.stdinReader = null;
    }
    
    this.isStarted = false;
    console.error('Direct MCP server stopped');
  }
}

// Main function
async function main() {
  try {
    console.error('Starting myAI Memory Sync MCP server');
    
    // Create and start the server
    const server = new DirectMcpServer();
    server.start();
    
    console.error('MCP server ready');
    
    // Keep the process alive
    process.stdin.resume();
    
    // Handle SIGTERM gracefully
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down...');
      server.stop();
      process.exit(0);
    });
    
    // Handle SIGINT gracefully
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down...');
      server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error starting MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
