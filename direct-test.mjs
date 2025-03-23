#!/usr/bin/env node

/**
 * Direct test script for the template service
 *
 * This script tests the natural language parsing functionality.
 */

import { templateService } from './dist/services/templateService.js';

async function main() {
  try {
    console.log('Starting template service test...');
    
    // Initialize the service
    await templateService.initialize();
    console.log('Template service initialized');
    
    // Get current template
    const template = templateService.getTemplate();
    console.log('Current template sections:', template.sections.map(s => s.title));
    
    // Test updating a section with natural language
    const testContent = 'I work at and founded New Model VC, I have 2 cars, a Plug in Hybrid Discovery Sport and a ID.5 Pro Style';
    console.log(`\nUpdating User Information section with: "${testContent}"`);
    
    const success = await templateService.updateSection('User Information', testContent);
    console.log('Update success:', success);
    
    // Check the updated template
    const updatedTemplate = templateService.getTemplate();
    console.log('\nUpdated User Information section:');
    const userSection = updatedTemplate.sections.find(s => s.title === 'User Information');
    
    if (userSection) {
      console.log('Items:');
      userSection.items.forEach(item => {
        console.log(`- ${item.key}: ${item.value}`);
      });
    } else {
      console.log('User Information section not found!');
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error(`Error: ${error}`);
  }
}

main();
