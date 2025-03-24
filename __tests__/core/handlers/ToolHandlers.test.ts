/**
 * Tests for ToolHandlers
 */
import { registerToolHandlers } from '../../../src/core/handlers/ToolHandlers';
import { ServiceFactory } from '../../../src/core/services/ServiceFactory';
import { generateTemplate } from '../../../src/templateParser';
import { processMemoryCommand, isMemoryQuery } from '../../../src/core/utils/MemoryCommandProcessor';

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
  }),
  isMemoryQuery: jest.fn().mockReturnValue(false)
}));

describe('ToolHandlers', () => {
  // Mock SDK server
  const mockServer = {
    tool: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('registerToolHandlers should register all tool handlers', () => {
    // Register the handlers
    registerToolHandlers(mockServer as any);
    
    // Check that the expected number of tools were registered
    // We have 9 tools: get_template, get_section, update_section, update_template, 
    // sync_platforms, list_platforms, list_presets, load_preset, create_preset, remember
    expect(mockServer.tool).toHaveBeenCalledTimes(10);
    
    // Check that each tool was registered with the correct name
    const toolNames = mockServer.tool.mock.calls.map(call => call[0]);
    expect(toolNames).toContain('get_template');
    expect(toolNames).toContain('get_section');
    expect(toolNames).toContain('update_section');
    expect(toolNames).toContain('update_template');
    expect(toolNames).toContain('sync_platforms');
    expect(toolNames).toContain('list_platforms');
    expect(toolNames).toContain('list_presets');
    expect(toolNames).toContain('load_preset');
    expect(toolNames).toContain('create_preset');
    expect(toolNames).toContain('remember');
  });
  
  test('get_template handler should call the template service', async () => {
    // Register the handlers
    registerToolHandlers(mockServer as any);
    
    // Get the get_template handler
    const getTemplateHandler = mockServer.tool.mock.calls.find(
      call => call[0] === 'get_template'
    )[2];
    
    // Call the handler
    const result = await getTemplateHandler({});
    
    // Check the result
    expect(result).toEqual({
      content: [{ type: 'text', text: '# Test Template' }]
    });
    
    // Check that the template service was called
    expect(ServiceFactory.getTemplateService().getTemplate).toHaveBeenCalled();
    expect(generateTemplate).toHaveBeenCalled();
  });
  
  test('get_section handler should call the template service', async () => {
    // Register the handlers
    registerToolHandlers(mockServer as any);
    
    // Get the get_section handler
    const getSectionHandler = mockServer.tool.mock.calls.find(
      call => call[0] === 'get_section'
    )[2];
    
    // Call the handler
    const result = await getSectionHandler({ sectionName: 'test' });
    
    // Check that the result contains the section content
    expect(result.content[0].text).toContain('# Test Section');
    expect(result.content[0].text).toContain('## Test Description');
    expect(result.content[0].text).toContain('-~- test: value');
    
    // Check that the template service was called
    expect(ServiceFactory.getTemplateService().getSection).toHaveBeenCalledWith('test');
  });
  
  // Additional tests for each handler could be added here
});