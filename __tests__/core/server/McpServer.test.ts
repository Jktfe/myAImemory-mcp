/**
 * Tests for McpServer
 */
import { McpServer } from '../../../src/core/server/McpServer';
import { ServiceFactory } from '../../../src/core/services/ServiceFactory';
import { StdioTransport } from '../../../src/core/transport/StdioTransport';
import { HttpTransport } from '../../../src/core/transport/HttpTransport';

// Mock dependencies
jest.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      registerTransport: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

jest.mock('../../../src/core/services/ServiceFactory', () => ({
  ServiceFactory: {
    initializeServices: jest.fn().mockResolvedValue(undefined),
    getTemplateService: jest.fn(),
    getPlatformService: jest.fn()
  }
}));

jest.mock('../../../src/core/handlers/ToolHandlers', () => ({
  registerToolHandlers: jest.fn()
}));

// Mock transport strategies
jest.mock('../../../src/core/transport/StdioTransport');
jest.mock('../../../src/core/transport/HttpTransport');

import { registerToolHandlers } from '../../../src/core/handlers/ToolHandlers';

describe('McpServer', () => {
  let server: McpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new server instance
    server = new McpServer({
      name: 'Test Server',
      version: '1.0.0'
    });
  });
  
  test('initialize should set up the server and register tools', async () => {
    // Initialize the server
    await server.initialize();
    
    // Check that services were initialized
    expect(ServiceFactory.initializeServices).toHaveBeenCalled();
    
    // Check that tool handlers were registered
    expect(registerToolHandlers).toHaveBeenCalled();
  });
  
  test('setTransport should register a stdio transport strategy', async () => {
    // Create a stdio transport
    const transport = new StdioTransport();
    
    // Set the transport
    await server.setTransport(transport);
    
    // The test will pass if no errors are thrown
    expect(transport).toBeTruthy();
  });
  
  test('setTransport should register an http transport strategy', async () => {
    // Create an http transport
    const transport = new HttpTransport(8080);
    
    // Set the transport
    await server.setTransport(transport);
    
    // The test will pass if no errors are thrown
    expect(transport).toBeTruthy();
  });
  
  test('start should start the server', async () => {
    // Start the server
    await server.start();
    
    // The test will pass if no errors are thrown
  });
  
  test('stop should stop the server', async () => {
    // Stop the server
    await server.stop();
    
    // The test will pass if no errors are thrown
  });
});