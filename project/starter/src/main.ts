import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator } from './utils/index.js';

// Load environment variables
dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev <owner> <repo> <pr-number>
 */
async function main() {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!owner || !repo || !prStr || !Number.isInteger(Number(prStr))) {
    console.error('Usage: npm run dev <owner> <repo> <pr-number>');
    process.exit(1);
  }
  const prNumber = Number(prStr);

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

    fs.writeFileSync(path.join(reportsDir, `${base}.json`), generator.generateJSONReport(report));
    fs.writeFileSync(path.join(reportsDir, `${base}.md`), generator.generateMarkdownReport(report));
    fs.writeFileSync(path.join(reportsDir, `${base}.html`), generator.generateHTMLReport(report));

    console.log('Review complete. Reports saved:');
    console.log(`  JSON:     reports/${base}.json`);
    console.log(`  Markdown: reports/${base}.md`);
    console.log(`  HTML:     reports/${base}.html`);
    console.log(`  Overall score: ${report.summary.overallScore}/100`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();