import { query, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { mcpServersConfig } from './config/mcp.config.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { ReviewReportSchema, ReviewReportJSONSchema, ReviewReport } from './types/report-types.js';
import { RateLimiter, RateLimiterConfig, withRetry, withTimeout, logger } from './utils/index.js';
import { buildOrchestratorPrompt } from './prompts/orchestrator.prompt.js';

export interface OrchestratorOptions {
  rateLimits?: Partial<RateLimiterConfig>;
}

const subagents: Record<string, AgentDefinition> = {
  'code-quality-analyzer': codeQualityAnalyzer,
  'test-coverage-analyzer': testCoverageAnalyzer,
  'refactoring-suggester': refactoringSuggester
};

async function* generateMessages(userMessage: string) {
  yield {
    type: 'user' as const,
    message: { role: 'user' as const, content: userMessage },
    parent_tool_use_id: null,
    session_id: 'code-review-session'
  };
}

export class CodeReviewOrchestrator {
  private rateLimiter: RateLimiter;

  constructor(options: OrchestratorOptions = {}) {
    this.rateLimiter = new RateLimiter(options.rateLimits);
  }

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const model = process.env.ANTHROPIC_MODEL;
    if (!model) throw new Error('ANTHROPIC_MODEL is not set');

    const startTime = Date.now();
    logger.info('Starting code review', { owner, repo, prNumber });

    const orchestratorPrompt = buildOrchestratorPrompt(owner, repo, prNumber);

    const runQuery = () =>
      withTimeout(async () => {
        for await (const message of query({
          prompt: generateMessages(orchestratorPrompt),
          options: {
            mcpServers: mcpServersConfig,
            agents: subagents,
            model,
            allowedTools: ['Task', 'mcp__github__get_pull_request_files', 'mcp__github__get_file_contents'],
            outputFormat: { type: 'json_schema', schema: ReviewReportJSONSchema },
            maxTurns: 30
          }
        })) {
          const anyMessage = message as any;
          if (anyMessage.type === 'system' && anyMessage.subtype === 'init' && anyMessage.mcpServers) {
            for (const [name, server] of Object.entries(
              anyMessage.mcpServers as Record<string, { status: string; error?: string }>
            )) {
              if (server.status === 'failed') {
                throw new Error(`MCP server '${name}' failed: ${server.error || 'Unknown error'}`);
              }
              logger.info(`MCP server '${name}' status: ${server.status}`);
            }
          }

          if (message.type === 'assistant') {
            const content = message.message?.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'tool_use') logger.info(`Tool invoked: ${block.name}`);
              }
            }
          } else if (message.type === 'result' && message.subtype === 'success' && message.structured_output) {
            const parsed = ReviewReportSchema.parse(message.structured_output);
            parsed.metadata.duration = Date.now() - startTime;
            return parsed;
          } else if (message.type === 'result') {
            throw new Error(`Review failed: ${message.subtype}`);
          }
        }
        throw new Error('Failed to get structured output from orchestrator');
      }, 480000, 'Code review timed out after 8 minutes');
    await this.rateLimiter.acquire(20000);
    try {
      const report = await withRetry(runQuery, 1, 2000);
      logger.info('Code review completed', { owner, repo, prNumber, duration: report.metadata.duration });
      return report;
    } finally {
      this.rateLimiter.release();
    }
  }
}