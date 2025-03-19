# myAI Memory Example Scripts

This directory contains example scripts that demonstrate how to use the myAI Memory system with different features.

## Available Examples

### 1. Prompt Caching Demo
```bash
node examples/promptCaching.js
```

Demonstrates how the Anthropic API prompt caching works, showing significant performance improvements for repeated queries.

### 2. Clear Cache Utility
```bash
node examples/clearCache.js
```

A simple utility to clear all cached Claude API responses.

### 3. Memory Update Example
```bash
node examples/memoryUpdateExample.js
```

Shows how to update your memory with specific information like education details, with the benefit of caching for performance.

### 4. Interactive Memory Query Demo 
```bash
node examples/useMyAIMemory.js
```

An interactive demo that shows how "use myAI memory" loads the full template and caches sections for faster interactions.

## How "use myAI Memory" Works With Caching

When you say "use myAI Memory" in a conversation with Claude:

1. The full master template content is loaded (with caching for speed)
2. Individual sections are also cached for fast access
3. Claude can access your memory instantly without delay
4. When you update your memory, all platforms are synced
5. The cache is automatically updated after sync
6. Future memory accesses use the updated cache

This gives you:
- Much faster responses when accessing your memory
- Consistent memory across all platforms
- Real-time updates when you change your memory

## Requirements

To run these examples with the Anthropic API features:

1. Set your Anthropic API key in the `.env` file or environment:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

2. Enable the Anthropic API integration:
   ```
   ENABLE_ANTHROPIC=true
   ```

3. Optionally enable prompt caching:
   ```
   ENABLE_PROMPT_CACHE=true
   ```

The examples will temporarily enable these features for the demo if not already enabled.