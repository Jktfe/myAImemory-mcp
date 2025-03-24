/**
 * Tests for DirectMcpServer
 */
import { DirectMcpServer } from '../../../src/core/server/DirectMcpServer';
import { ServiceFactory } from '../../../src/core/services/ServiceFactory';
import { StdioTransport } from '../../../src/core/transport/StdioTransport';
import { HttpTransport } from '../../../src/core/transport/HttpTransport';

// Mock dependencies
jest.mock('../../../src/core/services/ServiceFactory', () => ({
  ServiceFactory: {
    initializeServices: jest.fn().mockResolvedValue(undefined),
    getTemplateService: jest.fn(),
    getPlatformService: jest.fn()
  }
}));

jest.mock('../../../src/core/handlers/DirectRequestHandler', () => {
  return {
    DirectRequestHandler: jest.fn().mockImplementation(() => ({
      handleRequest: jest.fn().mockImplementation(request => ({
        jsonrpc: '2.0',
        result: 'success',
        id: request.id
      }))
    }))
  };
});

// Mock transport strategies
const mockTransport = {
  initialize: jest.fn().mockResolvedValue(undefined),
  sendMessage: jest.fn(),
  onMessage: jest.fn()
};

describe('DirectMcpServer', () => {
  let server: DirectMcpServer;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new server instance
    server = new DirectMcpServer({
      name: 'Test Server',
      version: '1.0.0'
    });
  });
  
  test('initialize should set up the server', async () => {
    // Initialize the server
    await server.initialize();
    
    // Check that services were initialized
    expect(ServiceFactory.initializeServices).toHaveBeenCalled();
  });
  
  test('setTransport should register a transport strategy', async () => {
    // Set the transport
    await server.setTransport(mockTransport as any);
    
    // Check that the transport was initialized
    expect(mockTransport.initialize).toHaveBeenCalled();
    
    // Check that onMessage was set
    expect(mockTransport.onMessage).toHaveBeenCalledWith(expect.any(Function));
  });
  
  test('start and stop should function as expected', async () => {
    // These are no-op operations in DirectMcpServer
    await server.start();
    await server.stop();
    
    // The test passes if no errors are thrown
  });
  
  test('the server should handle messages correctly', async () => {
    // Set up the transport
    await server.setTransport(mockTransport as any);
    
    // Get the message handler
    const messageHandler = mockTransport.onMessage.mock.calls[0][0];
    
    // Create a test message
    const testMessage = {
      jsonrpc: '2.0',
      method: 'test',
      id: 1
    };
    
    // Process the message
    await messageHandler(testMessage);
    
    // Check that a response was sent
    expect(mockTransport.sendMessage).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      result: 'success',
      id: 1
    });
  });
  
  test('the server should handle notifications correctly', async () => {
    // Set up the transport
    await server.setTransport(mockTransport as any);
    
    // Get the message handler
    const messageHandler = mockTransport.onMessage.mock.calls[0][0];
    
    // Create a test notification (no id)
    const testNotification = {
      jsonrpc: '2.0',
      method: 'test'
    };
    
    // Process the notification
    await messageHandler(testNotification);
    
    // Check that no response was sent for a notification
    expect(mockTransport.sendMessage).not.toHaveBeenCalled();
  });
});