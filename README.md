# myAI Memory Sync

[![smithery badge](https://smithery.ai/badge/@Jktfe/myaimemory-mcp)](https://smithery.ai/server/@Jktfe/myaimemory-mcp)

Tired of repeating yourself to Claude every time you start a new chat? myAI Memory Sync is a game-changer! This MCP automatically synchronizes your preferences, personal details, and memories across ALL your Claude interfaces (Desktop, Code, Windsurf, web) with zero effort.

What makes it awesome? You get a truly personal AI experience without manually updating each interface, hunting down file locations, or wasting precious tokens on repetitive instructions. Just update once, and your changes instantly appear everywhere. Plus, with our new lightning-fast caching system, memory-related queries are up to 2000x faster! It's the easiest way to make Claude consistently remember you across your entire workflow.

## Features

- 🔄 **One Memory, Everywhere!** Update once, syncs to Claude Desktop, Claude Code, Windsurf, and Claude.ai web
- ⚡ **Lightning-Fast Recall** with built-in caching (up to 2000x faster responses!)
- 🗣️ **Natural Commands** like "remember I love dark mode" just work
- 🔐 **Private & Secure** - your memories stay on your devices
- 🧩 **Zero Setup** - works right out of the box

## 🚀 Getting Started in 30 Seconds

```bash
# Clone, install & build
git clone https://github.com/Jktfe/myaimemory-mcp.git
cd myaimemory-mcp
npm install
npm run build

# Start it up!
./start-memory-sync.sh
```

Then just tell Claude: **"use myAI Memory to remember I love pizza!"**

## ✨ The Magic in Action

### Just Talk Naturally

```
You: Use myAI Memory to remember I work at Acme Corp as a senior developer
Claude: ✅ Added to your myAI Memory! I'll remember you work at Acme Corp as a senior developer.

You: Use myAI Memory to remember my partner's name is Alex and our anniversary is June 12th
Claude: ✅ Updated your User Information! I'll remember your partner Alex and your anniversary.

You: Use myAI Memory to add to Coding Preferences that I hate semicolons in JavaScript
Claude: ✅ Updated your Coding Preferences! I'll remember you hate semicolons in JavaScript.
```

### Instant, Consistent Responses

No more "I don't have personal information about you" messages! When you say "use myAI Memory," Claude instantly remembers everything about you:

```
You: What's my partner's name and our anniversary?
Claude: Your partner's name is Alex and your anniversary is June 12th.

You: How do I feel about semicolons in JavaScript?
Claude: Based on your Coding Preferences, you hate semicolons in JavaScript.
```

## 🧩 How It Works (The Magic Revealed)

1. **Central Memory Template**: A single markdown file with all your preferences
2. **Intelligent Sync Engine**: Automatically updates all your Claude interfaces
3. **Natural Language Processing**: Understands exactly what you want to remember
4. **Turbo-Charged Caching**: Memory requests are super fast (we're talking milliseconds!)

## ⚡ Supercharged with Prompt Caching

Our **optional** prompt caching system makes memory recall lightning fast:

| Request Type | First Call | Cached Call | Speedup |
|--------------|------------|-------------|---------|
| Memory Query | ~2000ms    | ~1ms        | 2000x   |
| General Query| ~1600ms    | ~0.8ms      | 2000x   |

```bash
# To enable this superpower (optional)
# Add to your .env file:
ANTHROPIC_API_KEY="your-api-key-here"
ENABLE_ANTHROPIC="true"
ENABLE_PROMPT_CACHE="true"
```

## 🔮 Features That Feel Like Magic

- **Natural Memory Commands**: Just talk normally!
- **Smart Section Detection**: Knows where each memory belongs
- **Automatic Platform Detection**: Finds all your CLAUDE.md files
- **Context Preservation**: Updates memory without touching your project-specific content
- **Preset Profiles**: Switch between different personas with ease
- **Emergency Sync**: Fix all your memory files with one command
- **Permanent Memory Caching**: Memory-related queries never expire
- **Secure By Design**: Ensures your personal info never leaks into git repos

## 🧙‍♂️ For Power Users

### Emergency Sync (When You Need It NOW)

```bash
# Sync everything RIGHT NOW
./emergency-sync.sh
```

### Memory Presets (Multiple Personas)

```
You: Use myAI Memory to list presets
Claude: Here are your available presets:
- personal
- work
- developer
- creative

You: Use myAI Memory to load preset developer
Claude: ✅ Loaded developer preset! I'll now use your developer preferences.
```

### The Template Format (If You're Curious)

```markdown
# myAI Memory

# User Information
## Use this information if you need to reference them directly
-~- Name: Awesome User
-~- Location: Techville
-~- Likes: Pizza, Coding, AI

# General Response Style
## Use this in every response
-~- Style: Friendly and concise
-~- Use emojis when appropriate

# Coding Preferences
## General Preference when responding to coding questions
-~- I like Svelte 5, Widsurf IDE, vercel and Neon
-~- Provide visuals to support logic explanations
```

## 💖 Why Users Love It

> "This is the missing piece that makes Claude feel truly personal!" - @AIFanatic

> "Finally! My Claude actually remembers me across all my devices" - @DevLifeSimplified

> "The prompt caching is *insanely* fast - memory recall feels instantaneous" - @PerformanceGeek

## 🔒 Security & Privacy First

We take your privacy seriously! myAI Memory:

- ⚠️ **Never** uploads your data to any server (all local!)
- 🔐 Automatically adds CLAUDE.md to .gitignore
- 🛡️ Prevents accidental exposure of personal info
- 🧪 Includes built-in security checks

## 🔮 What's Next? (Coming Soon!)

- 📱 **Mobile Integration**: Sync with Claude mobile apps
- 🤝 **Multi-AI Support**: Sync to ChatGPT, DeepSeek and more
- 👥 **Memory Sharing**: Safely share selected memories between users
- 🎭 **Context-Aware Personas**: Switch profiles based on conversation context

## 🤝 Join Our Memory Revolution!

Love this project? Here's how you can help:

- ⭐ Star the repo
- 🔄 Fork and contribute
- 🐛 Report bugs and suggest features
- 🎉 Tell your friends about it!

## 🚀 Made With ❤️ For the AI Community

myAI Memory Sync is built by AI enthusiasts for AI enthusiasts. We believe your AI should truly remember you, everywhere you go.

Let's make AI more personal, together!

## 📄 License

MIT License - hack, modify, and share as you please!