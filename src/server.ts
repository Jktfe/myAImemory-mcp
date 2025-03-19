import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { createMcpServer } from './mcpServer.js';

async function main() {
  const port = process.env.PORT || 3000;
  const app = express();
  
  try {
    // Create MCP server
    const server = await createMcpServer();
    
    // Store active transports
    const activeTransports = new Map<string, SSEServerTransport>();
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });
    
    // SSE endpoint
    app.get('/sse', async (req, res) => {
      try {
        const id = Date.now().toString();
        const transport = new SSEServerTransport('/messages', res);
        
        activeTransports.set(id, transport);
        
        // Set headers for SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Handle client disconnect
        req.on('close', () => {
          activeTransports.delete(id);
          console.error(`Client disconnected: ${id}`);
        });
        
        console.error(`New SSE connection: ${id}`);
        await server.connect(transport);
      } catch (error) {
        console.error('Error handling SSE connection:', error);
        if (!res.headersSent) {
          res.status(500).end('Internal Server Error');
        }
      }
    });
    
    // Message endpoint
    app.post('/messages', express.json(), (req, res) => {
      try {
        // Get the last transport - in a production app, you'd want to maintain sessions
        const lastTransportId = Array.from(activeTransports.keys()).pop();
        
        if (!lastTransportId) {
          res.status(400).json({ error: 'No active connections' });
          return;
        }
        
        const transport = activeTransports.get(lastTransportId);
        if (!transport) {
          res.status(400).json({ error: 'Transport not found' });
          return;
        }
        
        transport.handlePostMessage(req, res).catch((error: Error) => {
          console.error('Error handling message:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
          }
        });
      } catch (error) {
        console.error('Error processing message:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    });
    
    // Simple home page
    app.get('/', (req, res) => {
      res.send(`
        <html>
          <head>
            <title>myAI Memory Sync</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
              h1 { color: #333; }
              p { line-height: 1.6; }
              pre { background: #f5f5f5; padding: 10px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <h1>myAI Memory Sync</h1>
            <p>This HTTP server provides the following MCP tools:</p>
            <ul>
              <li><strong>get_template</strong> - Get the full template</li>
              <li><strong>get_section</strong> - Get a specific section of the template</li>
              <li><strong>update_section</strong> - Update a section in the template</li>
              <li><strong>update_template</strong> - Update the entire template</li>
              <li><strong>list_presets</strong> - List available template presets</li>
              <li><strong>load_preset</strong> - Load a template preset</li>
              <li><strong>create_preset</strong> - Create a new preset from current template</li>
              <li><strong>sync_platforms</strong> - Sync template to platform(s)</li>
              <li><strong>list_platforms</strong> - List configured platforms</li>
              <li><strong>remember</strong> - Process natural language memory command</li>
            </ul>
            <p>This server is running with HTTP SSE transport. Connect to /sse for the SSE endpoint and post messages to /messages.</p>
          </body>
        </html>
      `);
    });
    
    // Start the server
    app.listen(port, () => {
      console.error(`myAI Memory Sync HTTP server is running on port ${port}`);
    });
  } catch (error) {
    console.error(`Error starting HTTP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };