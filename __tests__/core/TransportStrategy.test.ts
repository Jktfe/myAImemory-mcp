/**
 * Tests for TransportStrategies
 */
import { StdioTransport } from '../../src/core/transport/StdioTransport';
import { HttpTransport } from '../../src/core/transport/HttpTransport';
import { jest } from '@jest/globals';

// Define mock types for TypeScript
type MockFn = jest.Mock<any, any>;
interface MockStdin {
  setEncoding: MockFn;
  on: MockFn;
  removeAllListeners: MockFn;
  fd: number;
  [key: string]: any;
}

interface MockStdout {
  write: MockFn;
  fd: number;
  [key: string]: any;
}

// Mock Express and HTTP server
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    listen: jest.fn().mockImplementation((port, callback) => {
      callback();
      return {
        on: jest.fn(),
        close: jest.fn().mockImplementation((callback) => callback())
      };
    })
  };
  
  return jest.fn().mockReturnValue(mockApp);
});

jest.mock('cors', () => {
  return jest.fn().mockReturnValue(jest.fn());
});

// Mock process stdin/stdout
const originalStdin = process.stdin;
const originalStdout = process.stdout;

const mockStdin: MockStdin = {
  fd: 0,
  setEncoding: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockStdout: MockStdout = {
  fd: 1,
  write: jest.fn()
};

describe('TransportStrategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock process stdin/stdout
    Object.defineProperty(process, 'stdin', {
      value: mockStdin,
      writable: true
    });
    
    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      writable: true
    });
    
    // Mock process event listeners
    process.on = jest.fn();
  });
  
  afterEach(() => {
    // Restore process stdin/stdout
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      writable: true
    });
    
    Object.defineProperty(process, 'stdout', {
      value: originalStdout,
      writable: true
    });
  });
  
  describe('StdioTransport', () => {
    it('should initialize and set up event handlers', async () => {
      const transport = new StdioTransport();
      await transport.initialize();
      
      expect(process.stdin.setEncoding).toHaveBeenCalledWith('utf-8');
      expect(process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
    });
    
    it('should start listening for input', async () => {
      const transport = new StdioTransport();
      await transport.initialize();
      await transport.start();
      
      expect(process.stdin.on).toHaveBeenCalledWith('data', expect.any(Function));
    });
    
    it('should send responses to stdout', async () => {
      const transport = new StdioTransport();
      await transport.initialize();
      
      const response = { result: 'test' };
      await transport.sendResponse(response);
      
      expect(process.stdout.write).toHaveBeenCalledWith(JSON.stringify(response) + '\n');
    });
    
    it('should register request handlers', async () => {
      const transport = new StdioTransport();
      const handler = jest.fn();
      
      transport.onRequest(handler);
      
      // Simulate input data
      const mockHandleInput = jest.fn();
      transport['handleInput'] = mockHandleInput;
      
      // Type assertion to access mock properties safely
      const mockOn = process.stdin.on as jest.Mock;
      const calls = mockOn.mock.calls;
      const dataHandlerCall = calls.find((call: any[]) => call[0] === 'data');
      
      // Get the data handler function (second argument of the 'on' call)
      if (dataHandlerCall && dataHandlerCall.length > 1) {
        const dataHandler = dataHandlerCall[1];
        dataHandler(Buffer.from('{"test":"data"}'));
        
        expect(mockHandleInput).toHaveBeenCalledWith(Buffer.from('{"test":"data"}'));
      } else {
        fail('No data handler was registered');
      }
    });
    
    it('should stop listening when stopped', async () => {
      const transport = new StdioTransport();
      await transport.initialize();
      await transport.start();
      await transport.stop();
      
      expect(process.stdin.removeAllListeners).toHaveBeenCalledWith('data');
    });
  });
  
  describe('HttpTransport', () => {
    it('should initialize and set up routes', async () => {
      const express = require('express');
      const mockApp = express();
      
      const transport = new HttpTransport(3000);
      await transport.initialize();
      
      expect(express).toHaveBeenCalled();
      expect(mockApp.use).toHaveBeenCalledTimes(2); // JSON middleware and CORS
      expect(mockApp.post).toHaveBeenCalledWith('/', expect.any(Function));
      expect(mockApp.get).toHaveBeenCalledWith('/health', expect.any(Function));
    });
    
    it('should start listening on specified port', async () => {
      const express = require('express');
      const mockApp = express();
      
      const transport = new HttpTransport(3000);
      await transport.initialize();
      await transport.start();
      
      expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
    });
    
    it('should register request handlers', async () => {
      const transport = new HttpTransport(3000);
      const handler = jest.fn();
      
      transport.onRequest(handler);
      
      expect(transport['requestHandler']).toBe(handler);
    });
    
    it('should stop the server when stopped', async () => {
      const transport = new HttpTransport(3000);
      await transport.initialize();
      await transport.start();
      
      // Get the server property safely
      const server = transport['server'];
      
      // Make sure server exists before testing
      expect(server).not.toBeNull();
      
      // Spy on close method if it exists
      if (server) {
        const closeSpy = jest.spyOn(server, 'close');
        await transport.stop();
        expect(closeSpy).toHaveBeenCalled();
      }
    });
  });
});