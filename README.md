# Claude Code Slack Bot

A Slack bot that integrates with Claude Code SDK to provide AI-powered coding assistance directly in your Slack workspace.

## Features

- 🤖 Direct message support - chat with the bot privately
- 💬 Thread support - maintains conversation context within threads
- 🔄 Streaming responses - see Claude's responses as they're generated
- 📝 Markdown formatting - code blocks and formatting are preserved
- 🔧 Session management - maintains conversation context across messages
- ⚡ Real-time updates - messages update as Claude thinks

## Prerequisites

- Node.js 18+ installed
- A Slack workspace where you can install apps
- Claude Code

## Setup

### 1. Clone and Install

```bash
git clone <your-repo>
cd claude-code-slack
npm install
```

### 2. Create Slack App

#### Option A: Using App Manifest (Recommended)
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click "Create New App"
2. Choose "From an app manifest"
3. Select your workspace
4. Paste the contents of `slack-app-manifest.json` (or `slack-app-manifest.yaml`)
5. Review and create the app

#### Option B: Manual Configuration
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Choose "From scratch" and give your app a name
3. Select the workspace where you want to install it

### 3. Configure Slack App

After creating the app (either method), you need to:

#### Generate Tokens
1. Go to "OAuth & Permissions" and install the app to your workspace
2. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
3. Go to "Basic Information" → "App-Level Tokens"
4. Generate a token with `connections:write` scope
5. Copy the token (starts with `xapp-`)

#### Get Signing Secret
1. Go to "Basic Information"
2. Copy the "Signing Secret"

### 4. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Slack App Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret

# Working Directory Configuration
# Default working directory when none is explicitly set
DEFAULT_WORKING_DIRECTORY=/path/to/your/workspace

# Claude Agent Configuration
# Default agent to use for all new conversations
CLAUDE_DEFAULT_AGENT=/path/to/your/.claude/agents/agent-name.md

# Claude Model Configuration
# Specify which Claude model to use (default: sonnet for Claude Sonnet 4.5)
# Use aliases: 'sonnet', 'opus', 'haiku' or full names like 'claude-sonnet-4-5-20250929'
CLAUDE_MODEL=sonnet

# Claude Code Configuration
# This is only needed if you don't use a Claude subscription

# ANTHROPIC_API_KEY=your-anthropic-api-key
# CLAUDE_CODE_USE_BEDROCK=1
# CLAUDE_CODE_USE_VERTEX=1
```

### 5. Run the Bot

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm run prod
```

## Usage

### Agent-Based Conversations

If you've configured a default agent (via `CLAUDE_DEFAULT_AGENT`), the bot will automatically use that agent's behavior for all new conversations. This is great for specialized workflows like:

- **Debugging & Root Cause Analysis** - Systematic problem investigation
- **Code Review** - Structured code analysis and feedback
- **Documentation** - Consistent documentation generation
- **Custom Workflows** - Any specialized behavior you define

**Note:** Agents only apply to new conversations. Continued conversations in threads maintain their existing context.

### Setting Working Directory

The bot uses a default working directory (configurable via `DEFAULT_WORKING_DIRECTORY` in `.env`) when no directory is explicitly set. You can override this for specific channels, conversations, or threads.

#### Set working directory:

**Relative paths** (if BASE_DIRECTORY is configured):
```
cwd project-name
```

**Absolute paths**:
```
cwd /path/to/your/project
```
or
```
set directory /path/to/your/project
```

#### Check current working directory:
```
cwd
```
or
```
get directory
```

### Working Directory Scope

- **Direct Messages**: Working directory is set for the entire conversation
- **Channels**: Working directory is set for the entire channel (prompted when bot joins)
- **Threads**: Can override the channel/DM directory for a specific thread by mentioning the bot

### Directory Configuration

You can configure directories in your `.env` file:

```env
# Default working directory (fallback when none is set)
DEFAULT_WORKING_DIRECTORY=/path/to/your/workspace

# Base directory for relative paths
BASE_DIRECTORY=/path/to/your/base/directory/
```

**Priority order:**
1. Thread-specific directory (set with `@ClaudeBot cwd ...` in thread)
2. Channel/DM directory (set with `cwd ...`)
3. Default directory (`DEFAULT_WORKING_DIRECTORY`)

**With BASE_DIRECTORY set**, you can use:
- `cwd project-name` → resolves to `/path/to/your/base/directory/project-name`
- `cwd /absolute/path` → uses absolute path directly

### Direct Messages
Simply send a direct message to the bot with your request:
```
@ClaudeBot Can you help me write a Python function to calculate fibonacci numbers?
```

### In Channels
When you first add the bot to a channel, it will ask for a default working directory for that channel.

Mention the bot in any channel where it's been added:
```
@ClaudeBot Please review this code and suggest improvements
```

### Thread-Specific Working Directories
You can override the channel's default working directory for a specific thread:
```
@ClaudeBot cwd different-project
@ClaudeBot Now help me with this specific project
```

### Threads
Reply in a thread to maintain conversation context. The bot will remember previous messages in the thread.

