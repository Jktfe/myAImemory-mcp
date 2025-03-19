#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the actual server script
const serverPath = path.join(__dirname, 'index.js');

// Spawn the server process with stdout/stderr redirection
const serverProcess = spawn('node', [serverPath], {
  // Explicitly set stdio configuration
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server stdout - only forward valid JSON
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(Boolean);
  
  for (const line of lines) {
    try {
      // Try to parse as JSON to validate
      JSON.parse(line);
      // If it's valid JSON, write to stdout
      process.stdout.write(line + '\n');
    } catch (err) {
      // If it's not valid JSON, redirect to stderr
      process.stderr.write(`[STDOUT->STDERR] ${line}\n`);
    }
  }
});

// Pass through stderr
serverProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process exit
serverProcess.on('exit', (code) => {
  process.exit(code || 0);
});

// Handle signals
process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
});

// Pipe stdin to the server process
process.stdin.pipe(serverProcess.stdin);
