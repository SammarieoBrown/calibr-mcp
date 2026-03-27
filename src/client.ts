import type { CalibrClientConfig, ApiResult, ApiError } from './types.js';

const DEFAULT_BASE_URL = 'https://api.cali-br.com';

export class CalibrClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CalibrClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<ApiResult<T>> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'calibr-mcp/0.1.0',
    };

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      return {
        ok: false,
        status: 0,
        error: {
          error: 'network_error',
          details: `Could not reach Calibr API at ${this.baseUrl}: ${err instanceof Error ? err.message : String(err)}`,
        },
      };
    }

    if (!res.ok) {
      let errorBody: ApiError;
      try {
        errorBody = (await res.json()) as ApiError;
      } catch {
        errorBody = { error: `HTTP ${res.status}: ${res.statusText}` };
      }
      return { ok: false, status: res.status, error: errorBody };
    }

    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  }

  get<T>(path: string, query?: Record<string, string | number | undefined>) {
    return this.request<T>('GET', path, undefined, query);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }
}
