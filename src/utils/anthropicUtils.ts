import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { promises as fs } from 'fs';
import path from 'path';
import { homedir } from 'os';

// Interface for cached prompt response
interface CachedResponse {
  timestamp: number;
  response: any;
}

// Cache configuration
interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  cachePath: string; // Path to store cache
}

/**
 * Default cache configuration
 */
const defaultCacheConfig: CacheConfig = {
  enabled: true,
  ttl: 3600000, // 1 hour
  cachePath: path.join(homedir(), '.cache', 'myai-memory-sync', 'prompt-cache')
};

/**
 * Initialize the Anthropic client
 */
export function createAnthropicClient(): Anthropic {
  // Check if the Anthropic feature is enabled
  if (!config.anthropic.enabled) {
    throw new Error('Anthropic API integration is not enabled. Set ENABLE_ANTHROPIC=true in your .env file');
  }
  
  const apiKey = process.env.ANTHROPIC_API_KEY || config.anthropic.apiKey;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set in environment variables or config');
    throw new Error('ANTHROPIC_API_KEY is required for Claude API calls');
  }
  
  return new Anthropic({
    apiKey
  });
}

/**
 * Get cache configuration
 */
export function getCacheConfig(): CacheConfig {
  const userConfig = config.anthropic?.cache || {};
  
  return {
    ...defaultCacheConfig,
    ...userConfig
  };
}

/**
 * Generate a cache key from prompt
 */
export function generateCacheKey(messages: any[], model: string, system?: string): string {
  // Create a string representation of messages, model, and system prompt
  const dataString = JSON.stringify({ messages, model, system });
  
  // Check if this is a memory-related query (to potentially use different caching rules)
  const isMemoryQuery = detectMemoryQuery(messages, system || '');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add a prefix to distinguish memory queries (for potential future enhancements)
  const prefix = isMemoryQuery ? 'memory_' : '';
  return `${prefix}${model}_${Math.abs(hash).toString(16)}`;
}

/**
 * Detect if a query is related to memory content
 * This helps identify queries that can be cached for longer periods
 */
function detectMemoryQuery(messages: any[], systemPrompt: string): boolean {
  // Convert all content to lowercase for case-insensitive matching
  const allContent = [
    systemPrompt,
    ...messages.map(m => typeof m.content === 'string' ? m.content.toLowerCase() : '')
  ].join(' ').toLowerCase();
  
  // Keywords that suggest this is a memory-related query
  const memoryKeywords = [
    'myai memory',
    'claude.md',
    'master.md',
    'user information',
    'preferences',
    'my memory',
    'i previously told you',
    'remember that i',
    'my profile',
    'as mentioned in my profile',
    'user profile',
    'personal information'
  ];
  
  // Check if any memory keywords are present
  return memoryKeywords.some(keyword => allContent.includes(keyword));
}

/**
 * Ensure cache directory exists
 */
async function ensureCacheDirectory(cachePath: string): Promise<void> {
  try {
    await fs.mkdir(cachePath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create cache directory: ${error}`);
    throw error;
  }
}

/**
 * Save response to cache
 */
export async function saveToCache(
  cacheKey: string, 
  response: any,
  cacheConfig?: Partial<CacheConfig>
): Promise<void> {
  const config = { ...getCacheConfig(), ...cacheConfig };
  
  if (!config.enabled) return;
  
  try {
    await ensureCacheDirectory(config.cachePath);
    
    const cachePath = path.join(config.cachePath, `${cacheKey}.json`);
    const cacheData: CachedResponse = {
      timestamp: Date.now(),
      response
    };
    
    await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Failed to save to cache: ${error}`);
    // Don't throw error for cache failures
  }
}

/**
 * Get response from cache
 */
