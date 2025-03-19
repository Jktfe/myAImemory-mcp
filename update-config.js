const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to Claude Desktop config
const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

// Read existing config
try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Update myai-memory-sync configuration
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  config.mcpServers['myai-memory-sync'] = {
    command: 'node',
    args: [path.resolve(__dirname, 'wrapper.js')],
    transport: 'stdio',
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--enable-source-maps'
    }
  };
  
  // Write updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('Updated Claude Desktop configuration successfully!');
  console.log(`MCP server path: ${path.resolve(__dirname, 'wrapper.js')}`);
} catch (error) {
  console.error('Error updating Claude Desktop configuration:', error);
}
