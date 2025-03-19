// Mock implementation for MCPServer and dependencies
export const mockServer = {
  setRequestHandler: () => {},
  handleRequest: (request: any) => {
    if (request.method === 'get_template') {
      return {
        content: [{ type: 'text', text: '# myAI Memory\n\n# Test Section' }]
      };
    } else if (request.method === 'get_section') {
      if (request.params.sectionName === 'Test Section') {
        return {
          content: [{ type: 'text', text: 'Test Section Content' }]
        };
      } else {
        return {
          isError: true,
          content: [{ type: 'text', text: `Section "${request.params.sectionName}" not found` }]
        };
      }
    } else if (request.method === 'update_section') {
      return {
        content: [{ type: 'text', text: `Section "${request.params.sectionName}" updated successfully` }]
      };
    } else if (request.method === 'update_template') {
      return {
        content: [{ type: 'text', text: 'Template updated successfully with 1 sections' }]
      };
    } else if (request.method === 'sync_all') {
      return {
        content: [{ type: 'text', text: JSON.stringify([
          { platform: 'claude-web', success: true, message: 'Success' },
          { platform: 'claude-code', success: true, message: 'Success' }
        ], null, 2) }]
      };
    } else if (request.method === 'sync_platform') {
      if (request.params.platform === 'all') {
        return {
          content: [{ type: 'text', text: JSON.stringify([
            { platform: 'claude-web', success: true, message: 'Success' },
            { platform: 'claude-code', success: true, message: 'Success' }
          ], null, 2) }]
        };
      } else {
        return {
          content: [{ type: 'text', text: JSON.stringify(
            { platform: request.params.platform, success: true, message: 'Success' }
          ) }]
        };
      }
    } else if (request.method === 'load_preset') {
      return {
        content: [{ type: 'text', text: `Preset "${request.params.presetName}" loaded successfully` }]
      };
    } else if (request.method === 'list_presets') {
      return {
        content: [{ type: 'text', text: JSON.stringify(['preset1', 'preset2'], null, 2) }]
      };
    }
    
    return { isError: true, content: [{ type: 'text', text: 'Unknown method' }] };
  }
};

// Mock for createMcpServer
export async function createMcpServer() {
  return mockServer;
}