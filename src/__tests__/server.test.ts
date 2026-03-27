import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCalibrMcpServer } from '../server.js';
import { mockApiServer } from './helpers/mock-api.js';

beforeAll(() => mockApiServer.listen({ onUnhandledRequest: 'error' }));
afterEach(() => mockApiServer.resetHandlers());
afterAll(() => mockApiServer.close());

describe('createCalibrMcpServer', () => {
  it('registers all 23 tools', async () => {
    const server = createCalibrMcpServer({ apiKey: 'test' });
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);

    const { tools } = await client.listTools();
    expect(tools.length).toBe(23);

    const names = tools.map((t) => t.name);
    expect(names).toContain('score_applicant');
    expect(names).toContain('score_batch');
    expect(names).toContain('list_models');
    expect(names).toContain('get_model');
    expect(names).toContain('deploy_model');
    expect(names).toContain('list_deployments');
    expect(names).toContain('get_deployment');
    expect(names).toContain('get_deployment_stats');
    expect(names).toContain('compare_models');
    expect(names).toContain('promote_challenger');
    expect(names).toContain('rollback_deployment');
    expect(names).toContain('update_traffic');
    expect(names).toContain('list_api_keys');
    expect(names).toContain('create_api_key');
    expect(names).toContain('revoke_api_key');
    expect(names).toContain('rotate_api_key');
    expect(names).toContain('list_webhooks');
    expect(names).toContain('create_webhook');
    expect(names).toContain('delete_webhook');
    expect(names).toContain('test_webhook');
    expect(names).toContain('get_usage');
    expect(names).toContain('get_usage_history');
    expect(names).toContain('get_audit_log');

    await client.close();
    await server.close();
  });

  it('each tool has a description', async () => {
    const server = createCalibrMcpServer({ apiKey: 'test' });
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);

    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
    }

    await client.close();
    await server.close();
  });

  it('tools work end-to-end', async () => {
    const server = createCalibrMcpServer({ apiKey: 'test' });
    const client = new Client({ name: 'test', version: '1.0.0' });
    const [ct, st] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(st), client.connect(ct)]);

    const result = await client.callTool({ name: 'list_models', arguments: {} });
    expect(result.content).toHaveLength(1);

    await client.close();
    await server.close();
  });
});
