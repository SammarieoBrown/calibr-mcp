import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCalibrMcpServer } from '../../server.js';
import { mockApiServer, fixtures } from '../helpers/mock-api.js';

// ---------------------------------------------------------------------------
// Mock API server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helper: build a connected server+client pair via InMemoryTransport
// ---------------------------------------------------------------------------
async function buildPair(apiKey = 'cal_test_abc123', baseUrl?: string) {
  const server = createCalibrMcpServer({ apiKey, baseUrl });
  const client = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

// ---------------------------------------------------------------------------
// 1. Client can list all 23 tools
// ---------------------------------------------------------------------------
describe('client can list all 23 tools', () => {
  it('returns exactly 23 tools with expected names', async () => {
    const { server, client } = await buildPair();

    const { tools } = await client.listTools();

    expect(tools.length).toBe(23);

    const names = tools.map((t) => t.name);
    // Scoring
    expect(names).toContain('score_applicant');
    expect(names).toContain('score_batch');
    // Models
    expect(names).toContain('list_models');
    expect(names).toContain('get_model');
    expect(names).toContain('deploy_model');
    // Deployments
    expect(names).toContain('list_deployments');
    expect(names).toContain('get_deployment');
    expect(names).toContain('get_deployment_stats');
    expect(names).toContain('compare_models');
    expect(names).toContain('promote_challenger');
    expect(names).toContain('rollback_deployment');
    expect(names).toContain('update_traffic');
    // Keys
    expect(names).toContain('list_api_keys');
    expect(names).toContain('create_api_key');
    expect(names).toContain('revoke_api_key');
    expect(names).toContain('rotate_api_key');
    // Webhooks
    expect(names).toContain('list_webhooks');
    expect(names).toContain('create_webhook');
    expect(names).toContain('delete_webhook');
    expect(names).toContain('test_webhook');
    // Observability
    expect(names).toContain('get_usage');
    expect(names).toContain('get_usage_history');
    expect(names).toContain('get_audit_log');

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// 2. Client can call score_applicant and get score=724
// ---------------------------------------------------------------------------
describe('client can call score_applicant', () => {
  it('returns score=724 in response', async () => {
    mockApiServer.use(
      http.post('https://api.cali-br.com/v1/score/retail-v2-prod', () =>
        HttpResponse.json({ ...fixtures.scoreResult, score: 724, grade: 'A' }),
      ),
    );

    const { server, client } = await buildPair();

    const result = await client.callTool({
      name: 'score_applicant',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        applicant: { age: 35, income: 55000 },
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.score).toBe(724);

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// 3. Client can call list_models and get models array
// ---------------------------------------------------------------------------
describe('client can call list_models', () => {
  it('returns models array', async () => {
    const { server, client } = await buildPair();

    const result = await client.callTool({ name: 'list_models', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed.models)).toBe(true);
    expect(parsed.models.length).toBeGreaterThan(0);

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// 4. Each tool has description and inputSchema
// ---------------------------------------------------------------------------
describe('each tool has description and input schema', () => {
  it('all 23 tools have truthy descriptions and inputSchema', async () => {
    const { server, client } = await buildPair();

    const { tools } = await client.listTools();

    for (const tool of tools) {
      expect(tool.description, `${tool.name} is missing a description`).toBeTruthy();
      expect(tool.inputSchema, `${tool.name} is missing inputSchema`).toBeDefined();
    }

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// 5. Error responses are properly formatted for bad baseUrl
// ---------------------------------------------------------------------------
describe('error responses are properly formatted', () => {
  it('returns isError=true with network_error when baseUrl is unreachable', async () => {
    // Register an error handler so msw intercepts and simulates a network failure
    mockApiServer.use(
      http.get('https://unreachable.calibr.invalid/v1/models', () => HttpResponse.error()),
    );

    const { server, client } = await buildPair('cal_test_bad', 'https://unreachable.calibr.invalid');

    const result = await client.callTool({ name: 'list_models', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('network_error');

    await client.close();
    await server.close();
  });
});

// ---------------------------------------------------------------------------
// 6. Multiple sessions work independently
// ---------------------------------------------------------------------------
describe('multiple sessions work independently', () => {
  it('two server/client pairs with different API keys both see 23 tools', async () => {
    const pair1 = await buildPair('cal_live_key_one');
    const pair2 = await buildPair('cal_live_key_two');

    const [result1, result2] = await Promise.all([
      pair1.client.listTools(),
      pair2.client.listTools(),
    ]);

    expect(result1.tools.length).toBe(23);
    expect(result2.tools.length).toBe(23);

    await Promise.all([
      pair1.client.close(),
      pair1.server.close(),
      pair2.client.close(),
      pair2.server.close(),
    ]);
  });
});
