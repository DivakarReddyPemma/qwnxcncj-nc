import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { testCoverageAnalyzerPrompt } from '../prompts/test-coverage-analyzer.prompt.js';

/**
 * Test Coverage Analyzer Subagent
 * Analyzes source files to determine test coverage, identifies untested
 * functions, classes, branches, and edge cases, and suggests tests to add.
 */
export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Analyzes source code files to determine test coverage, identifies untested functions, ' +
    'classes, branches, and edge cases, and suggests specific tests to add. Use this agent ' +
    'whenever a pull request needs a review of how well the changed files are tested.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob', 'Skill'],
  prompt: testCoverageAnalyzerPrompt
};