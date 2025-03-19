import { PlatformSyncManager, ClaudeCodeSyncer, WindsurfSyncer } from '../src/platformSync.js';
import fs from 'fs/promises';
import path from 'path';

// Mock fs/promises module
const mockFs = {
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn()
};

// Override the fs/promises module
jest.mock('fs/promises', () => mockFs, { virtual: true });

// Mock puppeteer (we won't test ClaudeWebSyncer in this test suite due to browser complexity)
const mockPuppeteer = {
  launch: jest.fn()
};
jest.mock('puppeteer', () => mockPuppeteer, { virtual: true });

// Mock config
const mockConfig = {
  config: {
    claudeWeb: {
      email: 'test@example.com'
    },
    puppeteer: {
      headless: true,
      slowMo: 50,
      defaultTimeout: 30000
    }
  }
};
jest.mock('../src/config.js', () => mockConfig, { virtual: true });

describe('Platform Syncers', () => {
  const templateContent = '# myAI Memory\n\n# Test Section\n## Test Description\n-~- TestKey: TestValue';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('ClaudeCodeSyncer', () => {
    it('should write template to CLAUDE.md file', async () => {
      // Simulate file exists
      mockFs.access.mockResolvedValue(undefined);
      // Ensure writeFile succeeds
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const syncer = new ClaudeCodeSyncer('/test/path/CLAUDE.md');
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(true);
      expect(result.platform).toBe('claude-code');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/CLAUDE.md',
        templateContent,
        'utf-8'
      );
    });
    
    it('should auto-detect CLAUDE.md file if path not provided', async () => {
      // Set environment variables for testing
      const originalHome = process.env.HOME;
      process.env.HOME = '/test/home';
      
      // Mock fs.access to make it find a file at the second location
      mockFs.access.mockImplementation((filePath) => {
        if (filePath === path.join('/test/home', 'Documents', 'CLAUDE.md')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      // Ensure writeFile succeeds
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const syncer = new ClaudeCodeSyncer();
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/test/home', 'Documents', 'CLAUDE.md'),
        templateContent,
        'utf-8'
      );
      
      // Restore environment
      process.env.HOME = originalHome;
    });
    
    it('should handle errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));
      
      const syncer = new ClaudeCodeSyncer('/test/path/CLAUDE.md');
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to sync');
    });
  });
  
  describe('WindsurfSyncer', () => {
    it('should write template to global_rules.md file', async () => {
      // Simulate file exists
      mockFs.access.mockResolvedValue(undefined);
      // Ensure writeFile succeeds
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const syncer = new WindsurfSyncer('/test/path/global_rules.md');
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(true);
      expect(result.platform).toBe('windsurf');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/test/path/global_rules.md',
        templateContent,
        'utf-8'
      );
    });
    
    it('should auto-detect global_rules.md file if path not provided', async () => {
      // Set environment variables for testing
      const originalHome = process.env.HOME;
      process.env.HOME = '/test/home';
      
      // Mock fs.access to make it find a file at the second location
      mockFs.access.mockImplementation((filePath) => {
        if (filePath === path.join('/test/home', 'Documents', 'Windsurf', 'global_rules.md')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });
      
      // Ensure writeFile succeeds
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const syncer = new WindsurfSyncer();
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join('/test/home', 'Documents', 'Windsurf', 'global_rules.md'),
        templateContent,
        'utf-8'
      );
      
      // Restore environment
      process.env.HOME = originalHome;
    });
    
    it('should create directory if it doesn\'t exist', async () => {
      // Set environment variables for testing
      const originalHome = process.env.HOME;
      process.env.HOME = '/test/home';
      
      // Mock fs.access to simulate no files found
      mockFs.access.mockRejectedValue(new Error('File not found'));
      // Ensure mkdir and writeFile succeed
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      
      const syncer = new WindsurfSyncer();
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // Restore environment
      process.env.HOME = originalHome;
    });
    
    it('should handle errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));
      
      const syncer = new WindsurfSyncer('/test/path/global_rules.md');
      const result = await syncer.sync(templateContent);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to sync');
    });
  });
  
  describe('PlatformSyncManager', () => {
    let mockClaudeCodeSyncer: any;
    let mockWindsurfSyncer: any;
    let syncManager: PlatformSyncManager;
    
    beforeEach(() => {
      // Create mock syncers with spies
      mockClaudeCodeSyncer = {
        sync: jest.fn().mockResolvedValue({
          platform: 'claude-code',
          success: true,
          message: 'Success'
        })
      };
      
      mockWindsurfSyncer = {
        sync: jest.fn().mockResolvedValue({
          platform: 'windsurf',
          success: true,
          message: 'Success'
        })
      };
      
      // Create sync manager with mock syncers
      syncManager = new PlatformSyncManager();
      syncManager.setSyncer('claude-code', mockClaudeCodeSyncer);
      syncManager.setSyncer('windsurf', mockWindsurfSyncer);
    });
    
    it('should set and use custom syncers', () => {
      const mockCustomSyncer = { sync: jest.fn() };
      syncManager.setSyncer('claude-web', mockCustomSyncer);
      
      // Verify the syncer was set
      expect(syncManager['syncers'].get('claude-web')).toBe(mockCustomSyncer);
    });
    
    it('should sync to all platforms', async () => {
      const results = await syncManager.syncAll(templateContent);
      
      expect(results.length).toBe(2);
      expect(mockClaudeCodeSyncer.sync).toHaveBeenCalledWith(templateContent);
      expect(mockWindsurfSyncer.sync).toHaveBeenCalledWith(templateContent);
    });
    
    it('should sync to a specific platform', async () => {
      const result = await syncManager.syncPlatform('claude-code', templateContent);
      
      expect(result.platform).toBe('claude-code');
      expect(result.success).toBe(true);
      expect(mockClaudeCodeSyncer.sync).toHaveBeenCalledWith(templateContent);
      expect(mockWindsurfSyncer.sync).not.toHaveBeenCalled();
    });
    
    it('should return error for non-existent platform', async () => {
      const result = await syncManager.syncPlatform('non-existent' as any, templateContent);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No syncer configured');
    });
  });
});