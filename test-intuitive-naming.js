// Test script to verify the intuitive naming of myAImemory tools
import fetch from 'node-fetch';

async function testMCPTools() {
  try {
    // Test myai_store tool (previously update_section)
    const response = await fetch('http://localhost:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'myai_store',
          arguments: {
            sectionName: 'preferences',
            content: 'This is a test content to store my favourite rugby team as Leicester Tigers'
          }
        },
        id: 1
      })
    });

    const result = await response.json();
    console.log('Result from myai_store tool:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing MCP tools:', error);
  }
}

// Run the test
testMCPTools();
