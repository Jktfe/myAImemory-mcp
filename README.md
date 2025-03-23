# myAI Memory Sync

[![smithery badge](https://smithery.ai/badge/@Jktfe/myaimemory-mcp)](https://smithery.ai/server/@Jktfe/myaimemory-mcp)

**Tired of repeating yourself to Claude every time you start a new chat?** myAI Memory Sync is a game-changing MCP tool that seamlessly synchronizes your preferences, personal details, and code standards across ALL your Claude interfaces! Just update once, and your changes instantly appear everywhere - from Claude Desktop to Claude Code, Windsurf, and Claude.ai web. With our cutting-edge caching system, memory-related queries are up to 2000x faster! Stop wasting tokens on repetitive instructions and enjoy a truly personalized AI experience.

<p align="center">
  <img src="https://smithery.ai/assets/myaimemory-banner.png" alt="myAI Memory Sync Banner" width="600">
</p>

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Jktfe/myaimemory-mcp.git
cd myaimemory-mcp

# Install dependencies
npm install

# Build TypeScript code
npm run build

# Start MCP server
./start-memory-sync.sh
```

Then in Claude, just say:

```
You: Use myAI Memory to remember I prefer TypeScript over JavaScript
Claude: ✅ Added to your Coding Preferences! I'll remember you prefer TypeScript over JavaScript.
```

## 📋 Installation Options

### Option 1: Direct Install (Recommended)

Install from npm:

```bash
npm install -g myai-memory-sync
```

Start the server:

```bash
myai-memory-sync
```

### Option 2: Run from Source

Clone and build from source:

```bash
git clone https://github.com/Jktfe/myaimemory-mcp.git
cd myaimemory-mcp
npm install
npm run build
npm start
```

### Option 3: Docker

Build and run with Docker:

```bash
docker build -t myai-memory-sync .
docker run -v myai-memory:/app/data -p 3000:3000 myai-memory-sync
```

## 🔌 MCP Configuration

### Claude Desktop Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "myai-memory-sync": {
      "command": "npx",
      "args": [
        "-y",
        "myai-memory-sync"
      ],
      "env": {
        "TEMPLATE_PATH": "/path/to/custom/template.md",
        "ENABLE_ANTHROPIC": "true",
        "ANTHROPIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude.ai with Smithery

1. Visit [Smithery.ai](https://smithery.ai)
2. Add the myAI Memory Sync MCP:
   ```
   @Jktfe/myaimemory-mcp
   ```
3. Configure with your API key in the Smithery settings

### Windsurf Integration

In Windsurf, add to your `.codeium/config.json`:

```json
{
  "mcp": {
    "servers": {
      "myai-memory-sync": {
        "command": "npx",
        "args": [
          "-y",
          "myai-memory-sync"
        ]
      }
    }
  }
}
```

### HTTP Server Mode

For HTTP transport instead of stdio:

```bash
# Start HTTP server on port 3000
npm run start:http

# Or specify a custom port
PORT=8080 npm run start:http
```

### Environment Variables

Create a `.env` file with the following options:
```
# Basic configuration
DEBUG=true                      # Enable debug logging
TEMPLATE_PATH=./data/template.md  # Custom template location

# Platform-specific paths
WINDSURF_MEMORY_PATH=~/.codeium/windsurf/memories/global_rules.md
CLAUDE_PROJECTS_PATH=~/CascadeProjects

# Performance optimization
ENABLE_ANTHROPIC=true           # Enable Anthropic API integration
ANTHROPIC_API_KEY=your-api-key  # Your Anthropic API key
ENABLE_PROMPT_CACHE=true        # Enable prompt caching system
CACHE_TTL=300000                # Cache TTL in milliseconds (5 minutes)

# Claude web sync (optional)
CLAUDE_WEB_SYNC_ENABLED=false   # Enable Claude.ai web synchronization
CLAUDE_WEB_EMAIL=you@email.com  # Your Claude.ai email
CLAUDE_WEB_HEADLESS=true        # Run browser in headless mode
```

## 🧙‍♂️ System Prompt Integration

For best results, add this to your Claude system prompt:

```
Memory Integration Instructions:
When you receive a command that starts with "use myAI Memory to", you should:

1. Process the rest of the instruction as a memory management command
2. Try to determine the appropriate section to update based on the content
3. Use the myAI Memory Sync MCP to update your memory
4. Confirm the update with a brief acknowledgment

For example:
"use myAI Memory to remember I prefer dark mode" 
→ Update the preferences section with dark mode preference

When asked questions about preferences or personal information, first check your memory via the myAI Memory Sync MCP. Always reference information from memory rather than making assumptions.
```

## ✨ Features

- 🔄 **Cross-Platform Synchronization**: Update once, syncs everywhere
- ⚡ **Lightning-Fast Recall**: Caching system with up to 2000x performance boost
- 🗣️ **Natural Language Interface**: Just talk naturally to update your preferences
- 🧩 **Multiple Persona Profiles**: Switch between different presets with ease
- 🔐 **Security-Focused**: Local storage with .gitignore protection
- 🛠️ **Developer-Friendly**: Full TypeScript implementation with comprehensive API

## 🧩 Core Architecture

myAI Memory Sync uses a modular architecture with these key components:

- **Template Parser**: Bidirectional conversion between structured memory objects and markdown
- **Template Storage**: Persistent storage with in-memory and file-system caching
- **Platform Synchronizers**: Implements the `PlatformSyncer` interface for each target platform
- **Natural Language Processor**: Extracts structured data from natural language memory commands
- **Memory Cache Service**: Optimizes performance with multi-level caching strategies

<p align="center">
  <img src="https://smithery.ai/assets/myaimemory-architecture.png" alt="Architecture Diagram" width="700">
</p>

## 🔍 Detailed Features

### Cross-Platform Synchronization
- **ClaudeCodeSyncer**: Updates CLAUDE.md files across all repositories
- **WindsurfSyncer**: Manages global_rules.md in Windsurf environment
- **ClaudeWebSyncer**: Optional Puppeteer-based synchronization with Claude.ai web interface

### Intelligent Memory Management
- **Pattern-Based Extraction**: Converts natural language to structured key-value pairs
- **Section Detection Algorithm**: Automatically determines appropriate section for new memories
- **Memory Template Format**: Markdown-based structure with sections, descriptions, and key-value items
- **Context Preservation**: Updates memory sections while preserving other template content

### Performance Optimization
- **Multi-Level Caching**: In-memory caching at both template and section levels
- **TTL-Based Cache Management**: Configurable Time-To-Live for cached content
- **Pre-Warming**: Cache pre-population after template updates
- **Optional Anthropic API Integration**: Accelerates memory-related queries up to 2000x

### Security
- **Local-First Architecture**: All data remains on your device
- **Gitignore Management**: Automatically adds CLAUDE.md to .gitignore in all repositories
- **File Permission Handling**: Fixes permissions issues for maximum compatibility
- **Encrypted Storage**: Compatible with encrypted file systems

## 📋 Memory Template Format

The system uses a structured markdown format to organize your preferences:

```markdown
# myAI Memory

# User Information
## Use this information if you need to reference them directly
-~- Name: Your Name
-~- Location: Your Location
-~- Likes: Reading, Hiking, Technology

# General Response Style
## Use this in every response
-~- Style: Friendly and concise
-~- Use UK English Spellings: true
-~- Include emojis when appropriate: true

# Coding Preferences
## General Preference when responding to coding questions
-~- I prefer TypeScript over JavaScript
-~- Show step-by-step explanations
```

## 🛠️ Technical Implementation

### MemoryTemplate Schema
```typescript
interface MemoryTemplate {
  sections: TemplateSection[];
}

interface TemplateSection {
  title: string;
  description: string;
  items: TemplateItem[];
}

interface TemplateItem {
  key: string;
  value: string;
}
```

### Platform Synchronization Interface
```typescript
interface PlatformSyncer {
  sync(templateContent: string): Promise<SyncStatus>;
}

type PlatformType = 'claude-web' | 'claude-code' | 'windsurf' | 'master';

interface SyncStatus {
  platform: PlatformType;
  success: boolean;
  message: string;
}
```

## 🔌 MCP Integration API

The myAI Memory Sync tool implements the Model Context Protocol (MCP) with the following functions:

| Function | Description | Parameters |
|----------|-------------|------------|
| `get_template` | Retrieves the full memory template | None |
| `get_section` | Retrieves a specific section | `sectionName: string` |
| `update_section` | Updates a specific section | `sectionName: string, content: string` |
| `update_template` | Replaces the entire template | `content: string` |
| `list_presets` | Lists available presets | None |
| `load_preset` | Loads a specific preset | `presetName: string` |
| `create_preset` | Creates a new preset | `presetName: string` |
| `sync_platforms` | Synchronizes across platforms | `platform?: string` |
| `list_platforms` | Lists available platforms | None |

### Natural Language Interface

Users can interact with the system through natural language commands:

```
You: Use myAI Memory to remember I prefer TypeScript over JavaScript
Claude: ✅ Added to your Coding Preferences! I'll remember you prefer TypeScript over JavaScript.

You: Use myAI Memory to load preset developer
Claude: ✅ Loaded developer preset! I'll now use your developer preferences.
```

## 🧙‍♂️ Advanced Usage

### Memory Presets

Switch between different personas easily:

```
You: Use myAI Memory to list presets
Claude: Available presets: personal, work, developer

You: Use myAI Memory to load preset developer
Claude: ✅ Loaded developer preset!
```

### Emergency Sync

When you need to fix synchronization issues across all platforms:

```bash
# Sync everything immediately
./emergency-sync.sh
```

### Command Line Interface

```bash
# View all available commands
node dist/cli.js --help

# Process memory commands directly
node dist/cli.js --remember "remember I prefer dark mode"

# Start HTTP server for SSE transport
npm run start:http

# Start stdio server for MCP transport
npm run start
```

### Development Workflow

```bash
# Run in development mode with auto-reload
npm run dev

# Run in development mode with HTTP server
npm run dev:http

# Watch TypeScript compilation
npm run build:watch

# Run tests
npm test

# Run specific test
npm test -- -t "platformSync"

# Lint code
npm run lint

# Type check without emitting files
npm run typecheck
```

## ⚡ Performance Benchmarks

Our caching system delivers incredible performance improvements:

| Operation | Without Cache | With Cache | Improvement |
|-----------|---------------|------------|-------------|
| Memory Query | ~2000ms | ~1ms | 2000x |
| Section Lookup | ~1600ms | ~0.8ms | 2000x |
| Template Parse | ~120ms | ~0.1ms | 1200x |
| Platform Sync | ~850ms | ~350ms | 2.4x |

<p align="center">
  <img src="https://smithery.ai/assets/myaimemory-performance.png" alt="Performance Chart" width="600">
</p>

## 🔒 Security & Privacy

We take your privacy seriously:

- All data remains locally on your device
- CLAUDE.md files are automatically added to .gitignore
- No data is sent to external servers (except when using the optional Anthropic API integration)
- Works with encrypted file systems for maximum security

## 🛠️ Troubleshooting

### Common Issues

1. **CLAUDE.md Not Updating**
   - Check file permissions with `ls -la CLAUDE.md`
   - Try emergency sync with `./emergency-sync.sh`
   - Verify platform paths in your `.env` file

2. **MCP Connection Failures**
   - Ensure MCP server is running with `ps aux | grep myai-memory`
   - Check Claude Desktop logs for MCP errors
   - Verify your Claude Desktop configuration file

3. **Caching Issues**
   - Clear cache with `node dist/cli.js --clear-cache`
   - Verify Anthropic API key is correctly set
   - Check memory file integrity with `node dist/cli.js --validate`

### Logs and Debugging

Enable debug mode to see detailed logs:

```bash
DEBUG=true npm run start
```

Log files are stored in:
- Linux/macOS: `~/.local/share/myai-memory/logs/`
- Windows: `%APPDATA%\myai-memory\logs\`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

We follow a standard Git workflow and CI process:

- All PRs require passing tests and linting
- New features should include tests
- Major changes should update documentation
- Follow existing code style and patterns

## 📚 Documentation

For more detailed documentation, see the [Wiki](https://github.com/Jktfe/myaimemory-mcp/wiki).

API documentation is available in the `/docs` directory:

```bash
# Generate API documentation
npm run docs
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

Project Link: [https://github.com/Jktfe/myaimemory-mcp](https://github.com/Jktfe/myaimemory-mcp)

---

<p align="center">
  Made with ❤️ for the AI community
</p>