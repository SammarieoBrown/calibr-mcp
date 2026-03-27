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
    expect(names).toContain('calibr_score_applicant');
    expect(names).toContain('calibr_score_batch');
    expect(names).toContain('calibr_list_models');
    expect(names).toContain('calibr_get_model');
    expect(names).toContain('calibr_deploy_model');
    expect(names).toContain('calibr_list_deployments');
    expect(names).toContain('calibr_get_deployment');
    expect(names).toContain('calibr_get_deployment_stats');
    expect(names).toContain('calibr_compare_models');
    expect(names).toContain('calibr_promote_challenger');
    expect(names).toContain('calibr_rollback_deployment');
    expect(names).toContain('calibr_update_traffic');
    expect(names).toContain('calibr_list_api_keys');
    expect(names).toContain('calibr_create_api_key');
    expect(names).toContain('calibr_revoke_api_key');
    expect(names).toContain('calibr_rotate_api_key');
    expect(names).toContain('calibr_list_webhooks');
    expect(names).toContain('calibr_create_webhook');
    expect(names).toContain('calibr_delete_webhook');
    expect(names).toContain('calibr_test_webhook');
    expect(names).toContain('calibr_get_usage');
    expect(names).toContain('calibr_get_usage_history');
    expect(names).toContain('calibr_get_audit_log');

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

    const result = await client.callTool({ name: 'calibr_list_models', arguments: {} });
    expect(result.content).toHaveLength(1);

    await client.close();
    await server.close();
  });
});
