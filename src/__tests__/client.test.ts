import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { CalibrClient } from '../client.js';
import { mockApiServer, fixtures } from './helpers/mock-api.js';

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
function makeClient(overrides?: { baseUrl?: string; apiKey?: string }) {
  return new CalibrClient({ apiKey: overrides?.apiKey ?? TEST_KEY, baseUrl: overrides?.baseUrl });
}

// ---------------------------------------------------------------------------
// GET requests
// ---------------------------------------------------------------------------
describe('GET requests', () => {
  it('sends Authorization header and returns data', async () => {
    let capturedAuth: string | null = null;

    mockApiServer.use(
      http.get(`${BASE}/v1/models`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization');
        return HttpResponse.json(fixtures.modelsList);
      }),
    );

    const client = makeClient();
    const result = await client.get<typeof fixtures.modelsList>('/v1/models');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual(fixtures.modelsList);
      expect(result.status).toBe(200);
    }
    expect(capturedAuth).toBe(`Bearer ${TEST_KEY}`);
  });

  it('sends User-Agent header', async () => {
    let capturedUA: string | null = null;

    mockApiServer.use(
      http.get(`${BASE}/v1/models`, ({ request }) => {
        capturedUA = request.headers.get('User-Agent');
        return HttpResponse.json(fixtures.modelsList);
      }),
    );

    const client = makeClient();
    await client.get('/v1/models');
    expect(capturedUA).toBe('calibr-mcp/0.1.0');
  });

  it('returns model detail by id', async () => {
    const client = makeClient();
    const result = await client.get('/v1/models/mdl_abc123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(fixtures.model);
  });
});

