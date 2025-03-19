#!/usr/bin/env node

/**
 * Wrapper script for Direct MCP server
 * 
 * This script runs the Direct MCP server as a child process and filters its output
 * to ensure that only valid JSON-RPC messages are sent to stdout while all
 * other output is redirected to stderr. This prevents Claude Desktop from
 * encountering JSON parsing errors.
 * 
 * Special handling for Claude Desktop's connection pattern:
 * Claude Desktop has a unique behavior where it:
 * 1. Connects and sends an initialize request
 * 2. Receives the initialize response
 * 3. Immediately closes the transport
 * 4. Sends a SIGTERM signal
 * 5. Attempts to reconnect shortly after
 * 
 * This wrapper is designed to handle this pattern gracefully.
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the actual server script
const serverPath = join(__dirname, 'direct-server.js');

// Debug mode
const DEBUG = process.env.DEBUG === 'true';

// Configuration
const AUTO_SHUTDOWN_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity before shutdown
const KEEP_ALIVE_INTERVAL = 15 * 1000; // 15 seconds between keep-alive pings
const RECONNECT_GRACE_PERIOD = 10 * 1000; // 10 seconds grace period for reconnects
const SIGNAL_IGNORE_PERIOD = 5 * 1000; // 5 seconds to ignore signals after initialize

// Log to stderr
function log(message) {
  process.stderr.write(`[direct-wrapper] ${message}\n`);
}

function debug(message) {
  if (DEBUG) {
    process.stderr.write(`[direct-wrapper:debug] ${message}\n`);
  }
}

// Log that we're starting
log(`Starting direct server from ${serverPath}`);

// Keep track of the server process
let serverProcess = null;
let isShuttingDown = false;
let pendingRequests = new Map(); // Track pending requests by ID
let lastInitializeResponse = null; // Store the last initialize response
let lastInitializeTime = 0; // Track when the last initialize response was sent
let ignoreSignalsTimeout = null; // Timeout to ignore signals after initialize
let clientStdinClosed = false; // Track if client stdin has closed
let reconnectAttemptTimeout = null; // Timeout for reconnect attempts
let keepAliveInterval = null; // Interval for sending keep-alive pings to client
let lastToolsResponse = null; // Store the last listTools response
let claudeDesktopMode = true; // Special mode for Claude Desktop's connection pattern
let lastActivityTime = Date.now(); // Track last activity time
let inactivityTimeout = null; // Timeout for auto-shutdown after inactivity

// Function to start the server process
function startServer() {
  // Spawn the server process with environment variables
  serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      MCP_WRAPPER_MODE: 'true',
      NODE_OPTIONS: '--trace-warnings',
      DEBUG: DEBUG ? 'true' : 'false'
    }
  });

  // Create readline interfaces for stdout and stderr
  const stdoutRl = createInterface({
    input: serverProcess.stdout,
    terminal: false
  });

  const stderrRl = createInterface({
    input: serverProcess.stderr,
    terminal: false
  });

  // Handle stdout from the server
  stdoutRl.on('line', (line) => {
    try {
      // Skip empty lines
      if (!line.trim()) {
        return;
      }
      
      // Update last activity time
      lastActivityTime = Date.now();
      resetInactivityTimeout();
      
      // Try to parse as JSON to validate
      try {
        const parsed = JSON.parse(line);
        
        // Only forward valid JSON-RPC messages
        if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
          debug(`Forwarding server response: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
          
          // Store initialize response for potential reconnects
          if (parsed.result && parsed.result.serverInfo) {
            lastInitializeResponse = line;
            lastInitializeTime = Date.now();
            debug('Stored initialize response for future reconnects');
            
            // Set a timeout to ignore SIGTERM signals for a short period after initialize
            if (ignoreSignalsTimeout) {
              clearTimeout(ignoreSignalsTimeout);
            }
            
            ignoreSignalsTimeout = setTimeout(() => {
              debug('Signal ignore period ended');
              ignoreSignalsTimeout = null;
            }, SIGNAL_IGNORE_PERIOD);
            
            // If client stdin is closed (disconnected), try to keep the connection alive
            if (clientStdinClosed) {
              debug('Client stdin is closed, but we received an initialize response. Setting up keep-alive mechanism.');
              setupKeepAlive();
            }
          }
          
          // Store listTools response for potential reconnects
          if (parsed.result && parsed.result.tools) {
            lastToolsResponse = line;
            debug('Stored listTools response for future reconnects');
          }
          
          // Remove from pending requests
          if (parsed.id !== undefined) {
            pendingRequests.delete(parsed.id);
          }
          
          // Write to stdout even if client stdin is closed
          // This ensures that if Claude Desktop is still listening, it will get the response
          process.stdout.write(line + '\n');
          
          // In Claude Desktop mode, if this is an initialize response, prepare for the expected disconnect
          if (claudeDesktopMode && parsed.result && parsed.result.serverInfo) {
            debug('Claude Desktop mode: Preparing for expected disconnect after initialize response');
            // Claude Desktop will disconnect after initialize, so we'll prepare for reconnection
            setTimeout(() => {
              if (!clientStdinClosed) {
                debug('Claude Desktop mode: Still connected after initialize response');
              }
            }, 1000);
          }
        } else {
          // Not a valid JSON-RPC message, redirect to stderr
          process.stderr.write(`[direct-wrapper:redirect:not-jsonrpc] ${line}\n`);
        }
      } catch (err) {
        // Not valid JSON, redirect to stderr
        process.stderr.write(`[direct-wrapper:redirect:not-json] ${line}\n`);
      }
    } catch (err) {
      // Error processing line
      process.stderr.write(`[direct-wrapper:error] Error processing stdout line: ${err.message}\n`);
    }
  });

  // Redirect all stderr output from the server
  stderrRl.on('line', (line) => {
    // Skip keep-alive debug messages to reduce noise
    if (line.includes('Keep-alive check') || line.includes('Sending keep-alive ping')) {
      if (DEBUG) {
        process.stderr.write(`[direct-wrapper:stderr] ${line}\n`);
      }
    } else {
      process.stderr.write(`[direct-wrapper:stderr] ${line}\n`);
    }
  });

  // Handle server process exit
  serverProcess.on('exit', (code, signal) => {
    log(`Server process exited with code ${code} and signal ${signal}`);
    
    // If we're not intentionally shutting down, restart the server
    if (!isShuttingDown) {
      log('Restarting server process...');
      setTimeout(() => {
        startServer();
        
        // Resend any pending requests after restart
        if (pendingRequests.size > 0) {
          log(`Resending ${pendingRequests.size} pending requests after restart`);
          setTimeout(() => {
            for (const [id, request] of pendingRequests.entries()) {
              debug(`Resending request with id ${id}`);
              if (serverProcess && serverProcess.stdin.writable) {
                serverProcess.stdin.write(request + '\n');
              }
            }
          }, 1000); // Wait a bit for the server to initialize
        }
      }, 1000); // Restart after a short delay
    } else {
      // If we are shutting down, exit the wrapper
      process.exit(code || 0);
    }
  });

  // Handle server process errors
  serverProcess.on('error', (err) => {
    log(`Server process error: ${err.message}`);
    
    // If we're not intentionally shutting down, restart the server
    if (!isShuttingDown) {
      log('Restarting server process after error...');
      setTimeout(startServer, 1000); // Restart after a short delay
    } else {
      // If we are shutting down, exit the wrapper
      process.exit(1);
    }
  });
  
  // Set up inactivity timeout
  resetInactivityTimeout();
}

// Set up inactivity timeout to shut down after a period of inactivity
function resetInactivityTimeout() {
  // Clear any existing timeout
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
  }
  
  // Set up a new timeout
  inactivityTimeout = setTimeout(() => {
    const inactivityTime = Date.now() - lastActivityTime;
    log(`No activity for ${Math.round(inactivityTime / 1000)} seconds, shutting down`);
    
    // Shut down gracefully
    isShuttingDown = true;
    
    // Clear all intervals and timeouts
    clearAllTimeouts();
    
    // Kill the server process
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    
    // Exit after a short delay
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }, AUTO_SHUTDOWN_TIMEOUT);
}

// Clear all timeouts and intervals
function clearAllTimeouts() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  
  if (reconnectAttemptTimeout) {
    clearTimeout(reconnectAttemptTimeout);
    reconnectAttemptTimeout = null;
  }
  
  if (ignoreSignalsTimeout) {
    clearTimeout(ignoreSignalsTimeout);
    ignoreSignalsTimeout = null;
  }
  
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
}

// Set up keep-alive mechanism to maintain connection with Claude Desktop
function setupKeepAlive() {
  // Clear any existing keep-alive interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  
  // Set up a new keep-alive interval
  keepAliveInterval = setInterval(() => {
    // If we have a cached initialize response, send a dummy notification to keep the connection alive
    if (lastInitializeResponse && !isShuttingDown) {
      debug('Sending keep-alive notification to client');
      
      // Send a notification (no id) that won't require a response
      const keepAliveMsg = {
        jsonrpc: '2.0',
        method: 'notifications/keepAlive',
        params: {
          timestamp: Date.now()
        }
      };
      
      try {
        process.stdout.write(JSON.stringify(keepAliveMsg) + '\n');
      } catch (err) {
        debug(`Error sending keep-alive notification: ${err.message}`);
      }
    }
  }, KEEP_ALIVE_INTERVAL);
}

// Function to attempt reconnection with Claude Desktop
function attemptReconnect() {
  // Clear any existing reconnect timeout
  if (reconnectAttemptTimeout) {
    clearTimeout(reconnectAttemptTimeout);
    reconnectAttemptTimeout = null;
  }
  
  // If we have a cached initialize response and client stdin is closed
  if (lastInitializeResponse && clientStdinClosed && !isShuttingDown) {
    debug('Attempting to reconnect with Claude Desktop');
    
    // Send the cached initialize response again
    try {
      // Safely write to stdout, catching any EPIPE errors
      try {
        process.stdout.write(lastInitializeResponse + '\n');
      } catch (err) {
        if (err.code === 'EPIPE') {
          // EPIPE means the other end of the pipe is closed
          debug('EPIPE error when trying to write initialize response - output stream is closed');
        } else {
          // Re-throw other errors
          throw err;
        }
      }
    } catch (err) {
      debug(`Error sending initialize response: ${err.message}`);
    }
    
    // If we have a cached listTools response, send that too after a short delay
    if (lastToolsResponse) {
      setTimeout(() => {
        debug('Sending cached listTools response');
        try {
          // Safely write to stdout, catching any EPIPE errors
          try {
            process.stdout.write(lastToolsResponse + '\n');
          } catch (err) {
            if (err.code === 'EPIPE') {
              // EPIPE means the other end of the pipe is closed
              debug('EPIPE error when trying to write tools response - output stream is closed');
            } else {
              // Re-throw other errors
              throw err;
            }
          }
        } catch (err) {
          debug(`Error sending tools response: ${err.message}`);
        }
      }, 100);
    }
    
    // Set up keep-alive mechanism
    setupKeepAlive();
    
    // Schedule next reconnect attempt
    reconnectAttemptTimeout = setTimeout(attemptReconnect, 30000); // Try again in 30 seconds
  }
}

// Start the server initially
startServer();

// Handle stdin (from client) and forward to server
const stdinRl = createInterface({
  input: process.stdin,
  terminal: false
});

stdinRl.on('line', (line) => {
  try {
    // Update last activity time
    lastActivityTime = Date.now();
    resetInactivityTimeout();
    
    // Reset client stdin closed flag since we're receiving data
    if (clientStdinClosed) {
      log('Client reconnected (received stdin data)');
      clientStdinClosed = false;
      
      // Clear reconnect attempt timeout if it exists
      if (reconnectAttemptTimeout) {
        clearTimeout(reconnectAttemptTimeout);
        reconnectAttemptTimeout = null;
      }
    }
    
    // Skip empty lines
    if (!line.trim()) {
      return;
    }
    
    // Try to parse as JSON to validate
    try {
      const parsed = JSON.parse(line);
      
      // Only forward valid JSON-RPC messages
      if (parsed && typeof parsed === 'object' && parsed.jsonrpc === '2.0') {
        debug(`Forwarded client request: ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
        
        // Check for Claude Desktop client info
        if (parsed.method === 'initialize' && 
            parsed.params?.clientInfo?.name === 'claude-ai') {
          log('Detected Claude Desktop client, enabling Claude Desktop mode');
          claudeDesktopMode = true;
        }
        
        // Special handling for initialize requests if we have a cached response
        if (parsed.method === 'initialize' && lastInitializeResponse && !isShuttingDown) {
          debug('Detected initialize request with cached response available');
          
          // If this is a reconnect and we have a cached response that's less than 30 seconds old
          if (Date.now() - lastInitializeTime < 30000) {
            // Still send the request to the server to maintain state
            if (serverProcess && serverProcess.stdin.writable) {
              serverProcess.stdin.write(line + '\n');
            }
            
            // Also immediately respond with the cached response to prevent client timeout
            debug('Sending cached initialize response');
            try {
              // Safely write to stdout, catching any EPIPE errors
              try {
                process.stdout.write(lastInitializeResponse + '\n');
              } catch (err) {
                if (err.code === 'EPIPE') {
                  // EPIPE means the other end of the pipe is closed
                  debug('EPIPE error when trying to write initialize response - output stream is closed');
                } else {
                  // Re-throw other errors
                  throw err;
                }
              }
            } catch (err) {
              debug(`Error sending initialize response: ${err.message}`);
            }
            
            // In Claude Desktop mode, also send cached listTools response
            if (claudeDesktopMode && lastToolsResponse) {
              // Create a new listTools request with the next ID
              const listToolsRequest = {
                jsonrpc: '2.0',
                method: 'listTools',
                id: parsed.id + 1
              };
              
              // Send listTools request to server to maintain state
              if (serverProcess && serverProcess.stdin.writable) {
                serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
              }
              
              // Also immediately respond with cached listTools response
              // But update the ID to match the new request
              try {
                const toolsResponse = JSON.parse(lastToolsResponse);
                toolsResponse.id = parsed.id + 1;
                debug('Sending cached listTools response with updated ID');
                try {
                  // Safely write to stdout, catching any EPIPE errors
                  try {
                    process.stdout.write(JSON.stringify(toolsResponse) + '\n');
                  } catch (err) {
                    if (err.code === 'EPIPE') {
                      // EPIPE means the other end of the pipe is closed
                      debug('EPIPE error when trying to write tools response - output stream is closed');
                    } else {
                      // Re-throw other errors
                      throw err;
                    }
                  }
                } catch (err) {
                  debug(`Error sending tools response: ${err.message}`);
                }
              } catch (err) {
                debug(`Error updating cached listTools response ID: ${err.message}`);
              }
            }
            
            return;
          } else {
            debug('Cached initialize response is too old, forwarding to server');
          }
        }
        
        // Special handling for listTools requests if we have a cached response
        if (parsed.method === 'listTools' && lastToolsResponse && !isShuttingDown) {
          debug('Detected listTools request with cached response available');
          
          // Update the ID in the cached response to match the request
          try {
            const toolsResponse = JSON.parse(lastToolsResponse);
            toolsResponse.id = parsed.id;
            
            // Still send the request to the server to maintain state
            if (serverProcess && serverProcess.stdin.writable) {
              serverProcess.stdin.write(line + '\n');
            }
            
            // Also immediately respond with the cached response
            debug('Sending cached listTools response with updated ID');
            try {
              // Safely write to stdout, catching any EPIPE errors
              try {
                process.stdout.write(JSON.stringify(toolsResponse) + '\n');
              } catch (err) {
                if (err.code === 'EPIPE') {
                  // EPIPE means the other end of the pipe is closed
                  debug('EPIPE error when trying to write tools response - output stream is closed');
                } else {
                  // Re-throw other errors
                  throw err;
                }
              }
            } catch (err) {
              debug(`Error sending tools response: ${err.message}`);
            }
            return;
          } catch (err) {
            debug(`Error updating cached listTools response ID: ${err.message}`);
          }
        }
        
        // Store request if it has an ID (for potential resending)
        if (parsed.id !== undefined) {
          pendingRequests.set(parsed.id, line);
        }
        
        // Make sure we have a server process to send to
        if (serverProcess && serverProcess.stdin.writable) {
          serverProcess.stdin.write(line + '\n');
        } else {
          log('Server process not available, starting new one...');
          startServer();
          // Queue the message to be sent after a short delay
          setTimeout(() => {
            if (serverProcess && serverProcess.stdin.writable) {
              serverProcess.stdin.write(line + '\n');
            } else {
              log('Failed to send message to server process');
            }
          }, 500);
        }
      } else {
        // Not a valid JSON-RPC message, log warning
        process.stderr.write(`[direct-wrapper:warning] Received non-JSON-RPC message from client: ${line}\n`);
      }
    } catch (err) {
      // Not valid JSON, log warning
      process.stderr.write(`[direct-wrapper:warning] Received non-JSON input from client: ${line}\n`);
    }
  } catch (err) {
    // Error processing line
    process.stderr.write(`[direct-wrapper:error] Error processing stdin line: ${err.message}\n`);
  }
});

// Handle process signals
process.on('SIGINT', () => {
  log('Received SIGINT');
  
  // If we're in the signal ignore period after initialize, don't forward
  if (ignoreSignalsTimeout) {
    log('Ignoring SIGINT during post-initialize grace period');
    return;
  }
  
  log('Forwarding SIGINT to server');
  isShuttingDown = true;
  pendingRequests.clear(); // Clear pending requests on shutdown
  
  // Clear all timeouts and intervals
  clearAllTimeouts();
  
  if (serverProcess) {
    serverProcess.kill('SIGINT');
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  
  // If we're in the signal ignore period after initialize, don't forward
  if (ignoreSignalsTimeout) {
    log('Ignoring SIGTERM during post-initialize grace period');
    return;
  }
  
  // In Claude Desktop mode, if we have a recent initialize response, ignore SIGTERM
  if (claudeDesktopMode && lastInitializeResponse && 
      (Date.now() - lastInitializeTime < 10000)) {
    log('Claude Desktop mode: Ignoring SIGTERM after recent initialize (expected disconnect pattern)');
    return;
  }
  
  log('Forwarding SIGTERM to server');
  isShuttingDown = true;
  pendingRequests.clear(); // Clear pending requests on shutdown
  
  // Clear all timeouts and intervals
  clearAllTimeouts();
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  } else {
    process.exit(0);
  }
});

// Handle stdin closing (client disconnected)
process.stdin.on('end', () => {
  log('Client stdin closed, but keeping wrapper alive for potential reconnects');
  clientStdinClosed = true;
  
  // In Claude Desktop mode, this is expected after initialize
  if (claudeDesktopMode && lastInitializeResponse && 
      (Date.now() - lastInitializeTime < 10000)) {
    log('Claude Desktop mode: Expected disconnect after initialize, waiting for reconnect');
  }
  
  // Start reconnect attempts
  attemptReconnect();
});

// Keep the process alive even if stdin closes
process.stdin.resume();

// Log that we're ready
log('Direct wrapper initialized and ready');
