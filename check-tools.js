import http from 'http';

async function listTools() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/mcp/listTools',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('Registered tools:');
        if (response && response.result && response.result.tools) {
          response.result.tools.forEach(tool => {
            console.log(`- ${tool.name}`);
          });
        } else {
          console.log('No tools found in response.');
        }
      } catch (e) {
        console.error('Error parsing response:', e);
        console.log('Raw response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error making request:', error);
  });
  
  req.write(JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'listTools' }));
  req.end();
}

listTools();