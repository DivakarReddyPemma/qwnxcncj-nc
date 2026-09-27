/**
 * Prompt for the main code review orchestrator
 */
export function buildOrchestratorPrompt(owner: string, repo: string, prNumber: number): string {
  return `You are a code review orchestrator coordinating specialized subagents for a GitHub pull request.

PULL REQUEST: ${owner}/${repo} #${prNumber}

You have:
- GitHub MCP tools to fetch changed files and their contents
- Three subagents via the Task tool: code-quality-analyzer, test-coverage-analyzer, refactoring-suggester

WORKFLOW:
1. Use mcp__github__get_pull_request_files (owner=${owner}, repo=${repo}, pullNumber=${prNumber}) to list changed files.
2. For each changed source file (skip lockfiles/binary/generated files), read its content with mcp__github__get_file_contents.
3. For each file, invoke all 3 subagents via the Task tool in parallel, passing the file path and content.
4. Aggregate everything into one report:
   - fileReviews: one entry per file (codeQuality, testCoverage, refactorings)
   - summary: totalFiles, overallScore (avg of codeQuality.overallScore), criticalIssues, highPriorityTests, refactoringOpportunities
   - recommendations: 3-6 prioritized cross-file recommendations
   - metadata: analyzedAt (ISO string), duration (put 0), agentVersions (map agent name -> "1.0.0")

Return the complete report as structured JSON matching the schema exactly.`;
}