// ---------------------------------------------------------------------------
// Query parameters
// ---------------------------------------------------------------------------
describe('Query parameters', () => {
  it('passes query parameters to the URL', async () => {
    let capturedUrl: string | null = null;

    mockApiServer.use(
      http.get(`${BASE}/v1/usage/history`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(fixtures.usageHistory);
      }),
    );

    const client = makeClient();
    await client.get('/v1/usage/history', { limit: 10, offset: 0 });

    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).toContain('offset=0');
  });

  it('omits undefined query parameters', async () => {
    let capturedUrl: string | null = null;

    mockApiServer.use(
      http.get(`${BASE}/v1/usage/history`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(fixtures.usageHistory);
      }),
    );

    const client = makeClient();
    await client.get('/v1/usage/history', { limit: 10, offset: undefined });

    expect(capturedUrl).toContain('limit=10');
    expect(capturedUrl).not.toContain('offset');
  });

  it('works with no query object', async () => {
    const client = makeClient();
    const result = await client.get('/v1/usage');
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST requests
// ---------------------------------------------------------------------------
describe('POST requests', () => {
  it('sends JSON body in a POST request', async () => {
    let capturedBody: unknown = null;

    mockApiServer.use(
      http.post(`${BASE}/v1/score/retail-v2-prod`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(fixtures.scoreResult);
      }),
    );

    const client = makeClient();
    const payload = { features: { age: 35, income: 55000 } };
    const result = await client.post('/v1/score/retail-v2-prod', payload);

    expect(result.ok).toBe(true);
    expect(capturedBody).toEqual(payload);
  });

  it('sends Content-Type application/json on POST', async () => {
    let capturedContentType: string | null = null;

    mockApiServer.use(
      http.post(`${BASE}/v1/score/retail-v2-prod`, ({ request }) => {
        capturedContentType = request.headers.get('Content-Type');
        return HttpResponse.json(fixtures.scoreResult);
      }),
    );

    const client = makeClient();
    await client.post('/v1/score/retail-v2-prod', { features: {} });
    expect(capturedContentType).toBe('application/json');
  });

  it('returns 201 status on resource creation', async () => {
    const client = makeClient();
    const result = await client.post('/v1/keys', { name: 'New Key' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status).toBe(201);
      expect((result.data as typeof fixtures.newApiKey).key).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// PATCH requests
// ---------------------------------------------------------------------------
describe('PATCH requests', () => {
  it('sends PATCH with body', async () => {
    let capturedBody: unknown = null;
    let capturedMethod: string | null = null;

    mockApiServer.use(
      http.patch(`${BASE}/v1/deployments/retail-v2-prod/traffic`, async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json(fixtures.trafficSuccess);
      }),
    );

    const client = makeClient();
    const result = await client.patch('/v1/deployments/retail-v2-prod/traffic', {
      traffic_pct: 50,
    });

    expect(result.ok).toBe(true);
    expect(capturedMethod).toBe('PATCH');
    expect(capturedBody).toEqual({ traffic_pct: 50 });
  });
});

// ---------------------------------------------------------------------------
// DELETE requests
// ---------------------------------------------------------------------------
describe('DELETE requests', () => {
  it('sends DELETE request with no body', async () => {
    let capturedMethod: string | null = null;

    mockApiServer.use(
      http.delete(`${BASE}/v1/keys/key_001`, ({ request }) => {
        capturedMethod = request.method;
        return HttpResponse.json(fixtures.deleteSuccess);
      }),
    );

    const client = makeClient();
    const result = await client.delete('/v1/keys/key_001');

    expect(result.ok).toBe(true);
    expect(capturedMethod).toBe('DELETE');
    if (result.ok) expect((result.data as { success: boolean }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error handling — 401
// ---------------------------------------------------------------------------
describe('HTTP error responses', () => {
  it('returns ok:false with error body on 401', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/models`, () =>
        HttpResponse.json({ error: 'unauthorized', details: 'Invalid API key' }, { status: 401 }),
      ),
    );

    const client = makeClient({ apiKey: 'bad_key' });
    const result = await client.get('/v1/models');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error.error).toBe('unauthorized');
    }
  });

  it('returns ok:false with error body on 403', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/audit`, () =>
        HttpResponse.json(
          { error: 'forbidden', details: 'Insufficient permissions' },
          { status: 403 },
        ),
      ),
    );

    const client = makeClient();
    const result = await client.get('/v1/audit');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.error.error).toBe('forbidden');
    }
  });

  it('returns ok:false with retry_after_ms on 429', async () => {
    mockApiServer.use(
      http.post(`${BASE}/v1/score/retail-v2-prod`, () =>
        HttpResponse.json(
          { error: 'rate_limit_exceeded', retry_after_ms: 5000 },
          { status: 429 },
        ),
      ),
    );

    const client = makeClient();
    const result = await client.post('/v1/score/retail-v2-prod', { features: {} });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.error.error).toBe('rate_limit_exceeded');
      expect(result.error.retry_after_ms).toBe(5000);
    }
  });

  it('handles non-JSON error response bodies', async () => {
    mockApiServer.use(
      http.get(`${BASE}/v1/models`, () =>
        new HttpResponse('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    );

    const client = makeClient();
    const result = await client.get('/v1/models');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error.error).toContain('500');
    }
  });
});

// ---------------------------------------------------------------------------
// Network errors
// ---------------------------------------------------------------------------
describe('Network errors', () => {
  it('returns network_error when the host is unreachable', async () => {
    mockApiServer.use(
      http.get('https://unreachable.invalid/v1/models', () =>
        HttpResponse.error(),
      ),
    );

    const client = makeClient({ baseUrl: 'https://unreachable.invalid' });
    const result = await client.get('/v1/models');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.error.error).toBe('network_error');
    }
  });

  it('includes the base URL in network_error details', async () => {
    mockApiServer.use(
      http.get('https://bad-host.invalid/v1/models', () =>
        HttpResponse.error(),
      ),
    );

    const client = makeClient({ baseUrl: 'https://bad-host.invalid' });
    const result = await client.get('/v1/models');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(String(result.error.details)).toContain('bad-host.invalid');
    }
  });
});

// ---------------------------------------------------------------------------
// Base URL trailing slash normalization
// ---------------------------------------------------------------------------
describe('Base URL handling', () => {
  it('strips trailing slash from baseUrl', async () => {
    let capturedUrl: string | null = null;

    mockApiServer.use(
      http.get(`${BASE}/v1/models`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(fixtures.modelsList);
      }),
    );

    const client = makeClient({ baseUrl: `${BASE}/` });
    await client.get('/v1/models');

    // Should not produce double slashes
    expect(capturedUrl).not.toContain('//api/v1');
    expect(capturedUrl).toContain('/v1/models');
  });
});
