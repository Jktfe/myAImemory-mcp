#!/usr/bin/env node

/**
 * Direct MCP Server Implementation
 * 
 * This is a standalone MCP server implementation that directly handles JSON-RPC messages
 * without relying on the MCP SDK's transport layer. This approach ensures proper message
 * handling and compatibility with Claude Desktop and Windsurf.
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';
import { mkdir, readdir, readFile, unlink } from 'node:fs/promises';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Debug mode
const DEBUG = process.env.DEBUG === 'true';

// Debug log
function debug(message) {
  if (DEBUG) {
    console.error(`[debug] ${message}`);
  }
}

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

// Default memory directory
const MEMORY_DIR = join(homedir(), '.myAImemory');

// Ensure memory directory exists
async function ensureMemoryDir() {
  try {
    await mkdir(MEMORY_DIR, { recursive: true });
  } catch (error) {
    console.error(`Error creating memory directory: ${error.message}`);
  }
}

// Tool definitions
const TOOLS = [
  {
    name: 'store_memory',
    description: 'Store a memory with a unique key',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The unique identifier for the memory',
        },
        content: {
          type: 'string',
          description: 'The content to store',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional tags for categorizing the memory',
        },
      },
      required: ['key', 'content'],
    },
  },
  {
    name: 'get_memory',
    description: 'Retrieve a memory by its key',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory to retrieve',
        },
      },
      required: ['key'],
    },
  },
  {
    name: 'delete_memory',
    description: 'Delete a memory by its key',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory to delete',
        },
      },
      required: ['key'],
    },
  },
  {
    name: 'list_memories',
    description: 'List all memories, optionally filtered by tag',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'Optional tag to filter memories by',
        },
      },
    },
  },
  {
    name: 'search_memories',
    description: 'Search memories by content',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to find in memory content',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_memory',
    description: 'Update an existing memory',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'The key of the memory to update',
        },
        content: {
          type: 'string',
          description: 'The new content',
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Optional updated tags',
        },
      },
      required: ['key', 'content'],
    },
  },
];

/**
 * Direct MCP Server implementation that handles JSON-RPC messages directly
 */
