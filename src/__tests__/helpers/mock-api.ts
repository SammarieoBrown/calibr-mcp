import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const BASE = 'https://api.cali-br.com';

// ---------------------------------------------------------------------------
// Fixtures — sample response data for each endpoint
// ---------------------------------------------------------------------------
export const fixtures = {
  scoreResult: {
    score: 720,
    probability_of_default: 0.042,
    grade: 'B',
    model_version: '1.2.0',
    scored_at: '2024-01-15T12:00:00Z',
  },
  batchResult: {
    results: [
      { id: 'rec_001', score: 720, grade: 'B', probability_of_default: 0.042 },
      { id: 'rec_002', score: 580, grade: 'D', probability_of_default: 0.18 },
    ],
    total: 2,
    processed_at: '2024-01-15T12:00:00Z',
  },
  model: {
    id: 'mdl_abc123',
    name: 'Retail Credit Scorecard v2',
    type: 'scorecard',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
  },
  modelsList: {
    models: [
      { id: 'mdl_abc123', name: 'Retail Credit Scorecard v2', status: 'active' },
      { id: 'mdl_def456', name: 'SME Scorecard v1', status: 'draft' },
    ],
    total: 2,
  },
  deployResult: {
    deployment_id: 'dep_xyz789',
    slug: 'retail-v2-prod',
    status: 'deploying',
    created_at: '2024-01-15T12:00:00Z',
  },
  deployment: {
    id: 'dep_xyz789',
    slug: 'retail-v2-prod',
    model_id: 'mdl_abc123',
    status: 'active',
    traffic_pct: 100,
    created_at: '2024-01-15T12:00:00Z',
  },
  deploymentsList: {
    deployments: [
      { id: 'dep_xyz789', slug: 'retail-v2-prod', status: 'active' },
      { id: 'dep_abc111', slug: 'sme-v1-staging', status: 'inactive' },
    ],
    total: 2,
  },
  deploymentStats: {
    slug: 'retail-v2-prod',
    requests_24h: 14200,
    avg_latency_ms: 48,
    error_rate: 0.001,
    period: '24h',
  },
  deploymentCompare: {
    baseline: { slug: 'retail-v2-prod', avg_score: 695, requests: 14200 },
    challenger: { slug: 'sme-v1-staging', avg_score: 701, requests: 380 },
  },
  promoteSuccess: { success: true, message: 'Deployment promoted successfully.' },
  rollbackSuccess: { success: true, message: 'Deployment rolled back successfully.' },
  trafficSuccess: { success: true, traffic_pct: 50 },
  apiKey: {
    id: 'key_001',
    name: 'Production Key',
    prefix: 'cal_live_',
    created_at: '2024-01-01T00:00:00Z',
    last_used_at: '2024-01-15T11:00:00Z',
  },
  newApiKey: {
    id: 'key_002',
    name: 'New Key',
    prefix: 'cal_live_',
    key: 'cal_live_supersecretvalue123',
    created_at: '2024-01-15T12:00:00Z',
  },
  keysList: {
    keys: [
      { id: 'key_001', name: 'Production Key', prefix: 'cal_live_' },
      { id: 'key_002', name: 'Staging Key', prefix: 'cal_test_' },
    ],
    total: 2,
  },
  deleteSuccess: { success: true },
  rotatedKey: {
    id: 'key_001',
    name: 'Production Key',
    prefix: 'cal_live_',
    key: 'cal_live_newrotatedvalue456',
    rotated_at: '2024-01-15T12:00:00Z',
  },
  webhook: {
    id: 'wh_001',
    url: 'https://myapp.example.com/webhooks/calibr',
    events: ['score.completed', 'deployment.promoted'],
    active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  newWebhook: {
    id: 'wh_002',
    url: 'https://myapp.example.com/webhooks/calibr-new',
    events: ['score.completed'],
    active: true,
    secret: 'whsec_supersecretwebhook',
    created_at: '2024-01-15T12:00:00Z',
  },
  webhooksList: {
    webhooks: [
      { id: 'wh_001', url: 'https://myapp.example.com/webhooks/calibr', active: true },
    ],
    total: 1,
  },
  webhookTestResult: {
    success: true,
    status_code: 200,
    response_time_ms: 120,
    sent_at: '2024-01-15T12:00:00Z',
  },
  usage: {
    period: '2024-01',
    total_requests: 42500,
    scoring_requests: 40000,
    batch_requests: 2500,
    limit: 100000,
  },
  usageHistory: {
    history: [
      { period: '2024-01', total_requests: 42500 },
      { period: '2023-12', total_requests: 38200 },
    ],
  },
  auditLog: {
    events: [
      {
        id: 'evt_001',
        action: 'deployment.promoted',
        actor: 'user@example.com',
        timestamp: '2024-01-15T10:00:00Z',
      },
      {
        id: 'evt_002',
        action: 'key.rotated',
        actor: 'user@example.com',
        timestamp: '2024-01-15T09:00:00Z',
      },
    ],
    total: 2,
  },
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
export const handlers = [
  // Scoring
  http.post(`${BASE}/v1/score/:slug`, () => HttpResponse.json(fixtures.scoreResult)),
  http.post(`${BASE}/v1/score/:slug/batch`, () => HttpResponse.json(fixtures.batchResult)),

  // Models
  http.get(`${BASE}/v1/models`, () => HttpResponse.json(fixtures.modelsList)),
  http.get(`${BASE}/v1/models/:id`, () => HttpResponse.json(fixtures.model)),
  http.post(`${BASE}/v1/models/deploy`, () =>
    HttpResponse.json(fixtures.deployResult, { status: 201 }),
  ),

  // Deployments
  http.get(`${BASE}/v1/deployments`, () => HttpResponse.json(fixtures.deploymentsList)),
  http.get(`${BASE}/v1/deployments/:slug`, ({ params }) => {
    // Guard against matching /stats or /compare sub-paths
    const slug = params['slug'] as string;
    if (slug === 'stats' || slug === 'compare') return HttpResponse.json({ error: 'not found' }, { status: 404 });
    return HttpResponse.json(fixtures.deployment);
  }),
  http.get(`${BASE}/v1/deployments/:slug/stats`, () =>
    HttpResponse.json(fixtures.deploymentStats),
  ),
  http.get(`${BASE}/v1/deployments/:slug/compare`, () =>
    HttpResponse.json(fixtures.deploymentCompare),
  ),
  http.post(`${BASE}/v1/deployments/:slug/promote`, () =>
    HttpResponse.json(fixtures.promoteSuccess),
  ),
  http.post(`${BASE}/v1/deployments/:slug/rollback`, () =>
    HttpResponse.json(fixtures.rollbackSuccess),
  ),
  http.patch(`${BASE}/v1/deployments/:slug/traffic`, () =>
    HttpResponse.json(fixtures.trafficSuccess),
  ),

  // API Keys
  http.get(`${BASE}/v1/keys`, () => HttpResponse.json(fixtures.keysList)),
  http.post(`${BASE}/v1/keys`, () => HttpResponse.json(fixtures.newApiKey, { status: 201 })),
  http.delete(`${BASE}/v1/keys/:id`, () => HttpResponse.json(fixtures.deleteSuccess)),
  http.post(`${BASE}/v1/keys/:id/rotate`, () => HttpResponse.json(fixtures.rotatedKey)),

  // Webhooks
  http.get(`${BASE}/v1/webhooks`, () => HttpResponse.json(fixtures.webhooksList)),
  http.post(`${BASE}/v1/webhooks`, () =>
    HttpResponse.json(fixtures.newWebhook, { status: 201 }),
  ),
  http.delete(`${BASE}/v1/webhooks/:id`, () => HttpResponse.json(fixtures.deleteSuccess)),
  http.post(`${BASE}/v1/webhooks/:id/test`, () =>
    HttpResponse.json(fixtures.webhookTestResult),
  ),

  // Usage & Audit
  http.get(`${BASE}/v1/usage`, () => HttpResponse.json(fixtures.usage)),
  http.get(`${BASE}/v1/usage/history`, () => HttpResponse.json(fixtures.usageHistory)),
  http.get(`${BASE}/v1/audit`, () => HttpResponse.json(fixtures.auditLog)),
];

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
export const mockApiServer = setupServer(...handlers);
