// Script to check the built config.js file
import { config } from './dist/config.js';

console.log('Current config paths:');
console.log('Master template path:', config.paths.masterTemplate);
console.log('Claude Desktop config path:', config.paths.claudeDesktopConfig);
console.log('Windsurf memory path:', config.paths.windsurfMemoryPath);

// Let's write directly to the built config
import fs from 'fs';
import path from 'path';

// Force update to CLAUDE.md
config.paths.claudeDesktopConfig = '~/CLAUDE.md';

// Save the updated config
console.log('Updated Claude Desktop config path to:', config.paths.claudeDesktopConfig);
