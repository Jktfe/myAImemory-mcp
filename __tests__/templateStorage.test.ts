import { TemplateStorage } from '../src/templateStorage.js';
import fs from 'fs/promises';
import path from 'path';
import { sampleTemplate } from './templateStorage.mock.js';

// Mock fs/promises module
// Note: jest.mock is hoisted to the top, so we need to use a different approach for ESM
const mockFs = {
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([])
};

// Override the fs/promises module
jest.mock('fs/promises', () => mockFs, { virtual: true });

// Mock for __dirname in ESM environment
const mockDirname = '/mock_dir';
jest.mock('../src/templateStorage.js', () => {
  const originalModule = jest.requireActual('../src/templateStorage.js');
  return {
    ...originalModule,
    __dirname: mockDirname
  };
}, { virtual: true });

describe('TemplateStorage class', () => {
  let templateStorage: TemplateStorage;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    templateStorage = new TemplateStorage();
    
    // Mock implementation for fs.readFile to return the sample template
    mockFs.readFile.mockResolvedValue(sampleTemplate);
    
    // Mock implementation for fs.readdir to return preset files
    mockFs.readdir.mockResolvedValue(['dave.json', 'abi.json']);
  });
  
  describe('initialize method', () => {
    it('should create required directories', async () => {
      await templateStorage.initialize();
      expect(mockFs.mkdir).toHaveBeenCalledTimes(2);
    });
    
    it('should load existing template if available', async () => {
      await templateStorage.initialize();
      expect(mockFs.readFile).toHaveBeenCalled();
      
      const template = templateStorage.getTemplate();
      expect(template.sections.length).toBeGreaterThan(0);
    });
    
    it('should create default template if none exists', async () => {
      // Simulate no template by rejecting the readFile call
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      await templateStorage.initialize();
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const template = templateStorage.getTemplate();
      expect(template.sections.length).toBeGreaterThan(0);
    });
    
    it('should check for default presets', async () => {
      await templateStorage.initialize();
      expect(mockFs.access).toHaveBeenCalled();
    });
  });
  
  describe('loadTemplate method', () => {
    it('should read and parse template file', async () => {
      await templateStorage.loadTemplate();
      expect(mockFs.readFile).toHaveBeenCalled();
      
      const template = templateStorage.getTemplate();
      expect(template.sections.length).toBeGreaterThan(0);
      expect(template.sections[0].title).toBe('User Information');
    });
  });
  
  describe('saveTemplate method', () => {
    it('should write template to file', async () => {
      await templateStorage.loadTemplate();
      await templateStorage.saveTemplate();
      
      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
  
  describe('getSection method', () => {
    it('should return requested section by name (case insensitive)', async () => {
      await templateStorage.loadTemplate();
      
      const section = templateStorage.getSection('user information');
      expect(section).not.toBeNull();
      expect(section?.title).toBe('User Information');
    });
    
    it('should return null for non-existent section', async () => {
      await templateStorage.loadTemplate();
      
      const section = templateStorage.getSection('non-existent section');
      expect(section).toBeNull();
    });
  });
  
  describe('updateSection method', () => {
    it('should update existing section', async () => {
      await templateStorage.loadTemplate();
      
      const result = await templateStorage.updateSection('User Information', 
        '## Updated description\n-~- UpdatedKey: UpdatedValue');
      
      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const section = templateStorage.getSection('User Information');
      expect(section?.description).toBe('Updated description');
      expect(section?.items[0].key).toBe('UpdatedKey');
      expect(section?.items[0].value).toBe('UpdatedValue');
    });
    
    it('should add new section if it does not exist', async () => {
      await templateStorage.loadTemplate();
      
      const result = await templateStorage.updateSection('New Section', 
        '## New description\n-~- NewKey: NewValue');
      
      expect(result).toBe(true);
      
      const section = templateStorage.getSection('New Section');
      expect(section).not.toBeNull();
      expect(section?.description).toBe('New description');
    });
    
    it('should return false for invalid section content', async () => {
      await templateStorage.loadTemplate();
      
      // Invalid content that will not parse into a section
      const result = await templateStorage.updateSection('Invalid Section', '');
      
      expect(result).toBe(false);
    });
  });
  
  describe('updateTemplate method', () => {
    it('should update entire template', async () => {
      const newTemplate = `# myAI Memory

# New Section
## New Description
-~- Key1: Value1
-~- Key2: Value2
`;
      
      const result = await templateStorage.updateTemplate(newTemplate);
      
      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      const template = templateStorage.getTemplate();
      expect(template.sections.length).toBe(1);
      expect(template.sections[0].title).toBe('New Section');
    });
    
    it('should reject invalid template', async () => {
      const result = await templateStorage.updateTemplate('Invalid template content');
      
      expect(result).toBe(false);
    });
  });
  
  describe('listPresets method', () => {
    it('should return list of available presets', async () => {
      const presets = await templateStorage.listPresets();
      
      expect(presets).toEqual(['dave', 'abi']);
    });
  });
  
  describe('loadPreset method', () => {
    beforeEach(() => {
      // Mock implementation for reading preset file
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.toString().includes('dave.json')) {
          return Promise.resolve(JSON.stringify({
            name: 'dave',
            sections: [
              {
                title: 'Dave Section',
                description: 'Dave Description',
                items: [{ key: 'DaveKey', value: 'DaveValue' }]
              }
            ]
          }));
        }
        return Promise.resolve(sampleTemplate);
      });
    });
    
    it('should load preset and update template', async () => {
      const result = await templateStorage.loadPreset('dave');
      
      expect(result).toBe(true);
      expect(mockFs.readFile).toHaveBeenCalled();
      
      const template = templateStorage.getTemplate();
      expect(template.sections[0].title).toBe('Dave Section');
    });
    
    it('should return false if preset not found', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));
      
      const result = await templateStorage.loadPreset('non-existent');
      
      expect(result).toBe(false);
    });
  });
});