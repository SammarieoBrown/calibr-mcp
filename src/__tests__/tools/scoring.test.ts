import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CalibrClient } from '../../client.js';
import { registerScoringTools } from '../../tools/scoring.js';
import { mockApiServer, fixtures } from '../helpers/mock-api.js';

const TEST_KEY = 'cal_test_abc123';

// ---------------------------------------------------------------------------
// Mock server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function buildMcpClient() {
  const calibrClient = new CalibrClient({ apiKey: TEST_KEY });
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerScoringTools(server, calibrClient);

  const mcpClient = new Client({ name: 'test-client', version: '0.0.1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), mcpClient.connect(clientTransport)]);

  return mcpClient;
}

// ---------------------------------------------------------------------------
// score_applicant
// ---------------------------------------------------------------------------
describe('score_applicant', () => {
  it('returns score on success', async () => {
    // Override with a fixture that has score=724, grade='A'
    mockApiServer.use(
      http.post('https://api.cali-br.com/v1/score/retail-v2-prod', () =>
        HttpResponse.json({ ...fixtures.scoreResult, score: 724, grade: 'A' }),
      ),
    );

    const mcpClient = await buildMcpClient();
    const result = await mcpClient.callTool({
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
    expect(parsed.grade).toBe('A');
  });

  it('returns error for auth failure (401)', async () => {
    mockApiServer.use(
      http.post('https://api.cali-br.com/v1/score/retail-v2-prod', () =>
        HttpResponse.json({ error: 'unauthorized', details: 'Invalid API key' }, { status: 401 }),
      ),
    );

    const mcpClient = await buildMcpClient();
    const result = await mcpClient.callTool({
      name: 'score_applicant',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        applicant: { age: 35 },
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('401');
    expect(text).toContain('unauthorized');
  });

  it('returns error for rate limiting (429)', async () => {
    mockApiServer.use(
      http.post('https://api.cali-br.com/v1/score/retail-v2-prod', () =>
        HttpResponse.json(
          { error: 'rate_limit_exceeded', retry_after_ms: 5000 },
          { status: 429 },
        ),
      ),
    );

    const mcpClient = await buildMcpClient();
    const result = await mcpClient.callTool({
      name: 'score_applicant',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        applicant: { age: 35 },
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('429');
    expect(text).toContain('rate_limit_exceeded');
  });
});

// ---------------------------------------------------------------------------
// score_batch
// ---------------------------------------------------------------------------
describe('score_batch', () => {
  it('returns results on success', async () => {
    const mcpClient = await buildMcpClient();
    const result = await mcpClient.callTool({
      name: 'score_batch',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        applicants: [
          { age: 35, income: 55000 },
          { age: 45, income: 80000 },
        ],
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.results).toBeDefined();
    expect(parsed.total).toBe(2);
  });

  it('returns error on failure', async () => {
    mockApiServer.use(
      http.post('https://api.cali-br.com/v1/score/retail-v2-prod/batch', () =>
        HttpResponse.json(
          { error: 'validation_error', details: 'Applicants array is empty' },
          { status: 422 },
        ),
      ),
    );

    const mcpClient = await buildMcpClient();
    const result = await mcpClient.callTool({
      name: 'score_batch',
      arguments: {
        deployment_slug: 'retail-v2-prod',
        applicants: [],
      },
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('422');
    expect(text).toContain('validation_error');
  });
});
