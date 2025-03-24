// This file sets up the Jest environment for all tests

// Set up global types for TypeScript
global.MockFn = jest.fn;

// This will help with typing jest.mock calls
global.defineMock = (modulePath, factory) => {
  jest.mock(modulePath, factory);
};

// Create a helper to create properly typed mocks
global.createTypedMock = (implementation) => {
  return jest.fn(implementation);
};

// Mock fs/promises for all tests
jest.mock('fs/promises');

// Tell TypeScript that cors is any type to prevent errors
jest.mock('cors', () => {
  return jest.fn().mockReturnValue(jest.fn());
});

// Mock HTTP module with properly typed mocks 
jest.mock('http', () => {
  const mockServer = {
    listen: jest.fn((port, cb) => {
      if (typeof cb === 'function') cb();
      return mockServer;
    }),
    on: jest.fn(),
    close: jest.fn((cb) => {
      if (typeof cb === 'function') cb();
    })
  };
  
  return {
    createServer: jest.fn(() => mockServer),
    Server: jest.fn(),
    mockServer
  };
});

// Mock express with properly typed mocks
jest.mock('express', () => {
  const mockApp = {
    use: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    listen: jest.fn().mockImplementation((port, callback) => {
      if (typeof callback === 'function') callback();
      return {
        on: jest.fn(),
        close: jest.fn().mockImplementation((callback) => {
          if (typeof callback === 'function') callback();
        })
      };
    })
  };
  
  return jest.fn().mockReturnValue(mockApp);
});

// Create a declaration to tell TypeScript about HttpTransport test methods
global.declareHttpTransportTestMethods = (transport) => {
  transport.onMessage = jest.fn();
  transport.sendMessage = jest.fn();
  return transport;
};

// This helps silence TypeScript errors in mock implementations
process.on = process.on || jest.fn();
