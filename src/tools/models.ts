import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';

export function registerModelsTools(server: McpServer, client: CalibrClient): void {
  // list_models — GET /api/v1/models
  server.tool(
    'list_models',
    'List all deployed scorecard models for your organization.',
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
    'get_model',
    'Get full detail for a specific deployed model, including the scorecard spec.',
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
    'deploy_model',
    'Deploy a scorecard model to an environment.',
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
