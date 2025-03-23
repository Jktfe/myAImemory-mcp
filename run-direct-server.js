#!/usr/bin/env node

// This is a wrapper script to set proper paths before running the direct server
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Set environment variable to force correct paths
process.env.CLAUDE_MD_PATH = '~/CLAUDE.md';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'dist', 'direct-server.js');

console.log('Starting direct server with CLAUDE.md path...');

// Spawn the direct server process
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Forward signals to child process
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