class DirectMcpServer {
  constructor() {
    this.config = DEFAULT_CONFIG;
    this.stdinReader = null;
    this.isStarted = false;
    this.isInitialized = false;
    this.keepAliveInterval = null;
    this.lastActivityTime = Date.now();
    this.clientDisconnectTimeout = null;
    this.reconnectGracePeriod = 10000; // 10 seconds grace period for reconnects
    
    // Load or create config
    const configPath = join(homedir(), '.myai-memory-sync', 'config.json');
    
    try {
      if (existsSync(configPath)) {
        const configData = readFileSync(configPath, 'utf-8');
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configData) };
      } else {
        // Create default config
        const configDir = dirname(configPath);
        if (!existsSync(configDir)) {
          mkdir(configDir, { recursive: true });
        }
        writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.error('Created sample config.json file');
      }
    } catch (err) {
      console.error(`Error loading config: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Ensure memory directory exists
    ensureMemoryDir();
    
    console.error(`Using email for Claude Web syncer: ${this.config.email || 'not configured'}`);
  }
  
  /**
   * Start the server
   */
  start() {
    if (this.isStarted) {
      console.error('Server already started');
      return;
    }
    
    console.error('Starting direct MCP server');
    
    // Create readline interface for stdin
    this.stdinReader = createInterface({
      input: process.stdin,
      terminal: false,
    });
    
    // Handle stdin messages
    this.stdinReader.on('line', (line) => {
      try {
        // Skip empty lines
        if (!line.trim()) {
          return;
        }
        
        // Update last activity time
        this.lastActivityTime = Date.now();
        
        // Parse JSON-RPC message
        const message = JSON.parse(line);
        
        // Handle message
        this.handleMessage(message);
      } catch (err) {
        console.error(`Error processing message: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
    
    // Handle stdin close
    process.stdin.on('end', () => {
      console.error('Stdin closed, shutting down');
      this.shutdown();
    });
    
    // Set up keep-alive interval
    this.keepAliveInterval = setInterval(() => {
      const inactivityTime = Date.now() - this.lastActivityTime;
      debug(`Keep-alive check. Inactivity time: ${inactivityTime}ms`);
      
      // If no activity for 30 seconds, send a keep-alive ping
      if (inactivityTime > 30000) {
        debug('Sending keep-alive ping');
        this.sendNotification('keepAlive', { timestamp: Date.now() });
      }
    }, 10000);
    
    // Handle process signals
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down');
      this.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down');
      this.shutdown();
      process.exit(0);
    });
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(`Uncaught exception: ${err.message}`);
      console.error(err.stack);
      // Continue running
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled promise rejection:', reason);
      // Continue running
    });
    
    this.isStarted = true;
  }
  
  /**
   * Shutdown the server
   */
  shutdown() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    
    if (this.clientDisconnectTimeout) {
      clearTimeout(this.clientDisconnectTimeout);
      this.clientDisconnectTimeout = null;
    }
    
    if (this.stdinReader) {
      this.stdinReader.close();
      this.stdinReader = null;
    }
    
    this.isStarted = false;
    this.isInitialized = false;
  }
  
  /**
   * Handle a JSON-RPC message
   * @param {Object} message - The JSON-RPC message
   */
  handleMessage(message) {
    // Validate JSON-RPC message
    if (typeof message !== 'object' || message === null) {
      console.error('Invalid message: not an object');
      return;
    }
    
    if (message.jsonrpc !== '2.0') {
      console.error('Invalid message: not JSON-RPC 2.0');
      return;
    }
    
    // Handle message based on method
    if (message.method === 'initialize') {
      this.handleInitialize(message);
    } else if (message.method === 'listTools') {
      this.handleListTools(message);
    } else if (message.method === 'callTool') {
      this.handleCallTool(message);
    } else {
      console.error(`Unknown method: ${message.method}`);
      this.sendError(message.id, -32601, 'Method not found');
    }
  }
  
  /**
   * Handle initialize request
   * @param {Object} message - The initialize request
   */
  handleInitialize(message) {
    debug('Handling initialize request');
    
    // Extract client info
    const clientInfo = message.params?.clientInfo || {};
    debug(`Client info: ${JSON.stringify(clientInfo)}`);
    
    // Send initialize response
    this.sendResult(message.id, {
      serverInfo: {
        name: 'myAImemory',
        version: '1.0.0',
      },
    });
    
    this.isInitialized = true;
    
    // If client is Claude Desktop, it will disconnect after initialize
    if (clientInfo.name === 'claude-ai') {
      debug('Claude Desktop detected, expecting disconnect after initialize');
      
      // Set a timeout to detect client disconnect
      this.clientDisconnectTimeout = setTimeout(() => {
        debug('Client disconnect timeout elapsed');
        this.clientDisconnectTimeout = null;
      }, this.reconnectGracePeriod);
    }
  }
  
  /**
   * Handle listTools request
   * @param {Object} message - The listTools request
   */
  handleListTools(message) {
    debug('Handling listTools request');
    
    // Send listTools response
    this.sendResult(message.id, {
      tools: TOOLS,
    });
  }
  
  /**
   * Handle callTool request
   * @param {Object} message - The callTool request
   */
  async handleCallTool(message) {
    const { name, parameters } = message.params || {};
    debug(`Handling callTool request for ${name}`);
    
    // Validate tool name
    const tool = TOOLS.find(t => t.name === name);
    if (!tool) {
      console.error(`Unknown tool: ${name}`);
      this.sendError(message.id, -32601, 'Tool not found');
      return;
    }
    
    try {
      // Call the appropriate tool handler
      let result;
      
      switch (name) {
        case 'store_memory':
          result = await this.handleStoreMemory(parameters);
          break;
        case 'get_memory':
          result = await this.handleGetMemory(parameters);
          break;
        case 'delete_memory':
          result = await this.handleDeleteMemory(parameters);
          break;
        case 'list_memories':
          result = await this.handleListMemories(parameters);
          break;
        case 'search_memories':
          result = await this.handleSearchMemories(parameters);
          break;
        case 'update_memory':
          result = await this.handleUpdateMemory(parameters);
          break;
        default:
          throw new Error(`Tool handler not implemented: ${name}`);
      }
      
      // Send tool result
      this.sendResult(message.id, result);
    } catch (err) {
      console.error(`Error calling tool ${name}: ${err.message}`);
      this.sendError(message.id, -32603, `Error calling tool: ${err.message}`);
    }
  }
  
  /**
   * Handle store_memory tool
   * @param {Object} parameters - The tool parameters
   */
  async handleStoreMemory(parameters) {
    const { key, content, tags = [] } = parameters;
    
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key parameter');
    }
    
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content parameter');
    }
    
    const memory = {
      key,
      content,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const memoryPath = join(MEMORY_DIR, `${key}.json`);
    
    try {
      await writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
      
      return {
        content: [{ 
          type: "text", 
          text: `Successfully stored memory with key: ${key}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error storing memory: ${error.message}`);
    }
  }
  
  /**
   * Handle get_memory tool
   * @param {Object} parameters - The tool parameters
   */
  async handleGetMemory(parameters) {
    const { key } = parameters;
    
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key parameter');
    }
    
    const memoryPath = join(MEMORY_DIR, `${key}.json`);
    
    try {
      if (!existsSync(memoryPath)) {
        return {
          content: [{ 
            type: "text", 
            text: `No memory found with key: ${key}` 
          }],
          isError: true
        };
      }
      
      const data = await readFile(memoryPath, 'utf-8');
      const memory = JSON.parse(data);
      
      return {
        content: [{ 
          type: "text", 
          text: memory.content
        }]
      };
    } catch (error) {
      throw new Error(`Error retrieving memory: ${error.message}`);
    }
  }
  
  /**
   * Handle delete_memory tool
   * @param {Object} parameters - The tool parameters
   */
  async handleDeleteMemory(parameters) {
    const { key } = parameters;
    
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key parameter');
    }
    
    const memoryPath = join(MEMORY_DIR, `${key}.json`);
    
    try {
      if (!existsSync(memoryPath)) {
        return {
          content: [{ 
            type: "text", 
            text: `No memory found with key: ${key}` 
          }],
          isError: true
        };
      }
      
      await unlink(memoryPath);
      
      return {
        content: [{ 
          type: "text", 
          text: `Successfully deleted memory with key: ${key}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error deleting memory: ${error.message}`);
    }
  }
  
  /**
   * Handle list_memories tool
   * @param {Object} parameters - The tool parameters
   */
  async handleListMemories(parameters) {
    const { tag } = parameters || {};
    
    try {
      const files = await readdir(MEMORY_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const memories = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const data = await readFile(join(MEMORY_DIR, file), 'utf-8');
            return JSON.parse(data);
          } catch (error) {
            console.error(`Error reading memory file ${file}: ${error.message}`);
            return null;
          }
        })
      );
      
      // Filter out null values and by tag if provided
      const filteredMemories = memories
        .filter(memory => memory !== null)
        .filter(memory => !tag || (memory.tags && memory.tags.includes(tag)));
      
      if (filteredMemories.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: tag ? `No memories found with tag: ${tag}` : "No memories found" 
          }]
        };
      }
      
      const memoryList = filteredMemories.map(memory => {
        return `- ${memory.key}${memory.tags.length > 0 ? ` (Tags: ${memory.tags.join(', ')})` : ''}`;
      }).join('\n');
      
      return {
        content: [{ 
          type: "text", 
          text: `Available memories:\n${memoryList}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error listing memories: ${error.message}`);
    }
  }
  
  /**
   * Handle search_memories tool
   * @param {Object} parameters - The tool parameters
   */
  async handleSearchMemories(parameters) {
    const { query } = parameters;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query parameter');
    }
    
    try {
      const files = await readdir(MEMORY_DIR);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const memories = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const data = await readFile(join(MEMORY_DIR, file), 'utf-8');
            return JSON.parse(data);
          } catch (error) {
            console.error(`Error reading memory file ${file}: ${error.message}`);
            return null;
          }
        })
      );
      
      // Filter out null values and search by content
      const searchTerm = query.toLowerCase();
      const matchedMemories = memories
        .filter(memory => memory !== null)
        .filter(memory => memory.content.toLowerCase().includes(searchTerm));
      
      if (matchedMemories.length === 0) {
        return {
          content: [{ 
            type: "text", 
            text: `No memories found matching query: ${query}` 
          }]
        };
      }
      
      const memoryList = matchedMemories.map(memory => {
        return `- ${memory.key}${memory.tags.length > 0 ? ` (Tags: ${memory.tags.join(', ')})` : ''}`;
      }).join('\n');
      
      return {
        content: [{ 
          type: "text", 
          text: `Memories matching "${query}":\n${memoryList}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error searching memories: ${error.message}`);
    }
  }
  
  /**
   * Handle update_memory tool
   * @param {Object} parameters - The tool parameters
   */
  async handleUpdateMemory(parameters) {
    const { key, content, tags } = parameters;
    
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key parameter');
    }
    
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid content parameter');
    }
    
    const memoryPath = join(MEMORY_DIR, `${key}.json`);
    
    try {
      if (!existsSync(memoryPath)) {
        return {
          content: [{ 
            type: "text", 
            text: `No memory found with key: ${key}` 
          }],
          isError: true
        };
      }
      
      const data = await readFile(memoryPath, 'utf-8');
      const memory = JSON.parse(data);
      
      memory.content = content;
      if (tags) {
        memory.tags = tags;
      }
      memory.updatedAt = new Date().toISOString();
      
      await writeFileSync(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
      
      return {
        content: [{ 
          type: "text", 
          text: `Successfully updated memory with key: ${key}` 
        }]
      };
    } catch (error) {
      throw new Error(`Error updating memory: ${error.message}`);
    }
  }
  
  /**
   * Send a JSON-RPC result
   * @param {string|number} id - The request ID
   * @param {Object} result - The result object
   */
  sendResult(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result,
    };
    
    this.sendMessage(response);
  }
  
  /**
   * Send a JSON-RPC error
   * @param {string|number} id - The request ID
   * @param {number} code - The error code
   * @param {string} message - The error message
   * @param {Object} data - Additional error data
   */
  sendError(id, code, message, data = undefined) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
    
    this.sendMessage(response);
  }
  
  /**
   * Send a JSON-RPC notification
   * @param {string} method - The notification method
   * @param {Object} params - The notification parameters
   */
  sendNotification(method, params) {
    const notification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    
    this.sendMessage(notification);
  }
  
  /**
   * Send a JSON-RPC message to stdout
   * @param {Object} message - The message to send
   */
  sendMessage(message) {
    try {
      const json = JSON.stringify(message);
      process.stdout.write(json + '\n');
      
      // Update last activity time
      this.lastActivityTime = Date.now();
    } catch (err) {
      console.error(`Error sending message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Create server
    const server = new DirectMcpServer();
    
    // Start server
    server.start();
  } catch (err) {
    console.error(`Error starting server: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// Start the server
main();
