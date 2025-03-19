// Direct test for template updating with natural language
import { templateService } from './dist/services/templateService.js';

async function main() {
  try {
    console.log('Starting direct test for template update...');
    
    // Initialize the template service
    await templateService.initialize();
    console.log('Template service initialized');
    
    // Update the template with natural language
    const testContent = 'I work at and founded New Model VC, I have 2 cars, a Plug in Hybrid Discovery Sport and a ID.5 Pro Style';
    console.log(`\nUpdating template with: "${testContent}"`);
    
    // Use the User Information section
    const sectionName = 'User Information';
    const success = await templateService.updateSection(sectionName, testContent);
    
    console.log(`Update success: ${success}`);
    
    // Verify the template was updated
    const template = templateService.getTemplate();
    console.log('\nTemplate after update:');
    for (const section of template.sections) {
      console.log(`\nSection: ${section.title}`);
      if (section.description) {
        console.log(`Description: ${section.description}`);
      }
      console.log('Items:');
      for (const item of section.items) {
        console.log(`- ${item.key}: ${item.value}`);
      }
    }
    
    console.log('\nTest completed!');
  } catch (error) {
    console.error('Error in test:', error);
  }
}

main();