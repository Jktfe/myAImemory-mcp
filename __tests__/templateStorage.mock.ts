// Mock the templateStorage's direct dependencies
import path from 'path';

// Mock __dirname for ESM modules
export const __dirname = '/mock_dir';

// Sample template markdown for testing
export const sampleTemplate = `# myAI Memory

# User Information
## Use this information if you need to reference them directly
-~- Name: Test User
-~- Location: Test Location

# General Response Style
## Use this in every response
-~- Style: Test Style
`;