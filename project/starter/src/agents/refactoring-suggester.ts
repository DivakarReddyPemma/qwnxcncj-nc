import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { refactoringSuggesterPrompt } from '../prompts/refactoring-suggester.prompt.js';

/**
 * Refactoring Suggester Subagent
 * Analyzes source code files and proposes concrete refactoring
 * improvements for clarity, maintainability, and modern best practices.
 */
export const refactoringSuggester: AgentDefinition = {
  description:
    'Analyzes source code files and proposes concrete refactoring improvements such as ' +
    'extracting functions, renaming, modernizing patterns, simplifying logic, and applying ' +
    'better design patterns. Use this agent whenever a pull request needs suggestions for ' +
    'improving code structure and maintainability.',
  model: 'inherit',
  tools: ['Read', 'Grep', 'Glob'],
  prompt: refactoringSuggesterPrompt
};