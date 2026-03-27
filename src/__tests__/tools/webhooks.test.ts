import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CalibrClient } from '../../client.js';
import { registerWebhooksTools } from '../../tools/webhooks.js';
import { mockApiServer, fixtures } from '../helpers/mock-api.js';

const TEST_KEY = 'cal_test_abc123';

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSetup() {
  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const client = new CalibrClient({ apiKey: TEST_KEY });
  registerWebhooksTools(server, client);
  return { server, client };
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown> = {},
) {
  const handler = (server as unknown as { _registeredTools: Record<string, { handler: (args: Record<string, unknown>) => Promise<unknown> }> })._registeredTools[name];
  if (!handler) throw new Error(`Tool not found: ${name}`);
  return handler.handler(args);
}

// ---------------------------------------------------------------------------
// list_webhooks
// ---------------------------------------------------------------------------
describe('calibr_list_webhooks', () => {
  it('returns the list of webhooks', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'calibr_list_webhooks');
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.webhooksList;
    expect(data.webhooks).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// create_webhook
// ---------------------------------------------------------------------------
describe('calibr_create_webhook', () => {
  it('creates a new webhook and returns the webhook data', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'calibr_create_webhook', {
      name: 'My Webhook',
      url: 'https://myapp.example.com/webhooks/calibr-new',
      events: ['score.completed'],
    });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.newWebhook;
    expect(data.id).toBeDefined();
    expect(data.url).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// delete_webhook
// ---------------------------------------------------------------------------
describe('calibr_delete_webhook', () => {
  it('deletes a webhook and returns success', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'calibr_delete_webhook', { webhook_id: 'wh_001' });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.deleteSuccess;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// test_webhook
// ---------------------------------------------------------------------------
describe('calibr_test_webhook', () => {
  it('sends a test event and returns the result', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'calibr_test_webhook', { webhook_id: 'wh_001' });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.webhookTestResult;
    expect(data.success).toBe(true);
    expect(data.status_code).toBe(200);
  });
});
