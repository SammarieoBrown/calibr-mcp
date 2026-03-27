import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CalibrClient } from '../../client.js';
import { registerModelsTools } from '../../tools/models.js';
import { mockApiServer } from '../helpers/mock-api.js';

const BASE = 'https://api.cali-br.com';
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
async function makeConnectedClient(apiKey = TEST_KEY) {
  const calibrClient = new CalibrClient({ apiKey });
  const mcpServer = new McpServer({ name: 'calibr-test', version: '0.0.0' });
  registerModelsTools(mcpServer, calibrClient);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpClient = new Client({ name: 'test-client', version: '0.0.0' });

  await mcpServer.connect(serverTransport);
  await mcpClient.connect(clientTransport);

  return mcpClient;
}

// ---------------------------------------------------------------------------
// list_models
// ---------------------------------------------------------------------------
describe('list_models', () => {
  it('returns models list with length 1 and correct name', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/models`, () =>
        HttpResponse.json({
          models: [{ id: 'mdl_cc001', name: 'Credit Card Model', status: 'active' }],
          total: 1,
        }),
      ),
    );

    const client = await makeConnectedClient();
    const result = await client.callTool({ name: 'list_models', arguments: {} });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const data = JSON.parse(text) as { models: Array<{ name: string }>; total: number };
    expect(data.models).toHaveLength(1);
    expect(data.models[0].name).toBe('Credit Card Model');
  });

  it('returns error on auth failure (401)', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/models`, () =>
        HttpResponse.json({ error: 'unauthorized', details: 'Invalid API key' }, { status: 401 }),
      ),
    );

    const client = await makeConnectedClient('bad_key');
    const result = await client.callTool({ name: 'list_models', arguments: {} });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('unauthorized');
  });
});

// ---------------------------------------------------------------------------
// get_model
// ---------------------------------------------------------------------------
describe('get_model', () => {
  it('returns model detail', async () => {
    const modelDetail = {
      id: 'mdl_abc123',
      name: 'Credit Card Model',
      type: 'scorecard',
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
      spec: { variables: [], scorebands: [] },
    };

    mockApiServer.use(
      http.get(`${BASE}/v1/models/mdl_abc123`, () => HttpResponse.json(modelDetail)),
    );

    const client = await makeConnectedClient();
    const result = await client.callTool({
      name: 'get_model',
      arguments: { model_id: 'mdl_abc123' },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const data = JSON.parse(text) as typeof modelDetail;
    expect(data.id).toBe('mdl_abc123');
    expect(data.name).toBe('Credit Card Model');
  });

  it('returns error for missing model (404)', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/models/mdl_notfound`, () =>
        HttpResponse.json({ error: 'not_found', details: 'Model not found' }, { status: 404 }),
      ),
    );

    const client = await makeConnectedClient();
    const result = await client.callTool({
      name: 'get_model',
      arguments: { model_id: 'mdl_notfound' },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('not_found');
  });
});

// ---------------------------------------------------------------------------
// deploy_model
// ---------------------------------------------------------------------------
describe('deploy_model', () => {
  it('successfully deploys a model', async () => {
    const deployResult = {
      deployment_id: 'dep_xyz789',
      slug: 'credit-card-prod',
      status: 'deploying',
      created_at: '2024-01-15T12:00:00Z',
    };

    mockApiServer.use(
      http.post(`${BASE}/v1/models/deploy`, () =>
        HttpResponse.json(deployResult, { status: 201 }),
      ),
    );

    const client = await makeConnectedClient();
    const result = await client.callTool({
      name: 'deploy_model',
      arguments: {
        spec: { variables: ['age', 'income'], scorebands: [{ min: 0, max: 100, grade: 'A' }] },
        environment: 'production',
        description: 'Initial credit card model deploy',
        auto_deploy: true,
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const data = JSON.parse(text) as typeof deployResult;
    expect(data.deployment_id).toBe('dep_xyz789');
    expect(data.status).toBe('deploying');
  });

  it('returns error for invalid spec (422)', async () => {
    mockApiServer.use(
      http.post(`${BASE}/v1/models/deploy`, () =>
        HttpResponse.json(
          { error: 'validation_error', details: 'Spec is missing required fields' },
          { status: 422 },
        ),
      ),
    );

    const client = await makeConnectedClient();
    const result = await client.callTool({
      name: 'deploy_model',
      arguments: {
        spec: {},
        environment: 'staging',
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('validation_error');
  });
});
