import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CalibrClient } from './client.js';
import type { CalibrClientConfig } from './types.js';
import { registerScoringTools } from './tools/scoring.js';
import { registerModelsTools } from './tools/models.js';
import { registerDeploymentsTools } from './tools/deployments.js';
import { registerKeysTools } from './tools/keys.js';
import { registerWebhooksTools } from './tools/webhooks.js';
import { registerObservabilityTools } from './tools/observability.js';

export interface CreateServerOptions {
  apiKey: string;
  baseUrl?: string;
}

export function createCalibrMcpServer(options: CreateServerOptions) {
  const server = new McpServer({
    name: 'calibr',
    version: '0.1.0',
  });

  const client = new CalibrClient({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  registerScoringTools(server, client);
  registerModelsTools(server, client);
  registerDeploymentsTools(server, client);
  registerKeysTools(server, client);
  registerWebhooksTools(server, client);
  registerObservabilityTools(server, client);

  return server;
}

export { CalibrClient } from './client.js';
export type { CalibrClientConfig, ApiResult, ApiError } from './types.js';
