/**
 * Shared helpers for server-side calls to the SignalPath backend API.
 *
 * API_URL and INTERNAL_API_KEY are read at call time (not at module load)
 * so the build phase never throws for missing env vars — only actual
 * request handlers will fail at runtime if they are absent.
 */

export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is not set — backend calls will fail')
  }
  return url ?? 'http://localhost:8000'
}

/** Base URL for the backend — resolved at call time. */
export const API_URL = (() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000')()

/** Standard headers for internal backend calls (includes API key). */
export function internalHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'X-Internal-Key': process.env.INTERNAL_API_KEY ?? '',
    ...extra,
  }
}
