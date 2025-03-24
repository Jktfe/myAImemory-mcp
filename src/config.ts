import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');

// Default configuration
const defaultConfig = {
  // Claude Web credentials
  claudeWeb: {
    email: process.env.MY_EMAIL || ''
  },
  // Puppeteer configuration
  puppeteer: {
    headless: false,
    slowMo: 50,
    defaultTimeout: 30000
  },
  // Anthropic API configuration
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    defaultModel: 'claude-3-haiku-20240307',
    enabled: process.env.ENABLE_ANTHROPIC === 'true', // Optional feature flag
    cache: {
      enabled: process.env.ENABLE_PROMPT_CACHE === 'true', // Defaults to disabled unless explicitly enabled
      ttl: 31536000000, // 1 year cache time to live - effectively permanent for memory content
      cachePath: path.join(os.homedir(), '.cache', 'myai-memory-sync', 'prompt-cache')
    }
  },
  // Service implementation configuration
  services: {
    implementationType: process.env.IMPLEMENTATION_TYPE || 'custom', // 'legacy' or 'custom'
  },
  // File paths
  paths: {
    masterTemplate: path.join(__dirname, '..', 'myAI Master.md'),
    claudeMdPath: path.join(os.homedir(), 'CLAUDE.md'),
    claudeProjectsPath: path.join(os.homedir(), 'CascadeProjects'),
    windsurfMemoryPath: path.join(os.homedir(), '.codeium', 'windsurf', 'memories', 'global_rules.md')
  },
  // Sync interval in milliseconds (default: 1 hour)
  syncInterval: 3600000
};

// Try to load configuration from file, use defaults for missing values
let loadedConfig = {};
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const configFileContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
    loadedConfig = JSON.parse(configFileContent);
  }
} catch (err) {
  console.warn('Failed to load config:', err);
}

// Merge loaded config with defaults
export const config = {
  ...defaultConfig,
  ...loadedConfig,
  // Ensure nested properties are merged properly
  claudeWeb: {
    ...defaultConfig.claudeWeb,
    ...(loadedConfig as any).claudeWeb
  },
  puppeteer: {
    ...defaultConfig.puppeteer,
    ...(loadedConfig as any).puppeteer
  },
  anthropic: {
    ...defaultConfig.anthropic,
    ...(loadedConfig as any).anthropic,
    cache: {
      ...defaultConfig.anthropic.cache,
      ...((loadedConfig as any).anthropic || {}).cache
    }
  },
  services: {
    ...defaultConfig.services,
    ...(loadedConfig as any).services
  },
  paths: {
    ...defaultConfig.paths,
    ...(loadedConfig as any).paths
  }
};

// Environment variables take precedence over config file
if (process.env.MY_EMAIL) {
  config.claudeWeb.email = process.env.MY_EMAIL;
}

if (process.env.ANTHROPIC_API_KEY) {
  config.anthropic.apiKey = process.env.ANTHROPIC_API_KEY;
}

if (process.env.IMPLEMENTATION_TYPE) {
  config.services.implementationType = process.env.IMPLEMENTATION_TYPE;
}

// Create a sample config file if it doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
  try {
    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          claudeWeb: {
            email: "YOUR_EMAIL" // Will be overridden by .env if present
          },
          puppeteer: {
            headless: false,
            slowMo: 50,
            defaultTimeout: 30000
          },
          anthropic: {
            apiKey: "YOUR_API_KEY", // Will be overridden by .env if present
            defaultModel: "claude-3-haiku-20240307",
            cache: {
              enabled: true,
              ttl: 3600000, // 1 hour
              cachePath: "~/.cache/myai-memory-sync/prompt-cache"
            }
          },
          services: {
            implementationType: "custom" // 'legacy' or 'custom'
          },
          paths: {
            masterTemplate: './myAI Master.md',
            claudeMdPath: '~/CLAUDE.md',
            claudeProjectsPath: '~/CascadeProjects',
            windsurfMemoryPath: '~/.codeium/windsurf/memories/global_rules.md'
          },
          syncInterval: 3600000
        },
        null,
        2
      ),
      'utf-8'
    );
    console.log('Created sample config.json file');
  } catch (err) {
    console.warn('Failed to create sample config file:', err);
  }
}