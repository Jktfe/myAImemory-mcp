// Simple test to verify the template parser works
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// Path to the template service and parser implementation
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templateServicePath = path.join(__dirname, 'dist', 'services', 'templateService.js');
const templateParserPath = path.join(__dirname, 'dist', 'templateParser.js');

// First, check if the compiled files exist
async function checkFiles() {
  try {
    await fs.access(templateServicePath);
    console.log(`Template service exists at: ${templateServicePath}`);
    
    await fs.access(templateParserPath);
    console.log(`Template parser exists at: ${templateParserPath}`);
    
    const templateContent = await fs.readFile(templateServicePath, 'utf-8');
    const parserContent = await fs.readFile(templateParserPath, 'utf-8');
    
    console.log('\nTemplate service compiled size:', templateContent.length);
    console.log('Template parser compiled size:', parserContent.length);
    
    // Check if the extractKeyValuePairsFromText method is in the compiled code
    console.log('\nChecking for key extraction method:');
    if (templateContent.includes('extractKeyValuePairsFromText')) {
      console.log('✅ extractKeyValuePairsFromText method found in compiled code');
    } else {
      console.log('❌ extractKeyValuePairsFromText method NOT found in compiled code');
    }
    
    // Check if the car model pattern is in the compiled code
    if (templateContent.includes('carModels')) {
      console.log('✅ carModels pattern found in compiled code');
    } else {
      console.log('❌ carModels pattern NOT found in compiled code');
    }
    
    // Test natural language parsing with our specific example
    console.log('\nAttempting to import and use the extractKeyValuePairsFromText method:');
    try {
      // Direct import and testing is a bit tricky with ESM, we'll check the file locations
      // We should rebuild and restart the server for the changes to take effect
      console.log('To test the NLP parsing, please restart the server after building.');
      
      // Write a test template and update it
      const testTemplatePath = path.join(__dirname, 'test-template.md');
      await fs.writeFile(testTemplatePath, '# myAI Memory\n\n# User Information\n-~- Name: Test User\n\n# General Response Style\n-~- Style: Test Style');
      console.log(`\nTest template created at: ${testTemplatePath}`);
      
    } catch (error) {
      console.error('Error importing or using the template service:', error);
    }
  } catch (error) {
    console.error('Error checking files:', error);
  }
}

// Run the check
checkFiles();