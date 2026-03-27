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
  server.tool('calibr_list_api_keys', 'List all Calibr API keys for your organization. Shows key prefix, scopes (score, read, admin), environment (production/staging), and last used date. Full key values are never returned.', {}, async () => {
    const result = await client.get('/v1/keys');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // create_api_key — POST /api/v1/keys
  // ---------------------------------------------------------------------------
  server.tool(
    'calibr_create_api_key',
    'Create a new Calibr API key. Returns the full key value ONCE — store it securely as it cannot be retrieved again. Requires admin permissions.',
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
      const result = await client.post('/v1/keys', { name, scopes, environment });
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // revoke_api_key — DELETE /api/v1/keys/{id}
  // ---------------------------------------------------------------------------
  server.tool(
    'calibr_revoke_api_key',
    'Permanently revoke a Calibr API key. This cannot be undone — the key will immediately stop working. Requires admin permissions.',
    {
      key_id: z.string().describe('The ID of the API key to revoke'),
    },
    async ({ key_id }) => {
      const result = await client.delete(`/v1/keys/${key_id}`);
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // rotate_api_key — POST /api/v1/keys/{id}/rotate
  // ---------------------------------------------------------------------------
  server.tool(
    'calibr_rotate_api_key',
    'Rotate a Calibr API key — generates a new key value and invalidates the old one. Returns the new full key value ONCE. Requires admin permissions.',
    {
      key_id: z.string().describe('The ID of the API key to rotate'),
    },
    async ({ key_id }) => {
      const result = await client.post(`/v1/keys/${key_id}/rotate`);
      return toolResult(result);
    },
  );
}
