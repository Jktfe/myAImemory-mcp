// This file sets up the Jest environment for all tests
import { jest } from '@jest/globals';

// Create proper type definitions for test mocks
declare global {
  namespace NodeJS {
    interface Process {
      on(event: string, listener: Function): Process;
    }
  }
  
  // Add cors mock type
  interface Cors {
    (): (req: any, res: any, next: Function) => void;
  }
  
  var cors: Cors;
}

// Mock all required modules
jest.mock('fs/promises');
jest.mock('cors', () => jest.fn().mockReturnValue(jest.fn()));

// Mock core services
jest.mock('../../src/core/services/CustomTemplateService.js', () => ({
  CustomTemplateService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getTemplate: jest.fn().mockReturnValue({ sections: [] }),
    getSection: jest.fn().mockReturnValue(null),
    updateSection: jest.fn().mockResolvedValue(true),
    updateTemplate: jest.fn().mockResolvedValue(true),
    listPresets: jest.fn().mockResolvedValue([]),
    loadPreset: jest.fn().mockResolvedValue(true),
    createPreset: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('../../src/core/services/CustomPlatformService.js', () => ({
  CustomPlatformService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    syncAll: jest.fn().mockResolvedValue([{ platform: 'test', success: true, message: 'Success' }]),
    syncPlatform: jest.fn().mockResolvedValue({ platform: 'test', success: true, message: 'Success' }),
    getPlatforms: jest.fn().mockReturnValue(['test'])
  }))
}));

jest.mock('../../src/core/services/LegacyServiceAdapters.js', () => ({
  LegacyTemplateServiceAdapter: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    getTemplate: jest.fn().mockReturnValue({ sections: [] }),
    getSection: jest.fn().mockReturnValue(null),
    updateSection: jest.fn().mockResolvedValue(true),
    updateTemplate: jest.fn().mockResolvedValue(true),
    listPresets: jest.fn().mockResolvedValue([]),
    loadPreset: jest.fn().mockResolvedValue(true),
    createPreset: jest.fn().mockResolvedValue(true)
  })),
  LegacyPlatformServiceAdapter: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    syncAll: jest.fn().mockResolvedValue([{ platform: 'test', success: true, message: 'Success' }]),
    syncPlatform: jest.fn().mockResolvedValue({ platform: 'test', success: true, message: 'Success' }),
    getPlatforms: jest.fn().mockReturnValue(['test'])
  }))
}));

// Create a declaration to tell TypeScript about HttpTransport test methods
global.declareHttpTransportTestMethods = (transport: any) => {
  transport.onMessage = jest.fn();
  transport.sendMessage = jest.fn();
  return transport;
};

// Define helper for creating typed mocks
global.createTypedMock = jest.fn;

// Define helper for mocking modules with correct types
global.defineMock = (modulePath, factory) => {
  jest.mock(modulePath, factory);
};

// This helps silence TypeScript errors in mock implementations
const originalOn = process.on;
process.on = originalOn || jest.fn() as any;