### File Uploads
You can upload files and images directly to any conversation:

#### Supported File Types:
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Text Files**: TXT, MD, JSON, JS, TS, PY, Java, etc.
- **Documents**: PDF, DOCX (limited support)
- **Code Files**: Most programming languages

#### Usage:
1. Upload a file by dragging and dropping or using the attachment button
2. Add optional text to describe what you want Claude to do with the file
3. Claude will analyze the file content and provide assistance

**Note**: Files are temporarily downloaded for processing and automatically cleaned up after analysis.

### MCP (Model Context Protocol) Servers

The bot supports MCP servers to extend Claude's capabilities with additional tools and resources.

#### Setup MCP Servers

1. **Create MCP configuration file:**
   ```bash
   cp mcp-servers.example.json mcp-servers.json
   ```

2. **Configure your servers** in `mcp-servers.json`:
   ```json
   {
     "mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
       },
       "github": {
         "command": "npx", 
         "args": ["-y", "@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "your-token"
         }
       }
     }
   }
   ```

#### MCP Commands

- **View configured servers**: `mcp` or `servers`
- **Reload configuration**: `mcp reload`

#### Available MCP Servers

- **Filesystem**: File system access (`@modelcontextprotocol/server-filesystem`)
- **GitHub**: GitHub API integration (`@modelcontextprotocol/server-github`)
- **PostgreSQL**: Database access (`@modelcontextprotocol/server-postgres`)
- **Web Search**: Search capabilities (custom servers)

All MCP tools are automatically allowed and follow the pattern: `mcp__serverName__toolName`

## Advanced Configuration

### Claude Model Selection

You can specify which Claude model to use by setting the `CLAUDE_MODEL` environment variable. The default is `sonnet` (Claude Sonnet 4.5).

**Configuration:**
```env
CLAUDE_MODEL=sonnet
```

**Available Models (Aliases):**
- `sonnet` - Claude Sonnet 4.5 (default, most capable and latest)
- `opus` - Claude Opus 4 (most powerful)
- `haiku` - Claude Haiku 4 (fastest)

**Full Model Names (with specific versions):**
You can also specify full model names for precise version control:
- `claude-sonnet-4-5-20250929` - Claude Sonnet 4.5 (specific version)
- `claude-opus-4-20250514` - Claude Opus 4 (specific version)
- `claude-haiku-4-20250514` - Claude Haiku 4 (specific version)

**Note:** Using aliases (e.g., `sonnet`) automatically gives you the latest version of that model family.

The model setting applies to all new and existing conversations.

### Default Claude Agent

You can configure the bot to automatically use a specific Claude agent for all new conversations. This is useful for specialized workflows like debugging, code review, or documentation generation.

**Configuration:**
```env
CLAUDE_DEFAULT_AGENT=/path/to/your/.claude/agents/agent-name.md
```

**Example:**
```env
CLAUDE_DEFAULT_AGENT=/path/to/your/.claude/agents/root-cause-investigator.md
```

**How it works:**
- The agent is loaded automatically for **new conversations only**
- Resumed conversations (in threads) continue with their existing context
- The agent file must exist at the specified path
- If the file doesn't exist, the bot will log a warning and continue without the agent

**Creating Custom Agents:**

Agents are markdown files that define specialized behaviors. See the [Claude Code documentation](https://docs.anthropic.com/claude/docs/agents) for details on creating custom agents.

Example agent structure:
```markdown
---
name: your-agent-name
description: What this agent does
model: sonnet
---

[Agent instructions and behavior here]
```

### Using AWS Bedrock
Set these environment variables:
```env
CLAUDE_CODE_USE_BEDROCK=1
# AWS credentials should be configured via AWS CLI or IAM roles
```

### Using Google Vertex AI
Set these environment variables:
```env
CLAUDE_CODE_USE_VERTEX=1
# Google Cloud credentials should be configured
```

## Development

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your `.env` file:
```env
DEBUG=true
```

This will show detailed logs including:
- Incoming Slack messages
- Claude SDK request/response details
- Session management operations
- Message streaming updates

### Project Structure
```
src/
├── index.ts          # Application entry point
├── config.ts         # Configuration management
├── types.ts                      # TypeScript type definitions
├── claude-handler.ts             # Claude Code SDK integration
├── slack-handler.ts              # Slack event handling
├── working-directory-manager.ts  # Working directory management
└── logger.ts                     # Logging utility
```

### Available Scripts
- `npm run dev` - Start in development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run the compiled JavaScript
- `npm run prod` - Run production build

## Troubleshooting

### Bot not responding
1. Check that the bot is running (`npm run dev`)
2. Verify all environment variables are set correctly
3. Ensure the bot has been invited to the channel
4. Check Slack app permissions are configured correctly

### Authentication errors
1. Verify your Anthropic API key is valid
2. Check Slack tokens haven't expired
3. Ensure Socket Mode is enabled

### Message formatting issues
The bot converts Claude's markdown to Slack's formatting. Some complex formatting may not translate perfectly.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT