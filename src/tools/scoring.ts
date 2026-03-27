import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';

export function registerScoringTools(server: McpServer, client: CalibrClient): void {
  // ---------------------------------------------------------------------------
  // score_applicant — POST /api/v1/score/{slug}
  // ---------------------------------------------------------------------------
  server.tool(
    'score_applicant',
    'Score a single credit applicant against a deployed model. Returns a credit score, probability of default, and grade.',
    {
      deployment_slug: z.string().describe('The deployment slug to score against'),
      applicant: z
        .record(z.any())
        .describe('Applicant feature data as key-value pairs (e.g. age, income, loan_amount)'),
    },
    async ({ deployment_slug, applicant }) => {
      const result = await client.post(`/api/v1/score/${deployment_slug}`, applicant);

      if (!result.ok) {
        const msg = result.error.details
          ? `${result.error.error}: ${String(result.error.details)}`
          : result.error.error;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Error ${result.status}: ${msg}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // score_batch — POST /api/v1/score/{slug}/batch
  // ---------------------------------------------------------------------------
  server.tool(
    'score_batch',
    'Score a batch of credit applicants (up to 1000) against a deployed model in a single request.',
    {
      deployment_slug: z.string().describe('The deployment slug to score against'),
      applicants: z
        .array(z.record(z.any()))
        .max(1000)
        .describe('Array of applicant feature records to score (max 1000)'),
    },
    async ({ deployment_slug, applicants }) => {
      const result = await client.post(`/api/v1/score/${deployment_slug}/batch`, { applicants });

      if (!result.ok) {
        const msg = result.error.details
          ? `${result.error.error}: ${String(result.error.details)}`
          : result.error.error;
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Error ${result.status}: ${msg}` }],
        };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    },
  );
}
