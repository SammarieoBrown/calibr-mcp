import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCalibrMcpServer } from '../../server.js';
import { mockApiServer } from '../helpers/mock-api.js';

// ---------------------------------------------------------------------------
// Mock API server lifecycle
// ---------------------------------------------------------------------------
beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

// ---------------------------------------------------------------------------
// Helper: build a connected server+client pair (simulates one HTTP session)
// ---------------------------------------------------------------------------
async function buildSession(apiKey: string, baseUrl?: string) {
  const server = createCalibrMcpServer({ apiKey, baseUrl });
  const client = new Client({ name: 'http-session-client', version: '0.0.1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { server, client };
}

// ---------------------------------------------------------------------------
// 1. Separate servers for different API keys
// ---------------------------------------------------------------------------
describe('separate servers for different API keys', () => {
  it('two sessions each see 23 tools independently', async () => {
    const session1 = await buildSession('cal_live_session_one');
    const session2 = await buildSession('cal_live_session_two');

    const [tools1, tools2] = await Promise.all([
      session1.client.listTools(),
      session2.client.listTools(),
    ]);

    expect(tools1.tools.length).toBe(23);
    expect(tools2.tools.length).toBe(23);

    // Sessions are independent — same tool names in both
    const names1 = tools1.tools.map((t) => t.name).sort();
    const names2 = tools2.tools.map((t) => t.name).sort();
    expect(names1).toEqual(names2);

    await Promise.all([
      session1.client.close(),
      session1.server.close(),
      session2.client.close(),
      session2.server.close(),
    ]);
  });
});

// ---------------------------------------------------------------------------
// 2. Server handles concurrent tool calls
// ---------------------------------------------------------------------------
describe('server handles concurrent tool calls', () => {
  it('three parallel tool calls all succeed', async () => {
    const { server, client } = await buildSession('cal_live_concurrent');

    const [modelsResult, usageResult, deploymentsResult] = await Promise.all([
      client.callTool({ name: 'list_models', arguments: {} }),
      client.callTool({ name: 'get_usage', arguments: {} }),
      client.callTool({ name: 'list_deployments', arguments: {} }),
    ]);

    expect(modelsResult.isError).toBeFalsy();
    expect(usageResult.isError).toBeFalsy();
    expect(deploymentsResult.isError).toBeFalsy();

    // Verify each returned meaningful data
    const modelsText = (modelsResult.content as Array<{ type: string; text: string }>)[0].text;
    const usageText = (usageResult.content as Array<{ type: string; text: string }>)[0].text;
    const deploymentsText = (deploymentsResult.content as Array<{ type: string; text: string }>)[0]
      .text;

    expect(JSON.parse(modelsText).models).toBeDefined();
    expect(JSON.parse(usageText).total_requests).toBeDefined();
    expect(JSON.parse(deploymentsText).deployments).toBeDefined();

    await client.close();
    await server.close();
  });
});
