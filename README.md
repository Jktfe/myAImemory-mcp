# myAI Memory Sync

An MCP server that synchronizes a customizable memory template across Claude interfaces (Claude Desktop, Claude Code, Windsurf).

The concept is simple, rather than use a specific service, use an MCP that automatically updates ALL your Claude Desktop, Claude Code, Windsurf and other Claude interfaces with key memories without requiring you to manually update each interface, or even know the location of the files, and without needing to write / waste a message at the start of each new chat. Giving you a consistent memory across all your Claude interfaces and a truly personal experience. 

While more specific memory management is available, this is the most effective way to ensure a consistent memory across all your Claude interfaces.

[![smithery badge](https://smithery.ai/badge/@Jktfe/myaimemory-mcp)](https://smithery.ai/server/@Jktfe/myaimemory-mcp)

## Security Note

⚠️ **IMPORTANT**: CLAUDE.md files may contain personal information and should never be committed to version control. 

This tool automatically:
- Checks if CLAUDE.md is properly added to .gitignore in each project
- Adds CLAUDE.md to .gitignore if it's missing
- Ensures your personal information won't be accidentally exposed

For additional security:
- Make sure to verify CLAUDE.md appears in your .gitignore file in all projects
- Check existing repositories to ensure CLAUDE.md hasn't been committed previously 
- If you find CLAUDE.md in your Git history, consider using tools like BFG Repo-Cleaner or git-filter-repo to remove it

## Features

- Manage a standardized "myAI Memory" template with consistent formatting
- Support editing individual sections without affecting others
- Maintain the -~- prefix for preference items
- Synchronize template across multiple Claude interfaces automatically:
  - Claude Desktop (CLAUDE.md files)
  - Claude.ai web interface (via direct profile settings sync)
  - Windsurf (global_rules.md)
- Intelligent section detection for natural language updates
- Optimized performance with caching
- Support for preset profiles
- MCP-compliant server with both stdio and HTTP/SSE transport
- CLI for easy management of templates and presets

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/myai-memory-sync.git
cd myai-memory-sync

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### MCP Server

Start the direct MCP server with stdio transport (for use with Claude Desktop):

```bash
# Using the convenience script
./start-memory-sync.sh

# Or with the CLI directly
node --loader ts-node/esm src/cli.ts --stdio
```

Or start with HTTP transport for remote connections:

```bash
# Using the convenience script (default port 3000)
./start-http-server.sh

# Specify a custom port
./start-http-server.sh 8080

# Or with the CLI directly
node --loader ts-node/esm src/cli.ts --http
```

### Emergency Sync

If you need to fix synchronization issues across platforms:

```bash
# Using the convenience script
./emergency-sync.sh

# Or with the CLI directly
node --loader ts-node/esm src/cli.ts --emergency-sync
```

This will synchronize your template with:
- The home directory CLAUDE.md file
- All CLAUDE.md files in the configured projects directory
- The Windsurf global_rules.md file

## Template Format

The template follows a specific markdown format:

```markdown
# myAI Memory

# User Information
## Use this information if you need to reference them directly
-~- Name: Default User
-~- Location: Default Location

# General Response Style
## Use this in every response
-~- Style: Concise and friendly

# MCP
## File Access Instructions
-~- If a file is in .gitignore and you need to read it, ask for permission to use the filesystem MCP
-~- For API credentials or accessing services, use the serveMyAPI MCP by @Jktfe
```

Each section starts with a `# Section Title` and can have an optional description with `## Description`. Preferences are formatted as `-~- Key: Value`.

### Section Types

- **User Information**: Personal details, preferences, and other information about you.
- **General Response Style**: Instructions for how the AI should respond to you.
- **Coding Preferences**: Your preferred programming languages, frameworks, and coding style.
- **MCP**: Instructions for how the AI should use Model Context Protocol servers, particularly for file access and API handling.

The MCP section is particularly useful for instructing Claude and other LLMs on how to handle special file access cases, such as gitignored files, sensitive credentials, or large files that might be difficult to view with standard tools. This helps the AI make better decisions about when and how to request access to protected files.

## MCP Tools

The server exposes the following MCP tools:

### User-Friendly Commands

The simplest way to interact with myAI Memory is through natural language. Just tell Claude what you want to remember:

```
Use myAI Memory to remember I work at New Model VC.
```

```
Use myAI Memory to remember my wife's birthday is not the 27th of March.
```

```
Use myAI Memory to remember I prefer dark mode in my code editors.
```

You can also specify which section to add your memory to, even if that section doesn't exist yet:

```
Use myAI Memory to add to Travel Preferences I prefer window seats on flights.
```

```
Update my Food Preferences to include that I love spicy food.
```

These commands will be parsed and added to the appropriate sections of your memory template automatically.

### Natural Language Commands

You can use natural language commands to interact with myAI Memory Sync. We've included a convenient shell script:

```bash
# Remember something using natural language
./remember.sh "Use myAI Memory to remember I prefer dark mode in my code editors"
```

### "use myAI memory" Quick Access

When you say **"use myAI memory"** to Claude, the system:

1. Loads your entire memory template (with caching for speed if enabled)
2. Makes all your preferences instantly available to Claude
3. Pre-caches individual sections for even faster access
4. Handles section-specific queries intelligently

With prompt caching enabled (optional), subsequent memory queries are nearly instant, making interactions with your memory much more fluid and responsive.

### Supported Natural Language Commands

The following commands are supported:

```
Use myAI Memory to remember my wife's birthday is not the 27th of March.
```

```
Remember that my favourite color is blue.
```

```
Add to my memory that I'm allergic to peanuts.
```

```
Use myAI Memory to add to Coding Preferences I like to use Svelte 5 with TypeScript.
```

```
Update my coding preferences to include that I prefer 2-space indentation.
```

The system will automatically:
1. Categorize your content into the appropriate section based on keywords
2. Create new sections if you specify a section that doesn't exist yet
3. Format your content properly with the `-~-` prefix
4. Sync your updated memory to all configured platforms
5. Update the memory cache so future accesses use the latest information

### Using from the CLI

You can also use the CLI directly:

```bash
# Process a natural language memory command
node --loader ts-node/esm src/cli.ts --remember "Use myAI Memory to remember I prefer dark mode"
```

### Standard Tools

For more advanced operations, the following tools are available:

| Tool Name | Description |
|-----------|-------------|
| `get_template` | Get the full template |
| `get_section` | Get a specific section of the template |
| `update_section` | Update a section in the template |
| `update_template` | Update the entire template |
| `list_presets` | List available template presets |
| `load_preset` | Load a template preset |
| `create_preset` | Create a new preset from current template |
| `sync_platforms` | Sync template to platform(s) |
| `list_platforms` | List configured platforms (enabled/disabled) |
| `toggle_platform` | Enable or disable a specific platform |

### Example Usage

When talking to Claude, use any of these formats:

```
Use myAI Memory to remember I work at and founded New Model VC.
```

```
Use myAI Memory to remember I have two children: Fletcher and Viola.
```

For more specific updates, you can still use the traditional format:

```
Use myai-memory-sync__update_section with:
sectionName: "User Information"
content: "I work at New Model VC"
```

## Platform Support

### Claude.ai Web Interface

As of March, 2025, Claude.ai now offers a dedicated profile settings page where you can directly set your preferences. myAI Memory Sync automatically integrates with this new interface.

```bash
# Run a test sync with Claude.ai profile settings
./run-profile-sync.sh
```

This will:
1. Navigate to https://claude.ai/settings/profile
2. Log in if necessary (you may need to complete login manually)
3. Extract the myAI Memory section from your template
4. Update the preferences field with your memory template content
5. Save the changes

This ensures all your conversations on Claude.ai will have your consistent memory preferences without needing to paste them manually.

### Claude Desktop and Windsurf

For Claude Desktop and Windsurf, the synchronization works by updating the corresponding files:
- `~/CLAUDE.md` for Claude Desktop
- `~/.codeium/windsurf/memories/global_rules.md` for Windsurf

### Claude Code Projects

For Claude Code projects, the sync looks for and updates `CLAUDE.md` files in your project directories.

## Claude Desktop Integration

To add this MCP server to Claude Desktop:

1. Open Claude Desktop
2. Go to Settings > Developer
3. Under "MCP Servers", add a new server:
   ```json
   "myai-memory-sync": {
     "command": "/path/to/myai-memory-sync/direct-mcp-server.sh",
     "transport": "stdio"
   }
   ```

Replace `/path/to/myai-memory-sync` with the actual path to the repository.

### Platform Configuration

By default, the server will synchronize your memory with:
- Claude Code (via CLAUDE.md file)
- Windsurf (via global_rules.md file)

To enable Claude Web synchronization, set these environment variables:

```bash
export CLAUDE_WEB_SYNC_ENABLED=true
export CLAUDE_WEB_HEADLESS=true # Set to false for visible browser
export CLAUDE_WEB_EMAIL=your@email.com # Optional, for auto-login
```

You can also toggle platforms at runtime using the `toggle_platform` tool:

```
Use myai-memory-sync__toggle_platform with:
platform: "claude-web"
enabled: true
```

## Smithery Deployment

You can use the hosted version of this MCP server on smithery:

[![smithery badge](https://smithery.ai/badge/@Jktfe/myaimemory)](https://smithery.ai/server/@Jktfe/myaimemory)

To deploy this MCP server to smithery yourself:

1. Ensure all changes are committed to the repository
2. Build the project with `npm run build`
3. Push to the smithery repository:
   ```bash
   git push origin main
   ```

4. After deployment, update your MCP configuration to point to the smithery-hosted server or use the local version:
   ```json
   "myai-memory-sync": {
     "command": "node",
     "args": [
       "/path/to/myai-memory-sync/dist/direct-index.js"
     ],
     "transport": "stdio"
   }
   ```

## Platform Compatibility

Currently, myAI Memory Sync works with:

- Claude Desktop (macOS, Windows)
- Claude Web Interface (via browser extensions)
- Windsurf (via MCP integration)

The server itself is platform-agnostic and can run on any system that supports Node.js, but some client integrations may be platform-specific.

## Collaboration Guidelines

If you'd like to contribute to this project, please follow these guidelines:

1. **Fork the repository** and create a feature branch for your changes
2. **Follow the existing code style** and naming conventions
3. **Add tests** for any new functionality
4. **Update documentation** to reflect your changes
5. **Submit a pull request** with a clear description of the changes and their purpose

For major changes, please open an issue first to discuss what you would like to change.

## Recent Improvements

We've recently added several improvements to myAI Memory Sync:

### Prompt Caching & Enhanced Memory Access

- **"use myAI memory" Quick Access**: The system now intelligently handles "use myAI memory" requests with pre-cached templates for near-instant access to your memory.

- **Anthropic API Integration (Optional)**: Added optional integration with the Anthropic API that enables prompt caching for significant performance improvements.

- **Section-Level Caching**: Individual memory sections are cached separately, allowing section-specific queries to be processed even faster.

- **Automatic Cache Updates**: When your memory is updated and synced to platforms, the cache is automatically refreshed to ensure you always get the latest information.

### Enhanced Synchronization and Error Handling

- **Emergency Sync Command**: Added a robust emergency sync command that can bypass the MCP server to directly synchronize templates across platforms. This is particularly useful for fixing synchronization issues or when the MCP server is not available.
  ```bash
  # Run emergency sync to update all platforms
  node --loader ts-node/esm src/cli.ts --emergency-sync
  ```

- **Improved Path Handling**: Updated file path resolution with the `expandTildePath` function to properly handle tilde (`~`) and environment variables in configuration paths.

- **Better File Permission Management**: Implemented the `ensureFileWritable` function to automatically detect and fix permission issues that could cause synchronization to fail.

- **Enhanced Logging**: Added detailed logging throughout the synchronization process to provide clearer feedback on successes and failures, making it easier for users to debug issues.

- **Robust Error Handling**: Improved error handling in all syncers (MasterSyncer, WindsurfSyncer, and ClaudeCodeSyncer) to provide more informative error messages and gracefully handle failures.

### New CLI Commands

The CLI has been updated with new commands for better management:

```bash
# Display help
node --loader ts-node/esm src/cli.ts --help

# Start HTTP server for SSE transport
node --loader ts-node/esm src/cli.ts --http

# Start stdio server for MCP transport
node --loader ts-node/esm src/cli.ts --stdio

# Enable debug mode for verbose logging
node --loader ts-node/esm src/cli.ts --debug

# Run emergency sync across all platforms
node --loader ts-node/esm src/cli.ts --emergency-sync
```

## Troubleshooting

If you encounter synchronization issues, try the following steps:

1. **Check File Permissions**: Ensure that CLAUDE.md files and the Windsurf global_rules.md file have write permissions.

2. **Run Emergency Sync**: Use the emergency sync command to fix permissions and update all platforms at once:
   ```bash
   node --loader ts-node/esm src/cli.ts --emergency-sync
   ```

3. **Check Logs**: Enable debug mode for more detailed logs:
   ```bash
   node --loader ts-node/esm src/cli.ts --debug --stdio
   ```

4. **Verify File Paths**: Make sure the configured paths in `config.json` point to the correct locations for your environment.

## Prompt Caching with Anthropic API (Optional)

myAI Memory now includes **optional** built-in prompt caching for Anthropic API calls, which can significantly reduce latency and API costs when making repeated or similar requests.

> ⚠️ **This feature is entirely optional** and disabled by default. You can safely use myAI Memory Sync without ever enabling the Anthropic API integration.

### How Prompt Caching Works

1. **Automatic caching**: When enabled, requests to the Anthropic API are cached based on message content and model.
2. **Time-based expiration**: Cached responses expire after a configurable time period (default: 1 hour).
3. **Disk-based storage**: Cached responses are stored on disk, persisting between server restarts.
4. **Completely optional**: Both the Anthropic API integration and the caching feature can be enabled/disabled independently.

### User Experience Benefits

- **Faster responses**: Subsequent identical or similar queries respond nearly instantly
- **Reduced API costs**: Fewer API calls means lower usage costs
- **Offline capability**: Previously cached responses remain available when offline
- **Consistent answers**: Get the same high-quality response for repeated questions

### Enabling the Feature

To enable the Anthropic API integration with prompt caching, add these variables to your `.env` file:

```bash
# Required: Your Anthropic API key
ANTHROPIC_API_KEY="your-api-key-here"

# Enable the Anthropic API integration
ENABLE_ANTHROPIC="true"

# Enable prompt caching (optional, can be enabled without enabling caching)
ENABLE_PROMPT_CACHE="true"
```

The cache behavior can be further customized in `config.json`:

```json
{
  "anthropic": {
    "defaultModel": "claude-3-haiku-20240307",
    "cache": {
      "ttl": 3600000, // Cache time-to-live in milliseconds (1 hour)
      "cachePath": "~/.cache/myai-memory-sync/prompt-cache"
    }
  }
}
```

### Using Prompt Caching in Your Code

```typescript
import { anthropicService } from './src/utils/anthropicService.js';

// Simple question answering
const response = await anthropicService.askQuestion(
  "What is prompt caching?",
  "You are a helpful assistant explaining technical concepts."
);

// Check if response came from cache
if (response.fromCache) {
  console.log("Response retrieved from cache");
}

// Explicitly disable caching for sensitive or time-critical queries
const freshResponse = await anthropicService.askQuestion(
  "What's the current time?", 
  undefined, 
  { disableCache: true }
);
```

### Example Script

We've included a demonstration script that shows prompt caching in action:

```bash
# Build the project first
npm run build

# Run the example (requires ANTHROPIC_API_KEY to be set)
node examples/promptCaching.js
```

This script:
1. Makes an initial API call (typically takes a few seconds)
2. Makes a second identical call that uses the cache (typically <50ms)
3. Makes a third call with caching explicitly disabled

The performance difference is immediately noticeable, often showing 95-99% faster response times for cached queries.

### Privacy and Security

- All cached data is stored locally on your device
- Cache entries expire automatically after the configured TTL
- The feature is disabled by default and requires explicit opt-in
- You can manually clear the cache at any time using the included script:

```bash
# Clear all cached responses
node examples/clearCache.js
```

## Future Plans

We're planning to expand myAI Memory Sync with these upcoming features:

- **DeepSeek**: Integration with DeepSeek Chat and API
- **OpenAI**: Support for ChatGPT and API-based models
- **Cross-platform sync**: Improved synchronization between different AI platforms
- **Mobile support**: Better integration with mobile clients
- **Custom templates**: More flexible template customization options
- **Enhanced preset management**: Categories and sharing for presets
- **Background synchronization**: Fully automated background sync with all platforms
- **Memory analytics**: Insights into your memory usage patterns
- **Natural language template editing**: Edit your memory with plain language

If you're interested in contributing to any of these features, please check the issues section for current development priorities.

## Project Structure

```
myai-memory-sync/
├── data/              # Data storage
│   ├── presets/       # Preset templates
│   └── template.md    # Main template file
├── examples/          # Example scripts
│   ├── promptCaching.js  # Demo of prompt caching
│   └── clearCache.js     # Utility to clear prompt cache
├── src/               # Source code
│   ├── services/      # Service implementations
│   ├── utils/         # Utility functions
│   │   ├── anthropicUtils.ts  # Prompt caching utilities
│   │   └── anthropicService.ts  # Claude API service
│   ├── direct-index.ts  # Direct MCP server entry point (stdio)
│   ├── direct-mcp.ts    # Direct MCP server implementation
│   ├── direct-server.ts # Direct HTTP server implementation
│   ├── templateParser.ts  # Template parser
│   └── types.ts       # Type definitions
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Build the project
npm run build

# Type check
npm run typecheck

# Lint the code
npm run lint
```

## License

MIT
