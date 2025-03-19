#!/usr/bin/env node

/**
 * Complete MCP server implementation for myAI Memory Sync
 * Based on the minimal implementation but with full feature support
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');
const os = require('os');

// Constants
const DATA_DIR = path.join(__dirname, 'data');
const TEMPLATE_PATH = path.join(DATA_DIR, 'template.json');
const TEMPLATE_MD_PATH = path.join(DATA_DIR, 'template.md');
const PRESETS_DIR = path.join(DATA_DIR, 'presets');

// Default paths for sync targets (can be overridden in config)
const DEFAULT_PATHS = {
  claudeDesktop: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  windsurfMemory: path.join(os.homedir(), '.codeium', 'windsurf', 'memories', 'global_rule.md')
};

// Ensure data directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PRESETS_DIR)) {
  fs.mkdirSync(PRESETS_DIR, { recursive: true });
}

// Configure the readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stderr, // Only use stderr for readline output
  terminal: false
});

// Template Storage Helpers
function loadTemplate() {
  try {
    if (fs.existsSync(TEMPLATE_PATH)) {
      return JSON.parse(fs.readFileSync(TEMPLATE_PATH, 'utf8'));
    }
    if (fs.existsSync(TEMPLATE_MD_PATH)) {
      // If we have a markdown file but no JSON, parse the markdown
      const markdown = fs.readFileSync(TEMPLATE_MD_PATH, 'utf8');
      const template = parseMarkdownTemplate(markdown);
      saveTemplate(template);
      return template;
    }
  } catch (err) {
    console.error(`[ERROR] Error loading template: ${err.message}`);
  }
  
  // Default empty template
  return {
    sections: {
      "Work": {
        description: "Work-related information and tasks",
        preferences: {
          "Current Project": "myAI Memory Sync",
          "Priority": "High"
        }
      },
      "Personal": {
        description: "Personal notes and reminders",
        preferences: {
          "Important Date": "2025-03-20"
        }
      }
    }
  };
}

function saveTemplate(template) {
  try {
    fs.writeFileSync(TEMPLATE_PATH, JSON.stringify(template, null, 2), 'utf8');
    
    // Also save as markdown
    const markdown = generateMarkdownTemplate(template);
    fs.writeFileSync(TEMPLATE_MD_PATH, markdown, 'utf8');
    
    return true;
  } catch (err) {
    console.error(`[ERROR] Error saving template: ${err.message}`);
    return false;
  }
}

function updateTemplateSection(sectionName, content) {
  try {
    const template = loadTemplate();
    
    // Parse the section content
    const lines = content.split('\n');
    const section = { preferences: {} };
    
    // Extract description and preferences
    let inDescription = false;
    for (const line of lines) {
      if (line.startsWith('## Description')) {
        inDescription = true;
        continue;
      } else if (inDescription && line.startsWith('##')) {
        inDescription = false;
      }
      
      if (inDescription && line.trim()) {
        section.description = (section.description || '') + line + '\n';
      } else if (line.startsWith('-~-')) {
        const prefMatch = line.match(/-~-\s+(.*?):\s+(.*)/);
        if (prefMatch && prefMatch.length >= 3) {
          section.preferences[prefMatch[1].trim()] = prefMatch[2].trim();
        }
      }
    }
    
    if (section.description) {
      section.description = section.description.trim();
    }
    
    // Update the template
    template.sections[sectionName] = section;
    saveTemplate(template);
    
    return true;
  } catch (err) {
    console.error(`[ERROR] Error updating section: ${err.message}`);
    return false;
  }
}

function getTemplateSection(sectionName) {
  try {
    const template = loadTemplate();
    const section = template.sections[sectionName];
    
    if (!section) {
      return null;
    }
    
    // Format as markdown
    let markdown = `## Description\n${section.description || ''}\n\n`;
    
    for (const [key, value] of Object.entries(section.preferences || {})) {
      markdown += `-~- ${key}: ${value}\n`;
    }
    
    return markdown.trim();
  } catch (err) {
    console.error(`[ERROR] Error getting section: ${err.message}`);
    return null;
  }
}

function parseMarkdownTemplate(markdown) {
  const template = { sections: {} };
  const lines = markdown.split('\n');
  
  let currentSection = null;
  let inDescription = false;
  let descriptionText = '';
  
  for (const line of lines) {
    if (line.startsWith('# ') && line.length > 2) {
      // New section
      currentSection = line.substring(2).trim();
      template.sections[currentSection] = { preferences: {} };
      inDescription = false;
    } else if (currentSection && line.startsWith('## Description')) {
      inDescription = true;
      descriptionText = '';
    } else if (currentSection && inDescription && line.startsWith('##')) {
      inDescription = false;
      template.sections[currentSection].description = descriptionText.trim();
    } else if (currentSection && inDescription) {
      descriptionText += line + '\n';
    } else if (currentSection && line.startsWith('-~-')) {
      const prefMatch = line.match(/-~-\s+(.*?):\s+(.*)/);
      if (prefMatch && prefMatch.length >= 3) {
        template.sections[currentSection].preferences[prefMatch[1].trim()] = prefMatch[2].trim();
      }
    }
  }
  
  // Save the last description if still in one
  if (currentSection && inDescription) {
    template.sections[currentSection].description = descriptionText.trim();
  }
  
  return template;
}

function generateMarkdownTemplate(template) {
  let markdown = '# myAI Memory\n\n';
  
  for (const [sectionName, section] of Object.entries(template.sections)) {
    markdown += `# ${sectionName}\n`;
    if (section.description) {
      markdown += `## Description\n${section.description}\n\n`;
    }
    
    for (const [key, value] of Object.entries(section.preferences || {})) {
      markdown += `-~- ${key}: ${value}\n`;
    }
    
    markdown += '\n';
  }
  
  return markdown.trim();
}

function updateFullTemplate(markdown) {
  try {
    const template = parseMarkdownTemplate(markdown);
    saveTemplate(template);
    return Object.keys(template.sections).length;
  } catch (err) {
    console.error(`[ERROR] Error updating template: ${err.message}`);
    return 0;
  }
}

// Platform Sync Functions
async function syncToClaudeWeb(templateMarkdown) {
  console.error('[INFO] Claude Web sync not implemented in this version');
  return {
    platform: 'claude-web',
    success: false,
    message: 'Claude Web sync requires browser automation (not implemented in minimal server)'
  };
}

function syncToClaudeCode(templateMarkdown) {
  try {
    const claudeMdPath = path.join(os.homedir(), 'CLAUDE.md');
    fs.writeFileSync(claudeMdPath, templateMarkdown, 'utf8');
    
    console.error(`[INFO] Synced to Claude Code at ${claudeMdPath}`);
    return {
      platform: 'claude-code',
      success: true,
      message: `Successfully synced to ${claudeMdPath}`
    };
  } catch (err) {
    console.error(`[ERROR] Error syncing to Claude Code: ${err.message}`);
    return {
      platform: 'claude-code',
      success: false,
      message: `Failed to sync: ${err.message}`
    };
  }
}

function syncToWindsurf(templateMarkdown) {
  try {
    const windsurfPath = DEFAULT_PATHS.windsurfMemory;
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(windsurfPath), { recursive: true });
    
    fs.writeFileSync(windsurfPath, templateMarkdown, 'utf8');
    
    console.error(`[INFO] Synced to Windsurf at ${windsurfPath}`);
    return {
      platform: 'windsurf',
      success: true,
      message: `Successfully synced to ${windsurfPath}`
    };
  } catch (err) {
    console.error(`[ERROR] Error syncing to Windsurf: ${err.message}`);
    return {
      platform: 'windsurf',
      success: false,
      message: `Failed to sync: ${err.message}`
    };
  }
}

async function syncAll(templateMarkdown) {
  const results = [];
  
  // Sync to Claude Web
  results.push(await syncToClaudeWeb(templateMarkdown));
  
  // Sync to Claude Code
  results.push(syncToClaudeCode(templateMarkdown));
  
  // Sync to Windsurf
  results.push(syncToWindsurf(templateMarkdown));
  
  return results;
}

// Preset Management
function savePreset(presetName, template) {
  try {
    const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
    fs.writeFileSync(presetPath, JSON.stringify(template, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`[ERROR] Error saving preset: ${err.message}`);
    return false;
  }
}

function loadPreset(presetName) {
  try {
    const presetPath = path.join(PRESETS_DIR, `${presetName}.json`);
    if (fs.existsSync(presetPath)) {
      const preset = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
      saveTemplate(preset);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[ERROR] Error loading preset: ${err.message}`);
    return false;
  }
}

function listPresets() {
  try {
    const presets = fs.readdirSync(PRESETS_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    return presets;
  } catch (err) {
    console.error(`[ERROR] Error listing presets: ${err.message}`);
    return [];
  }
}

// MCP Message Handler
function handleMessage(message) {
  try {
    const parsed = JSON.parse(message);
    
    // Log the received message to stderr
    console.error(`[MCP] Received message: "${parsed.method || 'unknown'}" (id: ${parsed.id || 'none'})`);
    
    // Handle initialize message
    if (parsed.method === 'initialize') {
      // Construct a proper initialize response
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          protocolVersion: parsed.params.protocolVersion || '2024-11-05',
          serverInfo: {
            name: 'myAI Memory Sync',
            version: '1.0.0'
          },
          capabilities: {
            tools: {
              // Explicitly set tool capability to true to make sure tools are visible
              enabled: true
            },
            resources: {}
          }
        }
      };
      
      // Send the response to stdout
      console.error('[MCP] Sending initialize response');
      process.stdout.write(JSON.stringify(response) + '\n');
    } 
    // Handle tools/list message
    else if (parsed.method === 'tools/list') {
      // Respond with a list of available tools
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          tools: [
            {
              name: 'get_template',
              description: 'Get the current memory template',
              parameters: {}
            },
            {
              name: 'update_template',
              description: 'Update the memory template content',
              parameters: {
                template: {
                  description: 'The new template content',
                  type: 'string'
                }
              }
            },
            {
              name: 'get_section',
              description: 'Get a specific section of the template',
              parameters: {
                sectionName: {
                  description: 'The name of the section to retrieve',
                  type: 'string'
                }
              }
            },
            {
              name: 'update_section',
              description: 'Update a specific section of the template',
              parameters: {
                sectionName: {
                  description: 'The name of the section to update',
                  type: 'string'
                },
                content: {
                  description: 'The new content for the section',
                  type: 'string'
                }
              }
            },
            {
              name: 'sync_all',
              description: 'Sync the template to all platforms',
              parameters: {}
            },
            {
              name: 'sync_platform',
              description: 'Sync the template to a specific platform',
              parameters: {
                platform: {
                  description: 'The platform to sync to (claude-web, claude-code, windsurf, or all)',
                  type: 'string'
                }
              }
            },
            {
              name: 'load_preset',
              description: 'Load a preset template',
              parameters: {
                presetName: {
                  description: 'The name of the preset to load',
                  type: 'string'
                }
              }
            },
            {
              name: 'list_presets',
              description: 'List available template presets',
              parameters: {}
            }
          ]
        }
      };
      
      console.error('[MCP] Sending tools/list response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle resources/list message 
    else if (parsed.method === 'resources/list') {
      // Respond with a list of available resources
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          resources: [
            {
              name: 'myai-memory-template',
              description: 'The main memory template',
              uris: ['memory://template']
            }
          ]
        }
      };
      
      console.error('[MCP] Sending resources/list response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle prompts/list message
    else if (parsed.method === 'prompts/list') {
      // Respond with a list of available prompts (empty in this case)
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          prompts: []
        }
      };
      
      console.error('[MCP] Sending prompts/list response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for get_template
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'get_template') {
      const template = loadTemplate();
      const markdown = generateMarkdownTemplate(template);
      
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: markdown
            }
          ]
        }
      };
      
      console.error('[MCP] Sending get_template response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for update_template
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'update_template') {
      const templateMarkdown = parsed.params.arguments.template;
      const sectionsCount = updateFullTemplate(templateMarkdown);
      
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Template successfully updated with ${sectionsCount} sections`
            }
          ]
        }
      };
      
      console.error('[MCP] Sending update_template response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for get_section
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'get_section') {
      const sectionName = parsed.params.arguments.sectionName;
      const sectionContent = getTemplateSection(sectionName);
      
      if (sectionContent) {
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            content: [
              {
                type: 'text',
                text: sectionContent
              }
            ]
          }
        };
        
        console.error('[MCP] Sending get_section response');
        process.stdout.write(JSON.stringify(response) + '\n');
      } else {
        // Section not found
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Section "${sectionName}" not found`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending section not found error');
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
    // Handle tools/call message for update_section
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'update_section') {
      const sectionName = parsed.params.arguments.sectionName;
      const content = parsed.params.arguments.content;
      
      const success = updateTemplateSection(sectionName, content);
      
      if (success) {
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Section "${sectionName}" updated successfully`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending update_section success response');
        process.stdout.write(JSON.stringify(response) + '\n');
      } else {
        // Update failed
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Failed to update section "${sectionName}"`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending update section error');
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
    // Handle tools/call message for sync_all
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'sync_all') {
      const template = loadTemplate();
      const markdown = generateMarkdownTemplate(template);
      
      // Start sync process - don't await it to avoid blocking
      syncAll(markdown).then(results => {
        console.error('[MCP] Sync completed:', JSON.stringify(results));
      });
      
      // Immediately return success response
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: 'Sync started for all platforms: claude-web, claude-code, windsurf'
            }
          ]
        }
      };
      
      console.error('[MCP] Sending sync_all response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for sync_platform
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'sync_platform') {
      const platform = parsed.params.arguments.platform;
      const template = loadTemplate();
      const markdown = generateMarkdownTemplate(template);
      
      let resultPromise;
      
      if (platform === 'all') {
        resultPromise = syncAll(markdown);
      } else if (platform === 'claude-web') {
        resultPromise = syncToClaudeWeb(markdown);
      } else if (platform === 'claude-code') {
        resultPromise = Promise.resolve(syncToClaudeCode(markdown));
      } else if (platform === 'windsurf') {
        resultPromise = Promise.resolve(syncToWindsurf(markdown));
      } else {
        // Unsupported platform
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Unsupported platform: ${platform}`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending unsupported platform error');
        process.stdout.write(JSON.stringify(response) + '\n');
        return;
      }
      
      // Start sync process - don't await for better responsiveness
      resultPromise.then(result => {
        console.error('[MCP] Sync completed:', JSON.stringify(result));
      });
      
      // Immediately return success response
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Sync started for platform: ${platform}`
            }
          ]
        }
      };
      
      console.error('[MCP] Sending sync_platform response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle tools/call message for load_preset
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'load_preset') {
      const presetName = parsed.params.arguments.presetName;
      const success = loadPreset(presetName);
      
      if (success) {
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Preset "${presetName}" loaded successfully`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending load_preset success response');
        process.stdout.write(JSON.stringify(response) + '\n');
      } else {
        // Preset not found
        const response = {
          jsonrpc: '2.0',
          id: parsed.id,
          result: {
            isError: true,
            content: [
              {
                type: 'text',
                text: `Preset "${presetName}" not found`
              }
            ]
          }
        };
        
        console.error('[MCP] Sending preset not found error');
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    }
    // Handle tools/call message for list_presets
    else if (parsed.method === 'tools/call' && parsed.params?.name === 'list_presets') {
      const presets = listPresets();
      
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(presets, null, 2)
            }
          ]
        }
      };
      
      console.error('[MCP] Sending list_presets response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle resource reads
    else if (parsed.method === 'resources/read' && parsed.params?.uri === 'memory://template') {
      const template = loadTemplate();
      const markdown = generateMarkdownTemplate(template);
      
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {
          contents: [
            {
              uri: 'memory://template',
              text: markdown
            }
          ]
        }
      };
      
      console.error('[MCP] Sending resources/read response');
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    // Handle any other message with a generic response
    else if (parsed.id) {
      // Generic response for any request with an ID
      const response = {
        jsonrpc: '2.0',
        id: parsed.id,
        result: {}
      };
      
      console.error(`[MCP] Sending generic response for ${parsed.method || 'unknown method'}`);
      process.stdout.write(JSON.stringify(response) + '\n');
    }
    
  } catch (err) {
    console.error(`[MCP] Error handling message: ${err.message}`);
  }
}

// Listen for messages on stdin
rl.on('line', (line) => {
  if (line.trim()) {
    handleMessage(line);
  }
});

// Setup signal handlers
process.on('SIGINT', () => {
  console.error('[MCP] Received SIGINT, exiting');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[MCP] Received SIGTERM, exiting');
  process.exit(0);
});

// Initialize by loading template
const initialTemplate = loadTemplate();
console.error(`[MCP] Loaded template with ${Object.keys(initialTemplate.sections).length} sections`);

// Create a default preset if none exist
if (listPresets().length === 0) {
  savePreset('default', initialTemplate);
  console.error('[MCP] Created default preset');
  
  // Create another sample preset
  const workTemplate = {
    sections: {
      "Current Project": {
        description: "Details about your current project",
        preferences: {
          "Name": "myAI Memory Sync",
          "Priority": "High",
          "Deadline": "2025-04-01"
        }
      },
      "Tasks": {
        description: "Current tasks and their status",
        preferences: {
          "Fix MCP Connection": "In Progress",
          "Add Sync Support": "Pending",
          "Write Documentation": "Not Started"
        }
      }
    }
  };
  savePreset('work', workTemplate);
  console.error('[MCP] Created work preset');
}

// Notify that we're ready
console.error('[MCP] Server ready and waiting for messages');