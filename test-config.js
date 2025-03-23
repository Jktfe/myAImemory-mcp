// Test script to debug configuration issues
import { config } from './dist/config.js';

console.log('Configuration paths:');
console.log('Master template path:', config.paths.masterTemplate);
console.log('Claude Desktop config path:', config.paths.claudeDesktopConfig);
console.log('Windsurf memory path:', config.paths.windsurfMemoryPath);
