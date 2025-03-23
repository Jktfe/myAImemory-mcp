/**
 * Script to combine project guidelines and myAI Master into CLAUDE.md
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// Get current directory in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// File paths
const masterPath = path.join(__dirname, 'myAI Master.md');
const claudePath = path.join(__dirname, 'CLAUDE.md');

try {
  // Read the master template and CLAUDE.md
  console.log(`Reading from: ${masterPath}`);
  const masterContent = fs.readFileSync(masterPath, 'utf-8');
  
  console.log(`Reading from: ${claudePath}`);
  const claudeContent = fs.readFileSync(claudePath, 'utf-8');
  
  // Combine the content
  const combinedContent = `${claudeContent}\n\n${masterContent}`;
  
  // Write to CLAUDE.md
  console.log(`Writing combined content to: ${claudePath}`);
  fs.writeFileSync(claudePath, combinedContent, 'utf-8');
  
  console.log('Sync completed successfully!');
} catch (err) {
  console.error('Error syncing files:', err);
}