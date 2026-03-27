import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';

export function registerModelsTools(server: McpServer, client: CalibrClient): void {
  // list_models — GET /api/v1/models
  server.tool(
    'calibr_list_models',
    'List all deployed credit risk scorecard models in the Calibr platform (api.cali-br.com). Returns model name, version, status, environment (production/staging), and deployer info. Use this to discover available models before scoring.',
    {},
    async () => {
      const result = await client.get('/v1/models');
      if (!result.ok) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: result.error.details
                ? `${result.error.error}: ${String(result.error.details)}`
                : result.error.error,
            },
          ],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    },
  );

  // get_model — GET /api/v1/models/{id}
  server.tool(
    'calibr_get_model',
    'Get full detail for a specific Calibr credit risk scorecard model including the complete spec with variable definitions, bins, weights, and WoE values. Use this to understand what input variables a model expects before scoring.',
    { model_id: z.string() },
    async ({ model_id }) => {
      const result = await client.get(`/v1/models/${model_id}`);
      if (!result.ok) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: result.error.details
                ? `${result.error.error}: ${String(result.error.details)}`
                : result.error.error,
            },
          ],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    },
  );

  // deploy_model — POST /api/v1/models/deploy
  server.tool(
    'calibr_deploy_model',
    'Deploy a Calibr credit risk scorecard model to production or staging. Requires the full scorecard spec JSON containing model definition, variables, bins, and weights. Returns the new model ID and deployment slug.',
    {
      spec: z.record(z.unknown()),
      environment: z.enum(['production', 'staging']),
      description: z.string().optional(),
      auto_deploy: z.boolean().optional().default(true),
    },
    async ({ spec, environment, description, auto_deploy }) => {
      const result = await client.post('/v1/models/deploy', {
        spec,
        environment,
        description: description ?? null,
        auto_deploy,
      });
      if (!result.ok) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: result.error.details
                ? `${result.error.error}: ${String(result.error.details)}`
                : result.error.error,
            },
          ],
        };
      }
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result.data, null, 2) }],
      };
    },
  );
}
