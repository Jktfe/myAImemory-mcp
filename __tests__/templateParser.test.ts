import { parseTemplate, generateTemplate, validateTemplate } from '../src/templateParser.js';
import { MemoryTemplate } from '../src/types.js';

describe('templateParser module', () => {
  // Sample template for testing
  const sampleMarkdown = `# myAI Memory

# User Information
## Use this information if you need to reference them directly
-~- Name: John Doe
-~- Location: New York

# General Response Style
## Use this in every response
-~- Style: Concise and friendly
`;

  const sampleTemplate: MemoryTemplate = {
    sections: [
      {
        title: 'User Information',
        description: 'Use this information if you need to reference them directly',
        items: [
          { key: 'Name', value: 'John Doe' },
          { key: 'Location', value: 'New York' }
        ]
      },
      {
        title: 'General Response Style',
        description: 'Use this in every response',
        items: [
          { key: 'Style', value: 'Concise and friendly' }
        ]
      }
    ]
  };

  describe('parseTemplate function', () => {
    it('should parse markdown into a valid template object', () => {
      const result = parseTemplate(sampleMarkdown);
      expect(result).toEqual(sampleTemplate);
    });

    it('should handle empty input', () => {
      const result = parseTemplate('');
      expect(result).toEqual({ sections: [] });
    });

    it('should skip the initial myAI Memory header', () => {
      const result = parseTemplate('# myAI Memory\n\n# Section');
      expect(result.sections[0].title).toBe('Section');
    });

    it('should handle multiple sections correctly', () => {
      const markdown = `# myAI Memory\n\n# Section1\n## Description1\n-~- Key1: Value1\n\n# Section2\n## Description2\n-~- Key2: Value2`;
      const result = parseTemplate(markdown);
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe('Section1');
      expect(result.sections[1].title).toBe('Section2');
    });
  });

  describe('generateTemplate function', () => {
    it('should generate markdown from a template object', () => {
      const result = generateTemplate(sampleTemplate);
      
      // Check for key components in the generated markdown
      expect(result).toContain('# myAI Memory');
      expect(result).toContain('# User Information');
      expect(result).toContain('## Use this information if you need to reference them directly');
      expect(result).toContain('-~- Name: John Doe');
      expect(result).toContain('-~- Location: New York');
      expect(result).toContain('# General Response Style');
      expect(result).toContain('## Use this in every response');
      expect(result).toContain('-~- Style: Concise and friendly');
    });

    it('should handle empty template', () => {
      const result = generateTemplate({ sections: [] });
      expect(result).toBe('# myAI Memory\n\n');
    });

    it('should handle template without descriptions', () => {
      const template: MemoryTemplate = {
        sections: [
          {
            title: 'Empty Section',
            description: '',
            items: [
              { key: 'Key', value: 'Value' }
            ]
          }
        ]
      };
      
      const result = generateTemplate(template);
      expect(result).toContain('# Empty Section');
      expect(result).toContain('-~- Key: Value');
      expect(result).not.toContain('##');
    });
  });

  describe('validateTemplate function', () => {
    it('should validate a correct template', () => {
      expect(validateTemplate(sampleTemplate)).toBe(true);
    });

    it('should reject template with missing sections array', () => {
      expect(validateTemplate({} as MemoryTemplate)).toBe(false);
    });

    it('should reject template with non-array sections', () => {
      expect(validateTemplate({ sections: 'not an array' } as any)).toBe(false);
    });

    it('should reject section with missing title', () => {
      const badTemplate = {
        sections: [
          {
            title: '',
            description: 'Description',
            items: []
          }
        ]
      };
      expect(validateTemplate(badTemplate)).toBe(false);
    });

    it('should reject section with missing items array', () => {
      const badTemplate = {
        sections: [
          {
            title: 'Title',
            description: 'Description',
            items: 'not an array'
          } as any
        ]
      };
      expect(validateTemplate(badTemplate)).toBe(false);
    });

    it('should reject item with missing key', () => {
      const badTemplate = {
        sections: [
          {
            title: 'Title',
            description: 'Description',
            items: [
              { key: '', value: 'Value' }
            ]
          }
        ]
      };
      expect(validateTemplate(badTemplate)).toBe(false);
    });
  });
});