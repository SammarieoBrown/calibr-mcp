/** Generic API error response */
export interface ApiError {
  error: string;
  details?: unknown;
  required?: string;
  retry_after_ms?: number;
}

/** Calibr API client configuration */
export interface CalibrClientConfig {
  apiKey: string;
  baseUrl?: string;
}

/** Result type for API calls */
export type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: ApiError; status: number };
