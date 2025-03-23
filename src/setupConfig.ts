import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Get the absolute path to the project
const projectPath = path.resolve(process.cwd());

// Paths to configuration templates
const templatesDir = path.join(projectPath, 'config-templates');
const claudeConfigTemplate = path.join(templatesDir, 'claude_desktop_config.json');
const windsurfConfigTemplate = path.join(templatesDir, 'windsurf_config.json');

// Destination paths
const claudeConfigPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
const windsurfConfigPath = ''; // This will be determined based on user input or detected installation

function readJsonFile(filePath: string): any {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

function writeJsonFile(filePath: string, data: any): boolean {
  try {
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully wrote to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing to file ${filePath}:`, error);
    return false;
  }
}

function setupClaudeConfig(): void {
  console.log('Setting up Claude Desktop configuration...');
  
  // Read template
  const template = readJsonFile(claudeConfigTemplate);
  if (!template) return;
  
  // Replace placeholder with actual project path
  template.servers[0].command = template.servers[0].command.replace('PATH_TO_PROJECT', projectPath);
  
  // Check if Claude config already exists
  let existingConfig = null;
  if (fs.existsSync(claudeConfigPath)) {
    existingConfig = readJsonFile(claudeConfigPath);
  }
  
  if (existingConfig) {
    // Check if our server is already in the config
    const serverExists = existingConfig.servers?.some((server: any) => 
      server.name === 'myai-memory-sync'
    );
    
    if (!serverExists) {
      // Add our server to the existing config
      existingConfig.servers = existingConfig.servers || [];
      existingConfig.servers.push(template.servers[0]);
      writeJsonFile(claudeConfigPath, existingConfig);
    } else {
      console.log('myai-memory-sync server already exists in Claude Desktop config');
    }
  } else {
    // Create new config
    writeJsonFile(claudeConfigPath, template);
  }
}

function setupWindsurfConfig(): void {
  console.log('Setting up Windsurf configuration...');
  console.log('NOTE: You will need to manually add the configuration to your Windsurf settings.');
  
  // Read template
  const template = readJsonFile(windsurfConfigTemplate);
  if (!template) return;
  
  // Replace placeholder with actual project path
  template.mcpServers[0].command = template.mcpServers[0].command.replace('PATH_TO_PROJECT', projectPath);
  
  // Output the config to console for the user to copy
  console.log('\nAdd the following to your Windsurf configuration:');
  console.log(JSON.stringify(template, null, 2));
}

function main(): void {
  console.log('myAI Memory Sync Configuration Setup');
  console.log('====================================');
  
  setupClaudeConfig();
  setupWindsurfConfig();
  
  console.log('\nSetup complete!');
  console.log('\nNotes:');
  console.log('1. Claude Desktop: Configuration has been added to your Claude Desktop config.');
  console.log('2. Windsurf: Please manually add the provided configuration to your Windsurf settings.');
  console.log('\nTo use the myAI Memory Sync server, make sure to build the project first:');
  console.log('npm run build');
}

main();
