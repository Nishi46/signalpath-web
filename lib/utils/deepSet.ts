/**
 * Immutably set a nested value in an object/array tree via a dot-notation path.
 *
 * Supports:
 *   - Object keys:   "feature.title"
 *   - Array indices: "engineering_tasks[0].title"
 *   - Mixed:        "engineering_tasks[0].acceptance_criteria[1]"
 *
 * Returns a new root object with the nested value replaced.
 * Does not mutate any input.
 *
 * @param root  - The root object to update
 * @param path  - Dot-notation path string
 * @param value - The new value to set at the path
 */
export function deepSet<T extends object>(root: T, path: string, value: unknown): T {
  const segments = parsePath(path)
  return setIn(root, segments, value) as T
}

type Segment = { type: 'key'; key: string } | { type: 'index'; index: number }

function parsePath(path: string): Segment[] {
  const segments: Segment[] = []
  // Split on . but also handle [n] array notation
  const raw = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  for (const part of raw) {
    if (part === '') continue
    const n = Number(part)
    if (!isNaN(n) && String(n) === part) {
      segments.push({ type: 'index', index: n })
    } else {
      segments.push({ type: 'key', key: part })
    }
  }
  return segments
}

function setIn(node: unknown, segments: Segment[], value: unknown): unknown {
  if (segments.length === 0) return value

  const [head, ...tail] = segments

  if (head.type === 'index') {
    const arr = Array.isArray(node) ? [...node] : []
    arr[head.index] = setIn(arr[head.index], tail, value)
    return arr
  }

  const obj = (node !== null && typeof node === 'object' && !Array.isArray(node))
    ? { ...(node as Record<string, unknown>) }
    : {}
  obj[head.key] = setIn(obj[head.key], tail, value)
  return obj
}
