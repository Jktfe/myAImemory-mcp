/**
 * Tests for MemoryCommandProcessor
 */
import { processMemoryCommand, isMemoryQuery } from '../../../src/core/utils/MemoryCommandProcessor';
import { ServiceFactory } from '../../../src/core/services/ServiceFactory';

// Mock dependencies
jest.mock('../../../src/naturalLanguageParser', () => ({
  processMemoryCommand: jest.fn().mockResolvedValue({
    success: true,
    message: 'Command processed successfully'
  })
}));

jest.mock('../../../src/core/services/ServiceFactory', () => ({
  ServiceFactory: {
    getTemplateService: jest.fn(),
    getPlatformService: jest.fn()
  }
}));

describe('MemoryCommandProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('processMemoryCommand should initialize services and use legacy implementation', async () => {
    // Import the mocked legacy implementation
    const { processMemoryCommand: legacyProcessMemoryCommand } = require('../../../src/naturalLanguageParser');
    
    // Call the memory command processor
    const result = await processMemoryCommand('remember my favorite color is blue');
    
    // Check that services were accessed
    expect(ServiceFactory.getTemplateService).toHaveBeenCalled();
    expect(ServiceFactory.getPlatformService).toHaveBeenCalled();
    
    // Check that the legacy implementation was called
    expect(legacyProcessMemoryCommand).toHaveBeenCalledWith('remember my favorite color is blue');
    
    // Check that the result matches the expected format
    expect(result).toEqual({
      success: true,
      message: 'Command processed successfully'
    });
  });
  
  test('processMemoryCommand should handle errors gracefully', async () => {
    // Import the mocked legacy implementation and make it throw an error
    const { processMemoryCommand: legacyProcessMemoryCommand } = require('../../../src/naturalLanguageParser');
    legacyProcessMemoryCommand.mockRejectedValueOnce(new Error('Test error'));
    
    // Call the memory command processor
    const result = await processMemoryCommand('remember my favorite color is blue');
    
    // Check that the error was handled
    expect(result).toEqual({
      success: false,
      message: 'Error processing memory command: Test error'
    });
  });
  
  test('isMemoryQuery should identify memory queries correctly', () => {
    // Test positive cases
    expect(isMemoryQuery('use myai memory')).toBe(true);
    expect(isMemoryQuery('Use MyAI Memory to tell me my preferences')).toBe(true);
    expect(isMemoryQuery('tell me about my favorite color')).toBe(true);
    expect(isMemoryQuery('Tell Me About My preferences')).toBe(true);
    
    // Test negative cases
    expect(isMemoryQuery('what is the weather today')).toBe(false);
    expect(isMemoryQuery('remember my favorite color is blue')).toBe(false);
    expect(isMemoryQuery('')).toBe(false);
  });
});