export async function getFromCache(
  cacheKey: string,
  cacheConfig?: Partial<CacheConfig>
): Promise<any | null> {
  const config = { ...getCacheConfig(), ...cacheConfig };
  
  if (!config.enabled) return null;
  
  try {
    const cachePath = path.join(config.cachePath, `${cacheKey}.json`);
    
    try {
      await fs.access(cachePath);
    } catch {
      // Cache file doesn't exist
      return null;
    }
    
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    const cacheData: CachedResponse = JSON.parse(cacheContent);
    
    // Use different expiration rules for memory-related queries
    const isMemoryQuery = cacheKey.startsWith('memory_');
    
    // For memory queries, use a much longer TTL or never expire
    const effectiveTtl = isMemoryQuery ? 
      // One year (essentially permanent) for memory queries
      31536000000 : 
      // Regular TTL for other queries
      config.ttl;
    
    // Check if cache is expired
    const now = Date.now();
    if (now - cacheData.timestamp > effectiveTtl) {
      // Cache expired
      return null;
    }
    
    return cacheData.response;
  } catch (error) {
    console.error(`Failed to read from cache: ${error}`);
    return null;
  }
}

/**
 * Send a message to Claude with caching
 */
export async function sendMessageWithCache(
  messages: any[], 
  options: {
    model?: string;
    cacheConfig?: Partial<CacheConfig>;
    anthropicOptions?: any;
    system?: string;
  } = {}
): Promise<any> {
  const model = options.model || 'claude-3-haiku-20240307';
  const cacheConfig = options.cacheConfig || {};
  const anthropicOptions = options.anthropicOptions || {};
  const systemPrompt = options.system || '';
  
  // Generate a cache key for this request
  const cacheKey = generateCacheKey(messages, model, systemPrompt);
  
  // Only try to use cache if it's enabled
  if (cacheConfig.enabled) {
    const cachedResponse = await getFromCache(cacheKey, cacheConfig);
    
    if (cachedResponse) {
      console.log(`Using cached response for prompt: ${cacheKey}`);
      // Add a flag to indicate this response came from cache
      return {
        ...cachedResponse,
        fromCache: true
      };
    }
  }
  
  // No cache hit or caching disabled, call the API
  try {
    const anthropic = createAnthropicClient();
    
    // Claude-3 requires user and assistant messages only in the messages array
    // System messages are passed as a top-level system parameter
    const filteredMessages = messages.filter(msg => msg.role !== 'system');
    
    const response = await anthropic.messages.create({
      model,
      messages: filteredMessages,
      system: systemPrompt,
      ...anthropicOptions
    });
    
    // Only save to cache if it's enabled
    if (cacheConfig.enabled) {
      await saveToCache(cacheKey, response, cacheConfig);
      console.log(`Saved response to cache with key: ${cacheKey}`);
    }
    
    return {
      ...response,
      fromCache: false
    };
  } catch (error) {
    console.error(`Error sending message to Claude: ${error}`);
    throw error;
  }
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(
  cacheKey: string,
  cacheConfig?: Partial<CacheConfig>
): Promise<void> {
  const config = { ...getCacheConfig(), ...cacheConfig };
  
  if (!config.enabled) return;
  
  try {
    const cachePath = path.join(config.cachePath, `${cacheKey}.json`);
    
    try {
      await fs.access(cachePath);
      await fs.unlink(cachePath);
    } catch {
      // Cache file doesn't exist, nothing to do
    }
  } catch (error) {
    console.error(`Failed to invalidate cache: ${error}`);
    // Don't throw error for cache failures
  }
}

/**
 * Clear all cache entries
 */
export async function clearAllCache(cacheConfig?: Partial<CacheConfig>): Promise<void> {
  const config = { ...getCacheConfig(), ...cacheConfig };
  
  if (!config.enabled) return;
  
  try {
    const cachePath = config.cachePath;
    
    try {
      await fs.access(cachePath);
      
      // Get all files in the cache directory
      const files = await fs.readdir(cachePath);
      
      // Delete each file
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(cachePath, file));
        }
      }
    } catch (error) {
      // Cache directory doesn't exist, nothing to do
      console.error(`Error clearing cache: ${error}`);
    }
  } catch (error) {
    console.error(`Failed to clear cache: ${error}`);
    // Don't throw error for cache failures
  }
}