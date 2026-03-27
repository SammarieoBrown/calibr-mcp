import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { CalibrClient } from '../client.js';
import type { ApiResult } from '../types.js';

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

export function registerKeysTools(server: McpServer, client: CalibrClient): void {
  // ---------------------------------------------------------------------------
  // list_api_keys — GET /api/v1/keys
  // ---------------------------------------------------------------------------
  server.tool('list_api_keys', 'List all API keys for the current account.', {}, async () => {
    const result = await client.get('/api/v1/keys');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // create_api_key — POST /api/v1/keys
  // ---------------------------------------------------------------------------
  server.tool(
    'create_api_key',
    'Create a new API key with optional scopes and environment.',
    {
      name: z.string().describe('Human-readable name for the API key'),
      scopes: z
        .array(z.string())
        .optional()
        .default(['score'])
        .describe("Permission scopes for the key (default: ['score'])"),
      environment: z
        .enum(['production', 'staging'])
        .optional()
        .default('production')
        .describe("Target environment for the key (default: 'production')"),
    },
    async ({ name, scopes, environment }) => {
      const result = await client.post('/api/v1/keys', { name, scopes, environment });
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // revoke_api_key — DELETE /api/v1/keys/{id}
  // ---------------------------------------------------------------------------
  server.tool(
    'revoke_api_key',
    'Permanently revoke an API key by its ID.',
    {
      key_id: z.string().describe('The ID of the API key to revoke'),
    },
    async ({ key_id }) => {
      const result = await client.delete(`/api/v1/keys/${key_id}`);
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // rotate_api_key — POST /api/v1/keys/{id}/rotate
  // ---------------------------------------------------------------------------
  server.tool(
    'rotate_api_key',
    'Rotate an API key, invalidating the old value and returning a new one.',
    {
      key_id: z.string().describe('The ID of the API key to rotate'),
    },
    async ({ key_id }) => {
      const result = await client.post(`/api/v1/keys/${key_id}/rotate`);
      return toolResult(result);
    },
  );
}
