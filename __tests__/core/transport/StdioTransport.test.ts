/**
 * Tests for StdioTransport
 */
import { StdioTransport } from '../../../src/core/transport/StdioTransport.js';
import { jest } from '@jest/globals';

// Mock stdin and stdout
const mockStdin = {
  on: jest.fn(),
  setEncoding: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn()
};

const mockStdout = {
  write: jest.fn()
};

// Store original stdin/stdout
const originalStdin = process.stdin;
const originalStdout = process.stdout;

describe('StdioTransport', () => {
  let transport: StdioTransport;
  let messageHandler: (message: any) => void;
  
  beforeEach(() => {
    // Replace process.stdin and process.stdout with mocks
    Object.defineProperty(process, 'stdin', { value: mockStdin });
    Object.defineProperty(process, 'stdout', { value: mockStdout });
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a new transport instance
    transport = new StdioTransport();
  });
  
  afterEach(() => {
    // Restore original stdin/stdout
    Object.defineProperty(process, 'stdin', { value: originalStdin });
    Object.defineProperty(process, 'stdout', { value: originalStdout });
  });
  
  test('initialize should set up stdin event listeners', async () => {
    // Set up a message handler
    messageHandler = jest.fn();
    await transport.initialize();
    
    // Use our test method helper to add the method
    const testTransport = declareHttpTransportTestMethods(transport);
    testTransport.onMessage(messageHandler);
    
    // Check that stdin was configured correctly
    expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
    expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    
    // Simulate receiving a message on stdin
    const onDataHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')[1];
    const testMessage = JSON.stringify({ jsonrpc: '2.0', method: 'test', id: 1 });
    onDataHandler(testMessage);
    
    // Check that the message handler was called with the parsed message
    expect(messageHandler).toHaveBeenCalledWith({ jsonrpc: '2.0', method: 'test', id: 1 });
  });
  
  test('sendMessage should write JSON to stdout', async () => {
    // Initialize the transport
    await transport.initialize();
    
    // Send a message
    const message = { jsonrpc: '2.0', result: 'success', id: 1 };
    
    // Use our test method helper to add the method
    const testTransport = declareHttpTransportTestMethods(transport);
    testTransport.sendMessage(message);
    
    // Check that the message was written to stdout as JSON with a new line
    expect(mockStdout.write).toHaveBeenCalledWith(JSON.stringify(message) + '\n');
  });
  
  test('handle corrupted JSON gracefully', async () => {
    // Set up a message handler
    messageHandler = jest.fn();
    await transport.initialize();
    
    // Use our test method helper to add the method
    const testTransport = declareHttpTransportTestMethods(transport);
    testTransport.onMessage(messageHandler);
    
    // Get the data handler
    const onDataHandler = mockStdin.on.mock.calls.find(call => call[0] === 'data')[1];
    
    // Send corrupted JSON
    onDataHandler('{invalid json}');
    
    // The message handler should not be called with invalid JSON
    expect(messageHandler).not.toHaveBeenCalled();
  });
});