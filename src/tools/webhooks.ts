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

export function registerWebhooksTools(server: McpServer, client: CalibrClient): void {
  // ---------------------------------------------------------------------------
  // list_webhooks — GET /api/v1/webhooks
  // ---------------------------------------------------------------------------
  server.tool('list_webhooks', 'List all registered webhooks for the current account.', {}, async () => {
    const result = await client.get('/api/v1/webhooks');
    return toolResult(result);
  });

  // ---------------------------------------------------------------------------
  // create_webhook — POST /api/v1/webhooks
  // ---------------------------------------------------------------------------
  server.tool(
    'create_webhook',
    'Register a new webhook endpoint to receive Calibr event notifications.',
    {
      name: z.string().describe('Human-readable name for the webhook'),
      url: z.string().url().describe('HTTPS URL that will receive webhook POST requests'),
      events: z
        .array(z.string())
        .min(1)
        .describe('One or more event types to subscribe to (e.g. score.completed, deployment.promoted)'),
      secret: z
        .string()
        .optional()
        .describe('Optional signing secret used to verify webhook payloads'),
    },
    async ({ name, url, events, secret }) => {
      const body: Record<string, unknown> = { name, url, events };
      if (secret !== undefined) body.secret = secret;
      const result = await client.post('/api/v1/webhooks', body);
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // delete_webhook — DELETE /api/v1/webhooks/{id}
  // ---------------------------------------------------------------------------
  server.tool(
    'delete_webhook',
    'Delete a webhook endpoint by its ID, stopping all future deliveries.',
    {
      webhook_id: z.string().describe('The ID of the webhook to delete'),
    },
    async ({ webhook_id }) => {
      const result = await client.delete(`/api/v1/webhooks/${webhook_id}`);
      return toolResult(result);
    },
  );

  // ---------------------------------------------------------------------------
  // test_webhook — POST /api/v1/webhooks/{id}/test
  // ---------------------------------------------------------------------------
  server.tool(
    'test_webhook',
    'Send a test event to a webhook endpoint to verify it is reachable and responding correctly.',
    {
      webhook_id: z.string().describe('The ID of the webhook to test'),
    },
    async ({ webhook_id }) => {
      const result = await client.post(`/api/v1/webhooks/${webhook_id}/test`);
      return toolResult(result);
    },
  );
}
