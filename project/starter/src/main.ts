import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator, formatError } from './utils/index.js';

// Load environment variables
dotenv.config();

function printUsage(): void {
  console.error('Usage: npm run dev -- <owner> <repo> <pr-number>');
  console.error('Example: npm run dev -- octocat Hello-World 1');
}

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev -- <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);
  const prNumber = Number(prStr);

  if (!owner || !repo || !prStr || !Number.isSafeInteger(prNumber) || prNumber <= 0) {
    console.error('Invalid arguments: owner, repo, and a positive integer PR number are required.');
    printUsage();
    process.exit(1);
  }

  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasBedrock = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

  if (hasBedrock) {
    if (!process.env.AWS_REGION) {
      console.error('AWS_REGION must be set when using AWS Bedrock');
      process.exit(1);
    }
    console.log('🔐 Using AWS Bedrock authentication');
  } else if (hasAnthropicKey) {
    console.log('🔐 Using Anthropic API authentication');
  } else {
    console.error(
      'No authentication configured. Set either:\n' +
      '  - ANTHROPIC_API_KEY, OR\n' +
      '  - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY (for Bedrock)'
    );
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_MODEL) {
    console.error(
      'ANTHROPIC_MODEL is not set.\n' +
      '  For Anthropic API use: claude-sonnet-4-5-20250929\n' +
      '  For AWS Bedrock use: us.anthropic.claude-sonnet-4-5-20250929-v1:0'
    );
    process.exit(1);
  }

  try {
    const orchestrator = new CodeReviewOrchestrator();
    const report = await orchestrator.reviewPullRequest(owner, repo, prNumber);

    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const base = `${owner}_${repo}_${prNumber}`;
    const generator = new ReportGenerator();

    const jsonReport = generator.generateJSONReport(report);
    const markdownReport = generator.generateMarkdownReport(report);
    const htmlReport = generator.generateHTMLReport(report);

    // Required canonical filenames per rubric
    fs.writeFileSync(path.join(reportsDir, 'report.json'), jsonReport);
    fs.writeFileSync(path.join(reportsDir, 'report.md'), markdownReport);
    fs.writeFileSync(path.join(reportsDir, 'report.html'), htmlReport);

    // Additional PR-specific copies for convenience when reviewing multiple PRs
    fs.writeFileSync(path.join(reportsDir, `${base}.json`), jsonReport);
    fs.writeFileSync(path.join(reportsDir, `${base}.md`), markdownReport);
    fs.writeFileSync(path.join(reportsDir, `${base}.html`), htmlReport);

    console.log('Review complete. Reports saved:');
    console.log(`  JSON:     ${path.resolve(reportsDir, 'report.json')}`);
    console.log(`  Markdown: ${path.resolve(reportsDir, 'report.md')}`);
    console.log(`  HTML:     ${path.resolve(reportsDir, 'report.html')}`);
    console.log(`  Overall score: ${report.summary.overallScore}/100`);
  } catch (error) {
    console.error(`Review failed: ${formatError(error)}`);
    process.exit(1);
  }
}

main();