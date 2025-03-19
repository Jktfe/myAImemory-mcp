import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import * as fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import {
  generateCacheKey,
  getFromCache,
  saveToCache,
  sendMessageWithCache,
  clearAllCache
} from '../src/utils/anthropicUtils.js';

// Mock the Anthropic client
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          id: 'msg_mock',
          content: [{ text: 'Mocked response', type: 'text' }],
          model: 'claude-3-haiku-20240307',
          role: 'assistant'
        })
      }
    }))
  };
});

describe('Anthropic Prompt Caching', () => {
  const testCachePath = path.join(homedir(), '.cache', 'myai-memory-sync-test', 'prompt-cache');
  const testCacheConfig = {
    enabled: true,
    ttl: 3600000,
    cachePath: testCachePath
  };
  
  // Cleanup before and after tests
  beforeAll(async () => {
    if (fs.existsSync(testCachePath)) {
      await fs.promises.rm(testCachePath, { recursive: true, force: true });
    }
    await fs.promises.mkdir(testCachePath, { recursive: true });
  });
  
  afterAll(async () => {
    if (fs.existsSync(testCachePath)) {
      await fs.promises.rm(testCachePath, { recursive: true, force: true });
    }
  });
  
  test('generateCacheKey should create consistent hash for same inputs', () => {
    const messages = [
      { role: 'user', content: 'Hello, Claude!' }
    ];
    const model = 'claude-3-haiku-20240307';
    
    const key1 = generateCacheKey(messages, model);
    const key2 = generateCacheKey(messages, model);
    
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).toEqual(key2);
    
    // Different message should create different key
    const differentMessages = [
      { role: 'user', content: 'Different message' }
    ];
    const key3 = generateCacheKey(differentMessages, model);
    expect(key3).not.toEqual(key1);
    
    // Different model should create different key
    const key4 = generateCacheKey(messages, 'claude-3-opus-20240229');
    expect(key4).not.toEqual(key1);
  });
  
  test('cache operations should work', async () => {
    const cacheKey = 'test_key';
    const testResponse = { content: 'Test response' };
    
    // Save to cache
    await saveToCache(cacheKey, testResponse, testCacheConfig);
    
    // Get from cache
    const cachedResponse = await getFromCache(cacheKey, testCacheConfig);
    
    expect(cachedResponse).toEqual(testResponse);
    
    // Clear cache
    await clearAllCache(testCacheConfig);
    
    // Cache should be empty
    const emptyCachedResponse = await getFromCache(cacheKey, testCacheConfig);
    expect(emptyCachedResponse).toBeNull();
  });
  
  test('sendMessageWithCache should use cache for repeated calls', async () => {
    // Set environment variable temporarily for test
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    
    const messages = [
      { role: 'user', content: 'Test message for caching' }
    ];
    
    // First call should hit the API
    const response1 = await sendMessageWithCache(messages, {
      cacheConfig: testCacheConfig
    });
    
    expect(response1).toBeDefined();
    expect(response1.content[0].text).toEqual('Mocked response');
    
    // Second call with the same messages should use cache
    const response2 = await sendMessageWithCache(messages, {
      cacheConfig: testCacheConfig
    });
    
    expect(response2).toBeDefined();
    expect(response2).toEqual(response1);
    
    // Clear the cache
    await clearAllCache(testCacheConfig);
    
    // Restore environment
    delete process.env.ANTHROPIC_API_KEY;
  });
});