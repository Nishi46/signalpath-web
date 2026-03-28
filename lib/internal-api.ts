/**
 * Shared helpers for server-side calls to the SignalPath backend API.
 */

function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL
  if (!url && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_API_URL is not set — backend calls will fail')
  }
  return url ?? 'http://localhost:8000'
}

const API_URL = getApiUrl()
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? ''

/** Standard headers for internal backend calls (includes API key). */
export function internalHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'X-Internal-Key': INTERNAL_API_KEY,
    ...extra,
  }
}

export { API_URL }
