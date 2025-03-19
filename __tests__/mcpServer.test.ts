import { createMcpServer, mockServer } from './mcpServer.mock.js';

// We're using our own mocks, so no need to mock individual modules

describe('MCP Server', () => {
  let server: any;
  
  beforeEach(async () => {
    server = await createMcpServer();
  });
  
  describe('initialization', () => {
    it('should initialize MCP server', () => {
      expect(server).toBeDefined();
    });
  });
  
  describe('request handlers', () => {
    describe('get_template', () => {
      it('should return the template as markdown', async () => {
        const result = await server.handleRequest({
          method: 'get_template',
          params: {}
        });
        
        expect(result.content).toBeDefined();
        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('# myAI Memory');
      });
    });
    
    describe('get_section', () => {
      it('should return the requested section', async () => {
        const result = await server.handleRequest({
          method: 'get_section',
          params: { sectionName: 'Test Section' }
        });
        
        expect(result.content).toBeDefined();
        expect(result.isError).toBeFalsy();
        expect(result.content[0].type).toBe('text');
      });
      
      it('should return error for non-existent section', async () => {
        const result = await server.handleRequest({
          method: 'get_section',
          params: { sectionName: 'Non-existent Section' }
        });
        
        expect(result.isError).toBeTruthy();
        expect(result.content[0].text).toContain('not found');
      });
    });
    
    describe('update_section', () => {
      it('should update the section and return success', async () => {
        const result = await server.handleRequest({
          method: 'update_section',
          params: { 
            sectionName: 'Test Section', 
            content: '## New Description\n-~- Key: Value'
          }
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('updated successfully');
      });
    });
    
    describe('update_template', () => {
      it('should update the entire template', async () => {
        const result = await server.handleRequest({
          method: 'update_template',
          params: { template: '# myAI Memory\n\n# New Section\n## Description\n-~- Key: Value' }
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('updated successfully');
      });
    });
    
    describe('sync_all', () => {
      it('should sync template to all platforms', async () => {
        const result = await server.handleRequest({
          method: 'sync_all',
          params: {}
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('claude-web');
        expect(result.content[0].text).toContain('claude-code');
      });
    });
    
    describe('sync_platform', () => {
      it('should sync template to specified platform', async () => {
        const result = await server.handleRequest({
          method: 'sync_platform',
          params: { platform: 'claude-web' }
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('claude-web');
      });
      
      it('should sync template to all platforms when "all" is specified', async () => {
        const result = await server.handleRequest({
          method: 'sync_platform',
          params: { platform: 'all' }
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('claude-web');
        expect(result.content[0].text).toContain('claude-code');
      });
    });
    
    describe('load_preset', () => {
      it('should load the specified preset', async () => {
        const result = await server.handleRequest({
          method: 'load_preset',
          params: { presetName: 'preset1' }
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('loaded successfully');
      });
    });
    
    describe('list_presets', () => {
      it('should return list of available presets', async () => {
        const result = await server.handleRequest({
          method: 'list_presets',
          params: {}
        });
        
        expect(result.isError).toBeFalsy();
        expect(result.content[0].text).toContain('preset1');
        expect(result.content[0].text).toContain('preset2');
      });
    });
  });
});