/**
 * Shared helpers for server-side calls to the SignalPath backend API.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ''

/** Standard headers for internal backend calls (includes API key). */
export function internalHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'X-Internal-Key': INTERNAL_API_KEY,
    ...extra,
  }
}

export { API_URL }
