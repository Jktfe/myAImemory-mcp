/**
 * Tests for ServerFactory
 */
import { ServerFactory } from '../../src/core/server/ServerFactory';
import { McpServer } from '../../src/core/server/McpServer';
import { DirectMcpServer } from '../../src/core/server/DirectMcpServer';
import { StdioTransport } from '../../src/core/transport/StdioTransport';
import { HttpTransport } from '../../src/core/transport/HttpTransport';

// Mock the server implementations
jest.mock('../../src/core/server/McpServer');
jest.mock('../../src/core/server/DirectMcpServer');
jest.mock('../../src/core/transport/StdioTransport');
jest.mock('../../src/core/transport/HttpTransport');

describe('ServerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createServer should create a McpServer with stdio transport by default', async () => {
    // Create a server without specifying transport type
    const server = await ServerFactory.createServer({
      name: 'Test Server',
      version: '1.0.0'
    });

    // Check that a McpServer was created
    expect(server).toBeInstanceOf(McpServer);
    
    // Check that it was initialized with a StdioTransport
    expect(StdioTransport).toHaveBeenCalledTimes(1);
    
    // Check that initialization was called
    expect(server.initialize).toHaveBeenCalledTimes(1);
    expect(server.setTransport).toHaveBeenCalledTimes(1);
  });

  test('createServer should create a McpServer with http transport when specified', async () => {
    // Create a server with http transport
    const server = await ServerFactory.createServer({
      name: 'Test Server',
      version: '1.0.0',
      port: 8080
    }, 'http');

    // Check that a McpServer was created
    expect(server).toBeInstanceOf(McpServer);
    
    // Check that it was initialized with an HttpTransport
    expect(HttpTransport).toHaveBeenCalledTimes(1);
    expect(HttpTransport).toHaveBeenCalledWith(8080);
    
    // Check that initialization was called
    expect(server.initialize).toHaveBeenCalledTimes(1);
    expect(server.setTransport).toHaveBeenCalledTimes(1);
  });

  test('createServer should create a DirectMcpServer when useDirectImplementation is true', async () => {
    // Create a direct server
    const server = await ServerFactory.createServer({
      name: 'Test Server',
      version: '1.0.0',
      useDirectImplementation: true
    });

    // Check that a DirectMcpServer was created
    expect(server).toBeInstanceOf(DirectMcpServer);
    
    // Check that it was initialized with a StdioTransport
    expect(StdioTransport).toHaveBeenCalledTimes(1);
    
    // Check that initialization was called
    expect(server.initialize).toHaveBeenCalledTimes(1);
    expect(server.setTransport).toHaveBeenCalledTimes(1);
  });

  test('createServer should use default port 3000 for http when not specified', async () => {
    // Create a server with http transport but no port
    await ServerFactory.createServer({
      name: 'Test Server',
      version: '1.0.0'
    }, 'http');

    // Check that HttpTransport was created with default port
    expect(HttpTransport).toHaveBeenCalledWith(3000);
  });
});