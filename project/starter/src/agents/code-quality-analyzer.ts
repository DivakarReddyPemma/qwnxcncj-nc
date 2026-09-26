import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { codeQualityAnalyzerPrompt } from '../prompts/code-quality-analyzer.prompt.js';

/**
 * Code Quality Analyzer Subagent
 * Analyzes code for security vulnerabilities, performance issues,
 * and maintainability concerns. Leverages Claude Skills for
 * specialized analysis (e.g. javascript-best-practices, security-analysis).
 */
export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes source code files for security vulnerabilities, performance issues, ' +
    'maintainability concerns, style violations, bug risks, and best-practice deviations. ' +
    'Use this agent whenever a pull request needs a code quality review covering security, ' +
    'performance, or maintainability aspects of the changed files.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  prompt: codeQualityAnalyzerPrompt
};
