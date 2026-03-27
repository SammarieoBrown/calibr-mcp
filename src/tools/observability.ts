import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';

function toolResult(result: Awaited<ReturnType<CalibrClient['get']>>) {
  if (!result.ok) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `Failed (${result.status}): ${result.error?.error}`,
        },
      ],
    };
  }
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
  };
}

export function registerObservabilityTools(server: McpServer, client: CalibrClient): void {
  // ---------------------------------------------------------------------------
  // get_usage — GET /api/v1/usage
  // ---------------------------------------------------------------------------
  server.tool('calibr_get_usage', 'Get the current month Calibr API usage for your organization: total score count, batch count, batch record count, plan tier, usage limit, and overage costs.', {}, async () => {
    const result = await client.get('/v1/usage');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // get_usage_history — GET /api/v1/usage/history
  // ---------------------------------------------------------------------------
  server.tool('calibr_get_usage_history', 'Get historical Calibr API usage data across previous months. Shows scoring volumes and costs over time.', {}, async () => {
    const result = await client.get('/v1/usage/history');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // get_audit_log — GET /api/v1/audit
  // ---------------------------------------------------------------------------
  server.tool(
    'calibr_get_audit_log',
    'Get Calibr audit log entries for your organization. Tracks all actions: model deployments, promotions, rollbacks, key operations, and more. Supports filtering by action type and pagination.',
    {
      action: z.string().optional().describe('Filter by action type (e.g. deployment.promoted)'),
      page: z.number().default(1).describe('Page number (default 1)'),
      limit: z.number().max(100).default(50).describe('Results per page (default 50, max 100)'),
    },
    async ({ action, page, limit }) => {
      const query: Record<string, string | number | undefined> = { page, limit };
      if (action !== undefined) {
        query['action'] = action;
      }
      const result = await client.get('/v1/audit', query);
      return toolResult(result);
    },
  );
}
