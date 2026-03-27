import { beforeAll, afterAll, afterEach, beforeEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CalibrClient } from '../../client.js';
import { registerObservabilityTools } from '../../tools/observability.js';
import { mockApiServer, fixtures } from '../helpers/mock-api.js';

const TEST_KEY = 'cal_test_abc123';

// ---------------------------------------------------------------------------
// Mock API server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helper — create a wired-up McpServer + MCP Client pair
// ---------------------------------------------------------------------------
async function setup() {
  const calibrClient = new CalibrClient({ apiKey: TEST_KEY });

  const mcpServer = new McpServer({ name: 'calibr-test', version: '0.0.1' });
  registerObservabilityTools(mcpServer, calibrClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const mcpClient = new Client({ name: 'test-client', version: '0.0.1' });

  await mcpServer.connect(serverTransport);
  await mcpClient.connect(clientTransport);

  return { mcpClient, mcpServer };
}

// ---------------------------------------------------------------------------
// get_usage
// ---------------------------------------------------------------------------
describe('calibr_get_usage', () => {
  it('returns current month usage including score_count and plan_tier', async () => {
    mockApiServer.use(
      http.get('https://api.cali-br.com/v1/usage', () =>
        HttpResponse.json({
          period: '2024-01',
          score_count: 1500,
          plan_tier: 'pro',
          total_requests: 1500,
          limit: 100000,
        }),
      ),
    );

    const { mcpClient } = await setup();
    const result = await mcpClient.callTool({ name: 'calibr_get_usage', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data.score_count).toBe(1500);
    expect(data.plan_tier).toBe('pro');
  });
});

// ---------------------------------------------------------------------------
// get_usage_history
// ---------------------------------------------------------------------------
describe('calibr_get_usage_history', () => {
  it('returns usage history across past months', async () => {
    const { mcpClient } = await setup();
    const result = await mcpClient.callTool({ name: 'calibr_get_usage_history', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.usageHistory);
    expect(Array.isArray(data.history)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// get_audit_log
// ---------------------------------------------------------------------------
describe('calibr_get_audit_log', () => {
  it('returns audit log entries', async () => {
    mockApiServer.use(
      http.get('https://api.cali-br.com/v1/audit', () =>
        HttpResponse.json({
          events: [
            {
              id: 'evt_001',
              action: 'deployment.promoted',
              actor: 'user@example.com',
              timestamp: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
        }),
      ),
    );

    const { mcpClient } = await setup();
    const result = await mcpClient.callTool({ name: 'calibr_get_audit_log', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data.events.length).toBe(1);
  });

  it('passes filter params (action, page, limit) as query params', async () => {
    let capturedUrl: string | null = null;

    mockApiServer.use(
      http.get('https://api.cali-br.com/v1/audit', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          events: [
            {
              id: 'evt_001',
              action: 'deployment.promoted',
              actor: 'user@example.com',
              timestamp: '2024-01-15T10:00:00Z',
            },
          ],
          total: 1,
        });
      }),
    );

    const { mcpClient } = await setup();
    const result = await mcpClient.callTool({
      name: 'calibr_get_audit_log',
      arguments: { action: 'deployment.promoted', page: 2, limit: 25 },
    });

    expect(result.isError).toBeFalsy();
    expect(capturedUrl).not.toBeNull();
    expect(capturedUrl).toContain('action=deployment.promoted');
    expect(capturedUrl).toContain('page=2');
    expect(capturedUrl).toContain('limit=25');
  });
});
