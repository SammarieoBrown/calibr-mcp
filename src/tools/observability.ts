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
  server.tool('get_usage', 'Get current month API usage.', {}, async () => {
    const result = await client.get('/api/v1/usage');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // get_usage_history — GET /api/v1/usage/history
  // ---------------------------------------------------------------------------
  server.tool('get_usage_history', 'Get historical API usage across past months.', {}, async () => {
    const result = await client.get('/api/v1/usage/history');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // get_audit_log — GET /api/v1/audit
  // ---------------------------------------------------------------------------
  server.tool(
    'get_audit_log',
    'Get the audit log of account actions, optionally filtered by action type.',
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
      const result = await client.get('/api/v1/audit', query);
      return toolResult(result);
    },
  );
}
