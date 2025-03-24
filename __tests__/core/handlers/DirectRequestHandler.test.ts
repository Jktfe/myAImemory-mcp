/**
 * Tests for DirectRequestHandler
 */
import { DirectRequestHandler } from '../../../src/core/handlers/DirectRequestHandler';
import { ServiceFactory } from '../../../src/core/services/ServiceFactory';
import { generateTemplate } from '../../../src/templateParser';
import { processMemoryCommand } from '../../../src/core/utils/MemoryCommandProcessor';

// Mock dependencies
jest.mock('../../../src/core/services/ServiceFactory', () => ({
  ServiceFactory: {
    getTemplateService: jest.fn().mockReturnValue({
      getTemplate: jest.fn().mockReturnValue({
        sections: []
      }),
      getSection: jest.fn().mockReturnValue({
        title: 'Test Section',
        description: 'Test Description',
        items: [
          { key: 'test', value: 'value' }
        ]
      }),
      updateSection: jest.fn().mockResolvedValue(undefined),
      updateTemplate: jest.fn().mockResolvedValue(true),
      listPresets: jest.fn().mockResolvedValue(['preset1', 'preset2']),
      loadPreset: jest.fn().mockResolvedValue(true),
      createPreset: jest.fn().mockResolvedValue(true)
    }),
    getPlatformService: jest.fn().mockReturnValue({
      syncAll: jest.fn().mockResolvedValue([
        { platform: 'platform1', success: true, message: 'Synced' }
      ]),
      syncPlatform: jest.fn().mockResolvedValue(
        { platform: 'platform1', success: true, message: 'Synced' }
      ),
      getPlatforms: jest.fn().mockReturnValue(['platform1', 'platform2'])
    })
  }
}));

jest.mock('../../../src/templateParser', () => ({
  generateTemplate: jest.fn().mockReturnValue('# Test Template')
}));

jest.mock('../../../src/core/utils/MemoryCommandProcessor', () => ({
  processMemoryCommand: jest.fn().mockResolvedValue({
    success: true,
    message: 'Command processed successfully'
  })
}));

describe('DirectRequestHandler', () => {
  let handler: DirectRequestHandler;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a new handler instance
    handler = new DirectRequestHandler({
      name: 'Test Server',
      version: '1.0.0'
    });
  });
  
  test('handleRequest should process JSON-RPC requests', async () => {
    // Process an initialization request
    const initRequest = {
      jsonrpc: '2.0',
      method: 'initialize',
      id: 1
    };
    
    const initResponse = await handler.handleRequest(initRequest);
    
    // Check that the response matches expected format
    expect(initResponse).toEqual({
      jsonrpc: '2.0',
      result: {
        serverInfo: {
          name: 'Test Server',
          version: '1.0.0'
        },
        capabilities: {
          tools: {}
        },
        protocolVersion: '2024-11-05'
      },
      id: 1
    });
  });
  
  test('handleRequest should reject invalid JSON-RPC requests', async () => {
    // Process an invalid request (missing jsonrpc version)
    const invalidRequest = {
      method: 'test',
      id: 1
    };
    
    const errorResponse = await handler.handleRequest(invalidRequest);
    
    // Check that an error response was returned
    expect(errorResponse).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'Invalid request'
      },
      id: 1
    });
  });
  
  test('handleRequest should reject unknown methods', async () => {
    // Process a request with an unknown method
    const unknownMethodRequest = {
      jsonrpc: '2.0',
      method: 'unknown',
      id: 1
    };
    
    const errorResponse = await handler.handleRequest(unknownMethodRequest);
    
    // Check that a method not found error was returned
    expect(errorResponse).toEqual({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: 'Method not found: unknown'
      },
      id: 1
    });
  });
  
  test('handleRequest should process tools/call request for get_template', async () => {
    // Process a get_template tool call
    const getTemplateRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_template',
        arguments: {}
      },
      id: 1
    };
    
    const response = await handler.handleRequest(getTemplateRequest);
    
    // Check the response
    expect(response).toEqual({
      jsonrpc: '2.0',
      result: {
        content: [{ 
          type: 'text', 
          text: '# Test Template' 
        }]
      },
      id: 1
    });
    
    // Check that the necessary service methods were called
    expect(ServiceFactory.getTemplateService().getTemplate).toHaveBeenCalled();
    expect(generateTemplate).toHaveBeenCalled();
  });
  
  test('handleRequest should process tools/call request for get_section', async () => {
    // Process a get_section tool call
    const getSectionRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_section',
        arguments: {
          sectionName: 'test'
        }
      },
      id: 1
    };
    
    const response = await handler.handleRequest(getSectionRequest);
    
    // Check the response format
    expect(response).toEqual({
      jsonrpc: '2.0',
      result: {
        content: [{ 
          type: 'text', 
          text: expect.stringContaining('# Test Section') 
        }]
      },
      id: 1
    });
    
    // Check that the necessary service methods were called
    expect(ServiceFactory.getTemplateService().getSection).toHaveBeenCalledWith('test');
  });
  
  // Additional tests for each handler method could be added here
});