import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CalibrClient } from '../../client.js';
import { registerKeysTools } from '../../tools/keys.js';
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
  registerKeysTools(server, client);
  return { server, client };
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown> = {},
) {
  // Access the registered tools via the internal handler
  const handler = (server as unknown as { _registeredTools: Record<string, { handler: (args: Record<string, unknown>) => Promise<unknown> }> })._registeredTools[name];
  if (!handler) throw new Error(`Tool not found: ${name}`);
  return handler.handler(args);
}

// ---------------------------------------------------------------------------
// list_api_keys
// ---------------------------------------------------------------------------
describe('list_api_keys', () => {
  it('returns the list of API keys', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'list_api_keys');
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.keysList;
    expect(data.keys).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// create_api_key
// ---------------------------------------------------------------------------
describe('create_api_key', () => {
  it('creates a new key and returns a secret key value', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'create_api_key', {
      name: 'New Key',
      scopes: ['score'],
      environment: 'production',
    });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.newApiKey;
    expect(data.key).toBeDefined();
    expect(typeof data.key).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// revoke_api_key
// ---------------------------------------------------------------------------
describe('revoke_api_key', () => {
  it('revokes the key and returns success', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'revoke_api_key', { key_id: 'key_001' });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.deleteSuccess;
    expect(data.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rotate_api_key
// ---------------------------------------------------------------------------
describe('rotate_api_key', () => {
  it('rotates the key and returns the new key value', async () => {
    const { server } = makeSetup();
    const result = await callTool(server, 'rotate_api_key', { key_id: 'key_001' });
    const typed = result as { content: Array<{ type: string; text: string }> };
    expect(typed.content[0].type).toBe('text');
    const data = JSON.parse(typed.content[0].text) as typeof fixtures.rotatedKey;
    expect(data.key).toBeDefined();
    expect(typeof data.key).toBe('string');
  });
});
