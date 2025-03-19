import { sendMessageWithCache } from './anthropicUtils.js';
import { config } from '../config.js';

/**
 * Interface for message objects in the format that Claude expects
 */
export interface MessageContent {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Simple service to demonstrate Claude API calls with prompt caching
 */
export class AnthropicService {
  /**
   * Send a message to Claude with prompt caching
   */
  async sendMessage(
    messages: MessageContent[],
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      disableCache?: boolean;
    } = {}
  ) {
    try {
      // Check if Anthropic integration is enabled
      if (!config.anthropic.enabled) {
        return {
          success: false,
          error: 'Anthropic API integration is not enabled. Set ENABLE_ANTHROPIC=true in your .env file'
        };
      }
      
      const model = options.model || config.anthropic.defaultModel;
      
      // Determine if caching should be used
      const useCache = !options.disableCache && config.anthropic.cache.enabled;
      const cacheConfig = {
        ...config.anthropic.cache,
        enabled: useCache
      };
      
      if (useCache) {
        console.log('Prompt caching is enabled for this request');
      } else {
        console.log('Prompt caching is disabled for this request');
      }
      
      const anthropicOptions = {
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature !== undefined ? options.temperature : 0.7
      };
      
      const response = await sendMessageWithCache(
        messages, 
        {
          model,
          cacheConfig,
          anthropicOptions
        }
      );
      
      return {
        success: true,
        content: response.content,
        model: response.model,
        id: response.id,
        fromCache: useCache && response.fromCache === true
      };
    } catch (error) {
      console.error(`Error sending message to Anthropic API: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Simple wrapper for single-message queries to Claude
   */
  async askQuestion(
    question: string,
    systemPrompt?: string,
    options: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      disableCache?: boolean;
    } = {}
  ) {
    const messages: MessageContent[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: question
    });
    
    return this.sendMessage(messages, options);
  }
}

// Export a singleton instance
export const anthropicService = new AnthropicService();