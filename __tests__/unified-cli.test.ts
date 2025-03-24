/**
 * Tests for unified-cli
 */
import { program } from 'commander';
import { startServer } from '../src/core/index';
import { ServiceFactory } from '../src/core/services/ServiceFactory';
import { processMemoryCommand } from '../src/core/utils/MemoryCommandProcessor';
import { emergencySync } from '../src/utils/emergency-sync';

// Mock the imports
jest.mock('commander', () => {
  const mockProgram = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    argument: jest.fn().mockReturnThis(),
    parse: jest.fn(),
    help: jest.fn()
  };
  return { program: mockProgram };
});

jest.mock('../src/core/index', () => ({
  startServer: jest.fn().mockResolvedValue({})
}));

jest.mock('../src/core/services/ServiceFactory', () => ({
  ServiceFactory: {
    initializeServices: jest.fn().mockResolvedValue(undefined),
    getTemplateService: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      loadPreset: jest.fn().mockResolvedValue(true),
      createPreset: jest.fn().mockResolvedValue(true),
      listPresets: jest.fn().mockResolvedValue(['preset1', 'preset2'])
    }),
    getPlatformService: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      syncAll: jest.fn().mockResolvedValue([
        { platform: 'platform1', success: true, message: 'Synced' }
      ]),
      syncPlatform: jest.fn().mockResolvedValue(
        { platform: 'platform1', success: true, message: 'Synced' }
      )
    })
  }
}));

jest.mock('../src/core/utils/MemoryCommandProcessor', () => ({
  processMemoryCommand: jest.fn().mockResolvedValue({
    success: true,
    message: 'Command processed successfully'
  })
}));

jest.mock('../src/utils/emergency-sync', () => ({
  emergencySync: jest.fn().mockResolvedValue(undefined)
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

// Mock process.exit
const originalProcessExit = process.exit;
const mockProcessExit = jest.fn();

describe('unified-cli', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    
    // Mock process.exit
    process.exit = mockProcessExit as any;
  });
  
  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    
    // Restore process.exit
    process.exit = originalProcessExit;
  });
  
  test('server command should call startServer with the right options', async () => {
    // We need to explicitly import the file to trigger the code execution
    // The CLI file immediately calls the main function when imported
    const { program } = require('commander');
    
    // Get the server command action handler
    const serverActionHandler = program.action.mock.calls[0][0];
    
    // Call the handler with mock options
    await serverActionHandler({
      transport: 'http',
      port: '8080',
      direct: true,
      debug: true
    });
    
    // Check that startServer was called with the right options
    expect(startServer).toHaveBeenCalledWith({
      useDirectImplementation: true,
      transport: 'http',
      port: 8080,
      debug: true
    });
  });
  
  test('memory command should process natural language commands', async () => {
    // We need to explicitly import the file to trigger the code execution
    await import('../src/unified-cli');
    
    // Get the remember command action handler (second command, first action)
    const rememberActionHandler = program.action.mock.calls[1][0];
    
    // Call the handler with a mock command
    await rememberActionHandler('remember my favorite color is blue');
    
    // Check that the command was processed
    expect(ServiceFactory.initializeServices).toHaveBeenCalled();
    expect(processMemoryCommand).toHaveBeenCalledWith('remember my favorite color is blue');
    
    // Check the output
    expect(mockConsoleLog).toHaveBeenCalledWith('Processing memory command:', 'remember my favorite color is blue');
    expect(mockConsoleLog).toHaveBeenCalledWith('✅', 'Command processed successfully');
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });
  
  test('sync command should synchronize templates across platforms', async () => {
    // We need to explicitly import the file to trigger the code execution
    await import('../src/unified-cli');
    
    // Get the sync command action handler
    const syncActionHandler = program.action.mock.calls[2][0];
    
    // Call the handler without options (sync all platforms)
    await syncActionHandler({});
    
    // Check that the sync was performed
    expect(ServiceFactory.initializeServices).toHaveBeenCalled();
    expect(ServiceFactory.getPlatformService().syncAll).toHaveBeenCalled();
    
    // Check the output
    expect(mockConsoleLog).toHaveBeenCalledWith('Syncing memory across platforms...');
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });
  
  test('sync command with emergency option should call emergencySync', async () => {
    // We need to explicitly import the file to trigger the code execution
    await import('../src/unified-cli');
    
    // Get the sync command action handler
    const syncActionHandler = program.action.mock.calls[2][0];
    
    // Call the handler with emergency option
    await syncActionHandler({ emergency: true });
    
    // Check that emergencySync was called
    expect(emergencySync).toHaveBeenCalled();
    
    // Check the output
    expect(mockConsoleLog).toHaveBeenCalledWith('Performing emergency sync...');
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });
  
  // Additional tests for presets commands could be added here
});