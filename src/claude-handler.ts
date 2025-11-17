import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { ConversationSession } from './types.js';
import { Logger } from './logger.js';
import { McpManager, McpServerConfig } from './mcp-manager.js';
import { config } from './config.js';
import * as fs from 'fs';

export class ClaudeHandler {
  private sessions: Map<string, ConversationSession> = new Map();
  private logger = new Logger('ClaudeHandler');
  private mcpManager: McpManager;

  constructor(mcpManager: McpManager) {
    this.mcpManager = mcpManager;
  }

  getSessionKey(userId: string, channelId: string, threadTs?: string): string {
    return `${userId}-${channelId}-${threadTs || 'direct'}`;
  }

  getSession(userId: string, channelId: string, threadTs?: string): ConversationSession | undefined {
    return this.sessions.get(this.getSessionKey(userId, channelId, threadTs));
  }

  createSession(userId: string, channelId: string, threadTs?: string): ConversationSession {
    const session: ConversationSession = {
      userId,
      channelId,
      threadTs,
      isActive: true,
      lastActivity: new Date(),
    };
    this.sessions.set(this.getSessionKey(userId, channelId, threadTs), session);
    return session;
  }

  async *streamQuery(
    prompt: string,
    session?: ConversationSession,
    abortController?: AbortController,
    workingDirectory?: string
  ): AsyncGenerator<SDKMessage, void, unknown> {
    const options: any = {
      outputFormat: 'stream-json',
      permissionMode: 'bypassPermissions', // Always bypass permissions - no user approval needed
      model: config.claude.model, // Use configured model
    };

    if (workingDirectory) {
      options.cwd = workingDirectory;
    }

    // Load default agent for new conversations (not resumed sessions)
    if (!session?.sessionId && config.claude.defaultAgent) {
      const agentPath = config.claude.defaultAgent;
      if (fs.existsSync(agentPath)) {
        this.logger.info('Loading default agent', { agentPath });
        options.agentPath = agentPath;
      } else {
        this.logger.warn('Default agent file not found', { agentPath });
      }
    }

    // Add MCP server configuration if available
    const mcpServers = this.mcpManager.getServerConfiguration();

    if (mcpServers && Object.keys(mcpServers).length > 0) {
      options.mcpServers = mcpServers;

      // Allow all MCP tools by default
      const defaultMcpTools = this.mcpManager.getDefaultAllowedTools();
      if (defaultMcpTools.length > 0) {
        options.allowedTools = defaultMcpTools;
      }

      this.logger.debug('Added MCP configuration to options', {
        serverCount: Object.keys(options.mcpServers).length,
        servers: Object.keys(options.mcpServers),
        allowedTools: defaultMcpTools,
      });
    }

    if (session?.sessionId) {
      options.resume = session.sessionId;
      this.logger.debug('Resuming session', { sessionId: session.sessionId });
    } else {
      this.logger.debug('Starting new Claude conversation');
    }

    // Validate that we have credentials configured
    if (!process.env.ANTHROPIC_API_KEY &&
      !process.env.CLAUDE_CODE_USE_BEDROCK &&
      !process.env.CLAUDE_CODE_USE_VERTEX) {
      const error = new Error('No Claude credentials configured. Set ANTHROPIC_API_KEY, or enable CLAUDE_CODE_USE_BEDROCK or CLAUDE_CODE_USE_VERTEX');
      this.logger.error('Missing credentials', error);
      throw error;
    }

    this.logger.debug('Claude query options', options);
    this.logger.info('Starting Claude Code SDK query', {
      promptLength: prompt.length,
      workingDirectory,
      hasSession: !!session?.sessionId,
      permissionMode: options.permissionMode,
      model: options.model,
      agentPath: options.agentPath || 'none',
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      useBedrock: !!process.env.CLAUDE_CODE_USE_BEDROCK,
      useVertex: !!process.env.CLAUDE_CODE_USE_VERTEX,
    });

    try {
      let messageCount = 0;
      const startTime = Date.now();

      for await (const message of query({
        prompt,
        abortController: abortController || new AbortController(),
        options,
      })) {
        messageCount++;
        const elapsed = Date.now() - startTime;

        this.logger.debug('Received message from SDK', {
          messageNumber: messageCount,
          type: message.type,
          subtype: (message as any).subtype,
          elapsedMs: elapsed,
        });

        if (message.type === 'system' && message.subtype === 'init') {
          if (session) {
            session.sessionId = message.session_id;
            this.logger.info('Session initialized', {
              sessionId: message.session_id,
              model: (message as any).model,
              tools: (message as any).tools?.length || 0,
              elapsedMs: elapsed,
            });
          }
        }
        yield message;
      }

      this.logger.info('Claude Code SDK query completed', {
        totalMessages: messageCount,
        totalTimeMs: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Error in Claude query', error);
      throw error;
    }
  }

  cleanupInactiveSessions(maxAge: number = 30 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.info(`Cleaned up ${cleaned} inactive sessions`);
    }
  }
}