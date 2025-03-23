/**
 * Test script to update a template section and trigger sync
 */
import fetch from 'node-fetch';

async function testSync() {
  try {
    console.log('Testing template sync with HTTP server...');
    
    // Get the current template
    const getResponse = await fetch('http://localhost:3030/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_template'
        },
        id: 1
      })
    });
    
    const getResult = await getResponse.json();
    console.log('Current template retrieved successfully');
    
    // Update a section
    const updateResponse = await fetch('http://localhost:3030/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'update_section',
          arguments: {
            sectionName: 'User Information',
            content: 'I work at New Model VC as a partner, my favorite tools are Svelte 5 and Neon DB'
          }
        },
        id: 2
      })
    });
    
    const updateResult = await updateResponse.json();
    console.log('Update result:', updateResult);
    
    // Wait a moment for sync to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Manually trigger sync for all platforms
    const syncResponse = await fetch('http://localhost:3030/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'sync_platforms'
        },
        id: 3
      })
    });
    
    const syncResult = await syncResponse.json();
    console.log('Sync result:', syncResult);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSync();