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
    'calibr_list_deployments',
    'List all active Calibr credit risk scorecard deployments. Each deployment has a slug (e.g. dep_WAUM), a champion model, and optionally challenger models for A/B testing. Use this to find deployment slugs for scoring.',
    {},
    async () => {
      const result = await client.get('/v1/deployments');
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // get_deployment — GET /api/v1/deployments/{slug}
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_get_deployment',
    'Get full detail for a Calibr deployment including champion model, challenger models, traffic split percentages, and shadow mode status. Use the deployment slug (e.g. dep_WAUM).',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/v1/deployments/${deployment_slug}`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // get_deployment_stats — GET /api/v1/deployments/{slug}/stats
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_get_deployment_stats',
    'Get live scoring statistics for a Calibr deployment: total scores processed, average score, average latency, and recent scoring activity. Use the deployment slug (e.g. dep_WAUM).',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/v1/deployments/${deployment_slug}/stats`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // compare_models — GET /api/v1/deployments/{slug}/compare
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_compare_models',
    'Compare champion vs challenger model performance for a Calibr deployment. Shows score distributions, average scores, and key metrics to decide whether to promote the challenger.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.get(`/v1/deployments/${deployment_slug}/compare`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // promote_challenger — POST /api/v1/deployments/{slug}/promote
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_promote_challenger',
    'Promote a challenger model to champion in a Calibr deployment. This replaces the current champion and deactivates all challengers. Requires admin permissions. This is a production-impacting action.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
      challenger_id: z.string().describe('The ID of the challenger model to promote'),
    },
    async ({ deployment_slug, challenger_id }) => {
      const result = await client.post(`/v1/deployments/${deployment_slug}/promote`, {
        challenger_id,
      });
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // rollback_deployment — POST /api/v1/deployments/{slug}/rollback
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_rollback_deployment',
    'Rollback a Calibr deployment to its previous champion model. Use this if a recently promoted model is underperforming. Requires admin permissions.',
    {
      deployment_slug: z.string().describe('The deployment slug identifier'),
    },
    async ({ deployment_slug }) => {
      const result = await client.post(`/v1/deployments/${deployment_slug}/rollback`);
      return toolResult(result);
    },
  );

  // -------------------------------------------------------------------------
  // update_traffic — PATCH /api/v1/deployments/{slug}/traffic
  // -------------------------------------------------------------------------
  server.tool(
    'calibr_update_traffic',
    'Adjust the traffic split between champion and challenger models in a Calibr deployment. Set what percentage of scoring requests go to the challenger (0-100).',
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
      const result = await client.patch(`/v1/deployments/${deployment_slug}/traffic`, {
        challenger_id,
        traffic_pct,
      });
      return toolResult(result);
    },
  );
}
