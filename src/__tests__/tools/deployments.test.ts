import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CalibrClient } from '../../client.js';
import { registerDeploymentsTools } from '../../tools/deployments.js';
import { mockApiServer, fixtures } from '../helpers/mock-api.js';

const BASE = 'https://api.cali-br.com';
const TEST_KEY = 'cal_test_abc123';

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helper — creates a linked MCP server+client pair with deployments tools
// ---------------------------------------------------------------------------
async function makeTestClient(apiKey = TEST_KEY) {
  const calibrClient = new CalibrClient({ apiKey, baseUrl: BASE });

  const mcpServer = new McpServer({ name: 'calibr-mcp-test', version: '0.0.1' });
  registerDeploymentsTools(mcpServer, calibrClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const mcpClient = new Client({ name: 'test-client', version: '0.0.1' });

  await mcpServer.connect(serverTransport);
  await mcpClient.connect(clientTransport);

  return mcpClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('list_deployments', () => {
  it('returns deployments list', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({ name: 'list_deployments', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.deploymentsList);
    expect(data.deployments).toHaveLength(2);
  });
});

describe('get_deployment', () => {
  it('returns deployment detail', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'get_deployment',
      arguments: { deployment_slug: 'retail-v2-prod' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.deployment);
    expect(data.slug).toBe('retail-v2-prod');
  });
});

describe('get_deployment_stats', () => {
  it('returns stats with total_scores=5000', async () => {
    mockApiServer.use(
      http.get(`${BASE}/api/v1/deployments/retail-v2-prod/stats`, () =>
        HttpResponse.json({ ...fixtures.deploymentStats, total_scores: 5000 }),
      ),
    );

    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'get_deployment_stats',
      arguments: { deployment_slug: 'retail-v2-prod' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data.total_scores).toBe(5000);
  });
});

describe('compare_models', () => {
  it('returns model comparison', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'compare_models',
      arguments: { deployment_slug: 'retail-v2-prod' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.deploymentCompare);
    expect(data.baseline).toBeDefined();
    expect(data.challenger).toBeDefined();
  });
});

describe('promote_challenger', () => {
  it('succeeds', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'promote_challenger',
      arguments: { deployment_slug: 'retail-v2-prod', challenger_id: 'mdl_def456' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.promoteSuccess);
    expect(data.success).toBe(true);
  });
});

describe('rollback_deployment', () => {
  it('succeeds', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'rollback_deployment',
      arguments: { deployment_slug: 'retail-v2-prod' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.rollbackSuccess);
    expect(data.success).toBe(true);
  });
});

describe('update_traffic', () => {
  it('succeeds', async () => {
    const client = await makeTestClient();
    const result = await client.callTool({
      name: 'update_traffic',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        challenger_id: 'mdl_def456',
        traffic_pct: 50,
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content[0] as { type: string; text: string }).text;
    const data = JSON.parse(text);
    expect(data).toEqual(fixtures.trafficSuccess);
    expect(data.traffic_pct).toBe(50);
  });
});

describe('error handling', () => {
  it('returns error on auth failure (list_deployments 401)', async () => {
    mockApiServer.use(
      http.get(`${BASE}/api/v1/deployments`, () =>
        HttpResponse.json({ error: 'unauthorized', details: 'Invalid API key' }, { status: 401 }),
      ),
    );

    const client = await makeTestClient('bad_key');
    const result = await client.callTool({ name: 'list_deployments', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain('401');
    expect(text).toContain('unauthorized');
  });
});
