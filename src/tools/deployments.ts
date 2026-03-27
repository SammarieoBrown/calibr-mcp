import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';
import type { ApiResult } from '../types.js';

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------
function toolResult(result: ApiResult<unknown>) {
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

// ---------------------------------------------------------------------------
// Register all deployment tools
// ---------------------------------------------------------------------------
export function registerDeploymentsTools(server: McpServer, client: CalibrClient): void {
  // -------------------------------------------------------------------------
  // list_deployments — GET /api/v1/deployments
  // -------------------------------------------------------------------------
  server.tool(
    'list_deployments',
    'List all model deployments in the Calibr platform.',
    {},
    async () => {
      const result = await client.get('/api/v1/deployments');
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // get_deployment — GET /api/v1/deployments/{slug}
  // -------------------------------------------------------------------------
  server.tool(
    'get_deployment',
    'Get details for a specific deployment by its slug.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/api/v1/deployments/${deployment_slug}`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // get_deployment_stats — GET /api/v1/deployments/{slug}/stats
  // -------------------------------------------------------------------------
  server.tool(
    'get_deployment_stats',
    'Get performance statistics for a specific deployment (requests, latency, error rate).',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/api/v1/deployments/${deployment_slug}/stats`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // compare_models — GET /api/v1/deployments/{slug}/compare
  // -------------------------------------------------------------------------
  server.tool(
    'compare_models',
    'Compare the champion and challenger models for a deployment to support promotion decisions.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/api/v1/deployments/${deployment_slug}/compare`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // promote_challenger — POST /api/v1/deployments/{slug}/promote
  // -------------------------------------------------------------------------
  server.tool(
    'promote_challenger',
    'Promote the challenger model to champion status for a deployment.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
      challenger_id: z.string().describe('The ID of the challenger model to promote'),
    },
    async ({ deployment_slug, challenger_id }) => {
      const result = await client.post(`/api/v1/deployments/${deployment_slug}/promote`, {
        challenger_id,
      });
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // rollback_deployment — POST /api/v1/deployments/{slug}/rollback
  // -------------------------------------------------------------------------
  server.tool(
    'rollback_deployment',
    'Roll back a deployment to the previous champion model version.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.post(`/api/v1/deployments/${deployment_slug}/rollback`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // update_traffic — PATCH /api/v1/deployments/{slug}/traffic
  // -------------------------------------------------------------------------
  server.tool(
    'update_traffic',
    'Update the traffic split percentage sent to the challenger model for A/B testing.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
      challenger_id: z.string().describe('The ID of the challenger model receiving traffic'),
      traffic_pct: z
        .number()
        .min(0)
        .max(100)
        .describe('Percentage of traffic (0-100) to route to the challenger model'),
    },
    async ({ deployment_slug, challenger_id, traffic_pct }) => {
      const result = await client.patch(`/api/v1/deployments/${deployment_slug}/traffic`, {
        challenger_id,
        traffic_pct,
      });
      return toolResult(result);
    },
  );
}
