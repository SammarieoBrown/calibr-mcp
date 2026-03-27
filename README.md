# @calibr/mcp

MCP server for the [Calibr](https://cali-br.com) credit risk platform. Score applicants, manage models, and monitor deployments from any MCP-compatible AI agent.

## Quick Start

### Claude Code (stdio)

```bash
claude mcp add calibr -- npx @calibr/mcp --api-key sk_live_YOUR_KEY
```

### Cursor (stdio)

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "calibr": {
      "command": "npx",
      "args": ["@calibr/mcp", "--api-key", "sk_live_YOUR_KEY"]
    }
  }
}
```

### Remote with OAuth

```bash
claude mcp add --transport http calibr https://mcp.cali-br.com/mcp
```

OAuth login flow opens in your browser automatically.

### Remote with API Key

```bash
claude mcp add --transport http calibr https://mcp.cali-br.com/mcp --header "Authorization: Bearer sk_live_YOUR_KEY"
```

## Available Tools (23)

### Scoring
- **score_applicant** — Score a single applicant against a deployed scorecard
- **score_batch** — Score up to 1000 applicants in one request

### Models
- **list_models** — List all deployed scorecard models
- **get_model** — Get model detail including scorecard spec
- **deploy_model** — Deploy a scorecard to production or staging

### Deployments
- **list_deployments** — List active deployments
- **get_deployment** — Deployment detail with champion/challengers
- **get_deployment_stats** — Scoring statistics
- **compare_models** — Champion vs challenger comparison
- **promote_challenger** — Promote a challenger to champion
- **rollback_deployment** — Rollback to previous champion
- **update_traffic** — Adjust champion/challenger traffic split

### API Keys
- **list_api_keys** — List API keys
- **create_api_key** — Create a new API key
- **revoke_api_key** — Revoke an API key
- **rotate_api_key** — Rotate an API key

### Webhooks
- **list_webhooks** — List webhooks
- **create_webhook** — Create a webhook
- **delete_webhook** — Delete a webhook
- **test_webhook** — Send test event to a webhook

### Observability
- **get_usage** — Current month API usage
- **get_usage_history** — Historical usage
- **get_audit_log** — Audit log entries

## Authentication

### API Key (stdio + HTTP)

Pass your Calibr API key via `--api-key` flag or `CALIBR_API_KEY` environment variable.

Get your API key from the [Calibr Dashboard](https://app.cali-br.com/settings/keys).

### OAuth (HTTP only)

For the remote HTTP transport at `mcp.cali-br.com`, OAuth is supported. Your MCP client (Claude Code, Cursor) will open a browser window for you to log in with your Calibr credentials. Tokens are managed automatically.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CALIBR_API_KEY` | API key (alternative to `--api-key` flag) |

## License

MIT
