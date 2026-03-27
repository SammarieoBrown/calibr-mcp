#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCalibrMcpServer } from './server.js';

function parseArgs(args: string[]): { apiKey: string; baseUrl?: string } {
  let apiKey: string | undefined;
  let baseUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--api-key' && args[i + 1]) {
      apiKey = args[i + 1];
      i++;
    } else if (args[i] === '--base-url' && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.error(`
Calibr MCP Server — Credit risk scoring via AI agents

Usage:
  calibr-mcp --api-key <key> [--base-url <url>]

Options:
  --api-key   Your Calibr API key (sk_live_... or sk_test_...)
  --base-url  API base URL (default: https://api.cali-br.com)
  --help      Show this help message

Setup:
  Claude Code:  claude mcp add calibr -- npx @calibr/mcp --api-key <key>
  Cursor:       Add to .cursor/mcp.json
`);
      process.exit(0);
    }
  }

  if (!apiKey) apiKey = process.env.CALIBR_API_KEY;

  if (!apiKey) {
    console.error(
      'Error: API key required. Use --api-key <key> or set CALIBR_API_KEY environment variable.',
    );
    process.exit(1);
  }

  return { apiKey, baseUrl };
}

async function main() {
  const { apiKey, baseUrl } = parseArgs(process.argv.slice(2));
  const server = createCalibrMcpServer({ apiKey, baseUrl });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Calibr MCP server running on stdio');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
