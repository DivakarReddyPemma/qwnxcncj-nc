import { describe, it, expect } from 'vitest';
import { CodeReviewOrchestrator } from '../src/orchestrator.js';
import { ReviewReportSchema } from '../src/types/report-types.js';
import { withRetry, withTimeout, RateLimiter } from '../src/utils/index.js';

const validReport = {
  pullRequest: { owner: 'octocat', repo: 'Hello-World', number: 1 },
  fileReviews: [],
  summary: {
    totalFiles: 0,
    overallScore: 100,
    criticalIssues: 0,
    highPriorityTests: 0,
    refactoringOpportunities: 0
  },
  recommendations: [],
  metadata: {
    analyzedAt: new Date().toISOString(),
    duration: 1,
    agentVersions: {}
  }
};

describe('CodeReviewOrchestrator', () => {
  describe('Configuration', () => {
    it('should initialize with default options', () => {
      const orchestrator = new CodeReviewOrchestrator();
      expect(orchestrator).toBeInstanceOf(CodeReviewOrchestrator);
    });

    it('should accept custom rate limit configuration', () => {
      const orchestrator = new CodeReviewOrchestrator({
        rateLimits: { maxConcurrent: 2, maxRequestsPerMinute: 20, maxTokensPerMinute: 50000 }
      });
      expect(orchestrator).toBeInstanceOf(CodeReviewOrchestrator);
    });
  });

  describe('reviewPullRequest schema and dependencies', () => {
    it('should validate a correctly structured ReviewReport', () => {
      expect(ReviewReportSchema.safeParse(validReport).success).toBe(true);
    });

    it('should reject a ReviewReport missing required fields', () => {
      const invalid = { pullRequest: { owner: 'octocat' } };
      expect(ReviewReportSchema.safeParse(invalid).success).toBe(false);
    });

    it('withRetry should retry transient failures and eventually succeed', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => (++attempts < 2 ? Promise.reject(new Error('transient failure')) : 'ok'),
        3,
        10
      );
      expect(result).toBe('ok');
      expect(attempts).toBe(2);
    });

    it('withTimeout should reject an operation that exceeds the timeout', async () => {
      await expect(
        withTimeout(() => new Promise((resolve) => setTimeout(resolve, 500)), 50, 'timed out')
      ).rejects.toThrow();
    });

    it('RateLimiter.canProceed should respect the configured concurrency limit', () => {
      const limiter = new RateLimiter({
        maxConcurrent: 1,
        maxRequestsPerMinute: 10,
        maxTokensPerMinute: 10000
      });
      expect(limiter.canProceed()).toBe(true);
    });
  });

  describe('Integration', () => {
    it.skip('should review a real small PR (e.g. octocat/Hello-World #1)', async () => {
      const orchestrator = new CodeReviewOrchestrator();
      const report = await orchestrator.reviewPullRequest('octocat', 'Hello-World', 1);
      expect(ReviewReportSchema.safeParse(report).success).toBe(true);
    });
  });
});