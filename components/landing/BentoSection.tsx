'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Zap, GitMerge, Sliders, Send, CheckCircle2, Clock, FileCode, Github } from 'lucide-react'
import { useTheme } from '../ThemeProvider'

// ─── Tile 1: Signal Counter ────────────────────────────────────────────────────

const SOURCES = [
  { name: 'Zendesk', dot: '#78E1D2', soon: false, width: 72 },
  { name: 'Intercom', dot: '#7C3AED', soon: false, width: 45 },
  { name: 'Freshdesk', dot: '#38BDF8', soon: false, width: 38 },
  { name: 'Salesforce', dot: '#22D3EE', soon: false, width: 28 },
  { name: 'GitHub (codebase)', dot: '#6B7280', soon: false, width: 14 },
]

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return count
}

function SignalCounterTile() {
  const tileRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const count = useCountUp(2_847_291, 2200, visible)

  useEffect(() => {
    const el = tileRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={tileRef} className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<Zap className='w-3.5 h-3.5' />} label='Signal Ingestion' index='01' />
      <p className='font-display text-4xl font-bold text-gray-900 dark:text-white mt-3 mb-0.5 tabular-nums leading-none'>
        {count.toLocaleString()}
      </p>
      <p className='text-xs text-gray-400 dark:text-white/30 font-mono mb-4'>signals processed</p>

      <div className='space-y-2 mb-4'>
        {SOURCES.map(s => (
          <div key={s.name} className='flex items-center gap-2.5'>
            <span className='w-1.5 h-1.5 rounded-full flex-shrink-0' style={{ backgroundColor: s.dot }} />
            <span className={`text-xs ${s.soon ? 'text-gray-400 dark:text-white/25' : 'text-gray-500 dark:text-white/50'}`}>
              {s.name}
            </span>
            {s.soon ? (
              <span className='ml-auto text-[9px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full'>
                Soon
              </span>
            ) : (
              <div className='flex-1 bg-gray-200 dark:bg-white/[0.05] rounded-full h-0.5 overflow-hidden'>
                <div
                  className='h-full rounded-full'
                  style={{
                    backgroundColor: s.dot,
                    width: visible ? `${s.width}%` : '0%',
                    transition: 'width 1.4s ease',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='mt-auto pt-3 border-t border-gray-100 dark:border-white/[0.06]'>
        <p className='text-[10px] text-gray-400 dark:text-white/20 leading-relaxed'>
          Help-desk signals plus your GitHub repository structure — so every spec references your actual files, not generic service names.
        </p>
      </div>
    </div>
  )
}

// ─── Tile 2: Problem Graph ─────────────────────────────────────────────────────

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  r: number
  color: string
}

interface GraphEdge {
  from: string
  to: string
}

const INIT_NODES: GraphNode[] = [
  { id: 'auth',    label: 'Auth\nFailures',     x: 100, y:  70, r: 36, color: '#F97316' },
  { id: 'export',  label: 'Export\nTimeouts',   x: 270, y:  55, r: 30, color: '#F97316' },
  { id: 'webhook', label: 'Webhook\nErrors',    x: 400, y: 120, r: 26, color: '#F59E0B' },
  { id: 'sync',    label: 'Sync\nIssues',       x: 195, y: 175, r: 24, color: '#F59E0B' },
  { id: 'ui',      label: 'UI\nFriction',       x: 355, y: 220, r: 20, color: '#64748B' },
  { id: 'perms',   label: 'Permissions',        x:  75, y: 195, r: 18, color: '#64748B' },
  { id: 'search',  label: 'Search\nLatency',    x: 445, y:  50, r: 16, color: '#64748B' },
  { id: 'onboard', label: 'Onboarding',         x: 305, y: 295, r: 15, color: '#64748B' },
]

const EDGES: GraphEdge[] = [
  { from: 'auth',    to: 'export'  },
  { from: 'auth',    to: 'sync'    },
  { from: 'auth',    to: 'perms'   },
  { from: 'export',  to: 'sync'    },
  { from: 'export',  to: 'webhook' },
  { from: 'webhook', to: 'sync'    },
  { from: 'sync',    to: 'ui'      },
  { from: 'search',  to: 'webhook' },
  { from: 'ui',      to: 'onboard' },
]

function ProblemGraphTile() {
  const { theme } = useTheme()
  const [nodes, setNodes] = useState<GraphNode[]>(INIT_NODES)
  const svgRef = useRef<SVGSVGElement>(null)
  const draggingRef = useRef<{ id: string; ox: number; oy: number } | null>(null)

  const nodeMap = useMemo(() => Object.fromEntries(nodes.map(n => [n.id, n])), [nodes])

  function onPointerDownNode(e: React.PointerEvent<SVGGElement>, id: string) {
    e.preventDefault()
    e.stopPropagation()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const sx = 500 / rect.width
    const sy = 320 / rect.height
    const node = nodes.find(n => n.id === id)!
    draggingRef.current = {
      id,
      ox: (e.clientX - rect.left) * sx - node.x,
      oy: (e.clientY - rect.top)  * sy - node.y,
    }
    ;(e.currentTarget as SVGGElement).setPointerCapture(e.pointerId)
  }

  function onPointerMoveNode(e: React.PointerEvent<SVGGElement>) {
    if (!draggingRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const sx = 500 / rect.width
    const sy = 320 / rect.height
    const x = Math.max(20, Math.min(480, (e.clientX - rect.left) * sx - draggingRef.current.ox))
    const y = Math.max(20, Math.min(300, (e.clientY - rect.top) * sy - draggingRef.current.oy))
    const id = draggingRef.current.id
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, x, y } : n)))
  }

  function onPointerUpNode() {
    draggingRef.current = null
  }

  return (
    <div className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<GitMerge className='w-3.5 h-3.5' />} label='Problem Graph' index='02' />
      <p className='text-[10px] text-gray-400 dark:text-white/25 mt-1 mb-3'>Drag nodes to explore cluster relationships.</p>
      <div className='flex-1 min-h-0'>
        <svg
          ref={svgRef}
          viewBox='0 0 500 320'
          className='w-full h-full select-none'
          style={{ cursor: 'default' }}
        >
          {/* Edges */}
          {EDGES.map(({ from, to }) => {
            const f = nodeMap[from]
            const t = nodeMap[to]
            if (!f || !t) return null
            return (
              <line
                key={`${from}-${to}`}
                x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                stroke={theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)'}
                strokeWidth='1.5'
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(n => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              onPointerDown={e => onPointerDownNode(e, n.id)}
              onPointerMove={onPointerMoveNode}
              onPointerUp={onPointerUpNode}
              style={{ cursor: 'grab' }}
            >
              <circle r={n.r} fill={n.color} fillOpacity={0.15} stroke={n.color} strokeOpacity={0.5} strokeWidth={1.5} />
              {n.label.split('\n').map((line, li) => (
                <text
                  key={li}
                  textAnchor='middle'
                  dy={n.label.includes('\n') ? (li === 0 ? '-0.3em' : '0.9em') : '0.35em'}
                  fontSize={9}
                  fill={n.color}
                  fillOpacity={0.9}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {line}
                </text>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

// ─── Tile 3: Scoring Slider ────────────────────────────────────────────────────

const SLIDER_ITEMS = [
  { id: 's1', label: 'OAuth token expiry crashes API',    recency: 9.2, revenue: 9.0 },
  { id: 's2', label: 'Bulk export timeout >10k records',  recency: 8.8, revenue: 8.3 },
  { id: 's3', label: 'Webhook silent failure on 4xx',     recency: 7.8, revenue: 7.5 },
  { id: 's4', label: 'Custom field mapping lost',         recency: 6.1, revenue: 6.4 },
  { id: 's5', label: 'Dashboard filter not persisted',    recency: 6.2, revenue: 5.4 },
]

const ITEM_H = 38

function ScoringSliderTile() {
  const { theme } = useTheme()
  const [weight, setWeight] = useState(0.5) // 0 = recency, 1 = revenue

  const ranked = useMemo(
    () =>
      [...SLIDER_ITEMS]
        .map(it => ({ ...it, score: (1 - weight) * it.recency + weight * it.revenue }))
        .sort((a, b) => b.score - a.score),
    [weight]
  )

  function getScoreColor(score: number) {
    if (score >= 8) return '#F97316'
    if (score >= 6) return '#F59E0B'
    return '#64748B'
  }

  return (
    <div className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<Sliders className='w-3.5 h-3.5' />} label='Opportunity Scoring' index='03' />

      {/* Slider */}
      <div className='mt-2 mb-3'>
        <div className='flex justify-between text-[10px] text-gray-400 dark:text-white/30 mb-1.5'>
          <span>← Recency</span>
          <span>Revenue Impact →</span>
        </div>
        <input
          type='range'
          min={0}
          max={100}
          value={Math.round(weight * 100)}
          onChange={e => setWeight(Number(e.target.value) / 100)}
          className='w-full h-1 rounded-full accent-blue-500 cursor-pointer'
          style={{
            background: `linear-gradient(to right, #3B82F6 ${weight * 100}%, ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${weight * 100}%)`,
          }}
        />
        <p className='text-center font-mono text-[10px] text-gray-400 dark:text-white/25 mt-1'>
          {weight === 0 ? 'Recency only' : weight === 1 ? 'Revenue only' : `${Math.round((1 - weight) * 100)}% recency · ${Math.round(weight * 100)}% revenue`}
        </p>
      </div>

      {/* Sortable list */}
      <div className='relative overflow-hidden' style={{ height: SLIDER_ITEMS.length * ITEM_H }}>
        {SLIDER_ITEMS.map(item => {
          const rank = ranked.findIndex(r => r.id === item.id)
          const score = (1 - weight) * item.recency + weight * item.revenue
          const color = getScoreColor(score)
          return (
            <div
              key={item.id}
              className='absolute left-0 right-0 flex items-center gap-2 px-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]'
              style={{
                top: rank * ITEM_H,
                transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                height: ITEM_H - 4,
                alignItems: 'center',
              }}
            >
              <span className='font-mono text-[10px] text-gray-400 dark:text-white/25 w-4 text-center'>{rank + 1}</span>
              <span className='text-[11px] text-gray-600 dark:text-white/65 flex-1 truncate'>{item.label}</span>
              <span className='font-display text-[11px] font-bold flex-shrink-0' style={{ color }}>
                {score.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tile 4: Push anywhere (or don't) ─────────────────────────────────────────

const DESTINATIONS = [
  {
    id: 'signalpath',
    name: 'Stay in SignalPath',
    description: 'Specs, briefs, and backlog all live here. No push required.',
    status: 'available' as const,
    accent: '#6366F1',
    logo: (
      <div className='w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shadow-blue-600/30 flex-shrink-0'>
        <span className='text-white font-bold text-[9px]'>S</span>
      </div>
    ),
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Open the spec as a Cursor Composer session. Codebase indexing is live — Cursor integration lands next.',
    status: 'coming-soon' as const,
    accent: '#6B7280',
    logo: (
      <svg className='w-6 h-6 flex-shrink-0' viewBox='0 0 32 32' fill='none'>
        <rect width='32' height='32' rx='7' fill='#1A1A1A' />
        <path d='M16 6L26 11.5V20.5L16 26L6 20.5V11.5L16 6Z' stroke='white' strokeWidth='1.5' fill='none' strokeOpacity='0.9' />
        <path d='M16 6V26M6 11.5L26 20.5M26 11.5L6 20.5' stroke='white' strokeWidth='1.5' strokeOpacity='0.25' />
      </svg>
    ),
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Push directly to a Linear project as an issue.',
    status: 'available' as const,
    accent: '#5E6AD2',
    logo: (
      <svg className='w-6 h-6 flex-shrink-0' viewBox='0 0 100 100' fill='none'>
        <rect width='100' height='100' rx='22' fill='#5E6AD2' />
        <path d='M17.27 55.7 44.3 82.73a36.81 36.81 0 01-27.03-27.03zm-1.48-13.3 42.81 42.81A36.93 36.93 0 0150 86a36.56 36.56 0 01-6.2-.53L16.06 57.73a37.2 37.2 0 01-.27-15.33zM19.74 31l49.26 49.26A37 37 0 0119.74 31zm12.07-10.98L82 70.19A37 37 0 0131.81 20.02zM50 14c5.55 0 10.82 1.22 15.55 3.41L17.41 65.55A37 37 0 0150 14zm16.62 4.98a37 37 0 0124.4 24.4L66.62 18.98zM86 50c0 2.2-.19 4.37-.54 6.47L43.53 13.54A37 37 0 0186 50z' fill='white' />
      </svg>
    ),
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Create a ticket in any Jira project.',
    status: 'available' as const,
    accent: '#0052CC',
    logo: (
      <svg className='w-6 h-6 flex-shrink-0' viewBox='0 0 32 32' fill='none'>
        <rect width='32' height='32' rx='7' fill='#0052CC' />
        <path d='M16.24 5.6 9.04 12.8a1.07 1.07 0 000 1.51l4.43 4.43 6.14-6.14 3.6-3.6a1.07 1.07 0 000-1.51l-5.45-2.34a.77.77 0 00-1.52.85z' fill='#2684FF' />
        <path d='M16.24 26.4l7.2-7.2a1.07 1.07 0 000-1.51l-4.43-4.43-6.14 6.14-3.6 3.6a1.07 1.07 0 000 1.51l5.45 2.34a.77.77 0 001.52-.85z' fill='white' />
      </svg>
    ),
  },
  {
    id: 'github',
    name: 'GitHub Issues',
    description: 'Create an issue in any GitHub repository.',
    status: 'coming-soon' as const,
    accent: '#6B7280',
    logo: (
      <svg className='w-6 h-6 flex-shrink-0' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z' />
      </svg>
    ),
  },
]

function HandoffTile() {
  const [active, setActive] = useState('signalpath')

  const dest = DESTINATIONS.find(d => d.id === active)!

  return (
    <div className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<Send className='w-3.5 h-3.5' />} label='Signal → spec → ship' index='04' />
      <p className='text-[10px] text-gray-400 dark:text-white/25 mt-1 mb-3'>
        Stay in SignalPath, push to your PM tools, or send the spec straight into Cursor — the agent starts coding from your actual files.
      </p>

      {/* Destination picker */}
      <div className='space-y-1.5 mb-3'>
        {DESTINATIONS.map(d => (
          <button
            key={d.id}
            type='button'
            onClick={() => d.status === 'available' && setActive(d.id)}
            title={d.status === 'coming-soon' ? 'Coming in V2' : undefined}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all duration-150 ${
              active === d.id
                ? 'border-blue-500/40 bg-blue-500/8'
                : d.status === 'coming-soon'
                  ? 'border-gray-200 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02] opacity-60 cursor-not-allowed'
                  : 'border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-300 dark:hover:border-white/[0.12] cursor-pointer'
            }`}
          >
            {d.logo}
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-1.5'>
                <span className={`text-[11px] font-semibold truncate ${active === d.id ? 'text-blue-400' : 'text-gray-700 dark:text-white/70'}`}>
                  {d.name}
                </span>
                {d.status === 'coming-soon' && (
                  <span className='inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0'>
                    <Clock className='w-2.5 h-2.5' />
                    Soon
                  </span>
                )}
                {d.status === 'available' && active === d.id && (
                  <CheckCircle2 className='w-3 h-3 text-blue-400 flex-shrink-0' />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Selected destination detail */}
      <div className='mt-auto pt-3 border-t border-gray-100 dark:border-white/[0.06]'>
        <p className='text-[10px] text-gray-400 dark:text-white/30 leading-relaxed'>
          {dest.description}
        </p>
      </div>
    </div>
  )
}

// ─── Tile 5: Codebase Indexing ────────────────────────────────────────────────

type DirNode  = { kind: 'dir';  label: string; depth: number }
type FileNode = { kind: 'file'; label: string; depth: number; color: string; typeLabel: string; symbols: string[] }
type TreeNode = DirNode | FileNode

type FeedItem = { text: string; color: string; typeLabel: string; key: number }

const TREE: TreeNode[] = [
  { kind: 'dir',  label: 'app/',                depth: 0 },
  { kind: 'dir',  label: 'routes/',             depth: 1 },
  { kind: 'file', label: 'oauth.py',            depth: 2, color: '#3B82F6', typeLabel: 'route',      symbols: ['POST /oauth/token', 'GET /oauth/authorize']              },
  { kind: 'file', label: 'github_auth.py',      depth: 2, color: '#3B82F6', typeLabel: 'route',      symbols: ['GET /auth/github/install', 'GET /auth/github/callback']  },
  { kind: 'dir',  label: 'services/',           depth: 1 },
  { kind: 'file', label: 'auth_service.py',     depth: 2, color: '#8B5CF6', typeLabel: 'service',    symbols: ['AuthService.refresh()', 'TokenValidator.check()']         },
  { kind: 'file', label: 'ast_parser.py',       depth: 2, color: '#8B5CF6', typeLabel: 'parser',     symbols: ['parse_python_file()', 'parse_typescript_file()']          },
  { kind: 'dir',  label: 'models/',             depth: 1 },
  { kind: 'file', label: 'session.py',          depth: 2, color: '#10B981', typeLabel: 'model',      symbols: ['Session', 'RefreshToken']                                 },
  { kind: 'file', label: 'workspace.py',        depth: 2, color: '#10B981', typeLabel: 'model',      symbols: ['Workspace', 'GithubInstallation']                         },
  { kind: 'dir',  label: 'middleware/',         depth: 1 },
  { kind: 'file', label: 'token_refresh.py',    depth: 2, color: '#F59E0B', typeLabel: 'middleware', symbols: ['TokenRefreshMiddleware']                                   },
]
const FILE_NODES = TREE.filter((n): n is FileNode => n.kind === 'file')

// Spec files to reveal progressively — indexed by their FILE_NODES position
const SPEC_REVEAL: { fileIdx: number; path: string }[] = [
  { fileIdx: 0, path: 'app/routes/oauth.py' },
  { fileIdx: 2, path: 'app/services/auth_service.py' },
  { fileIdx: 4, path: 'app/models/session.py' },
  { fileIdx: 6, path: 'app/middleware/token_refresh.py' },
]

function CodebaseIndexTile() {
  const tileRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [scanIdx, setScanIdx] = useState(-1)
  const [allDone, setAllDone] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const fileCount  = useCountUp(241, 1600, visible)
  const routeCount = useCountUp(18,  1200, visible)
  const fnCount    = useCountUp(164, 1800, visible)
  const modelCount = useCountUp(31,  1400, visible)

  useEffect(() => {
    const el = tileRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let mounted = true
    let idx = 0

    function step() {
      if (!mounted) return
      if (idx < FILE_NODES.length) {
        setScanIdx(idx)
        setAllDone(false)
        if (idx > 0) {
          const prev = FILE_NODES[idx - 1]
          setFeed(f => [
            ...prev.symbols.map((s, k) => ({ text: s, color: prev.color, typeLabel: prev.typeLabel, key: Date.now() + k })),
            ...f,
          ].slice(0, 6))
        }
        idx++
        setTimeout(step, 720)
      } else {
        const last = FILE_NODES[FILE_NODES.length - 1]
        setFeed(f => [
          ...last.symbols.map((s, k) => ({ text: s, color: last.color, typeLabel: last.typeLabel, key: Date.now() + k })),
          ...f,
        ].slice(0, 6))
        setAllDone(true)
        setScanIdx(-1)
        setTimeout(() => {
          if (!mounted) return
          idx = 0
          setAllDone(false)
          setScanIdx(-1)
          setFeed([])
          setTimeout(step, 500)
        }, 2200)
      }
    }

    const t = setTimeout(step, 600)
    return () => { mounted = false; clearTimeout(t) }
  }, [visible])

  const revealedPaths = allDone
    ? SPEC_REVEAL.map(r => r.path)
    : SPEC_REVEAL.filter(r => r.fileIdx < scanIdx).map(r => r.path)

  return (
    <div ref={tileRef} className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<FileCode className='w-3.5 h-3.5' />} label='Codebase Index' index='05' />
      <p className='text-[10px] text-gray-400 dark:text-white/25 mt-1 mb-4'>
        Connect GitHub and SignalPath maps your repository skeleton — file paths, routes, models, functions.
        Specs reference your actual code. Source code is never stored.
      </p>

      <div className='flex-1 grid grid-cols-3 gap-4 min-h-0'>

        {/* ── Left: nested file tree ── */}
        <div className='bg-gray-50 dark:bg-white/[0.02] rounded-xl p-3 border border-gray-100 dark:border-white/[0.05] flex flex-col overflow-hidden'>
          <div className='flex items-center gap-2 mb-3 flex-shrink-0'>
            <Github className='w-3 h-3 text-gray-400 dark:text-white/30' />
            <span className='font-mono text-[9px] text-gray-400 dark:text-white/25 uppercase tracking-widest'>Repository</span>
            <span className='ml-auto flex items-center gap-1 text-[9px] text-emerald-500'>
              <span className='w-1 h-1 rounded-full bg-emerald-500 animate-pulse' />
              live
            </span>
          </div>
          <div className='space-y-px overflow-hidden flex-1'>
            {(() => {
              let fc = -1
              return TREE.map((node, ni) => {
                if (node.kind === 'dir') {
                  return (
                    <div key={ni} className='flex items-center gap-1' style={{ paddingLeft: node.depth * 12 }}>
                      <span className='text-gray-400 dark:text-white/20 text-[8px] select-none'>▾</span>
                      <span className='font-mono text-[9px] text-gray-400 dark:text-white/25'>{node.label}</span>
                    </div>
                  )
                }
                fc++
                const fi = fc
                const isDone     = allDone || fi < scanIdx
                const isScanning = !allDone && fi === scanIdx
                const file       = node as FileNode
                return (
                  <div
                    key={ni}
                    className={`flex items-center gap-1.5 rounded py-0.5 transition-all duration-300 ${isScanning ? 'bg-blue-500/10' : ''}`}
                    style={{ paddingLeft: node.depth * 12 + 4 }}
                  >
                    {isDone     && <span className='text-[8px] text-emerald-400 flex-shrink-0 w-3 text-center'>✓</span>}
                    {isScanning && <span className='w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse' style={{ backgroundColor: file.color }} />}
                    {!isDone && !isScanning && <span className='w-1 h-1 rounded-full flex-shrink-0 bg-gray-200 dark:bg-white/10' />}
                    <span className={`font-mono text-[9px] truncate transition-colors duration-300 flex-1 ${
                      isScanning ? 'text-gray-800 dark:text-white/90'
                      : isDone   ? 'text-gray-400 dark:text-white/35'
                      : 'text-gray-200 dark:text-white/12'
                    }`}>
                      {node.label}
                    </span>
                    {isScanning && (
                      <span className='font-mono text-[8px] px-1 rounded flex-shrink-0' style={{ color: file.color, backgroundColor: file.color + '22' }}>
                        {file.typeLabel}
                      </span>
                    )}
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* ── Middle: symbol feed + stats ── */}
        <div className='flex flex-col gap-2.5'>
          <div className='grid grid-cols-2 gap-2 flex-shrink-0'>
            {[
              { value: fileCount,  label: 'files'     },
              { value: routeCount, label: 'routes'    },
              { value: fnCount,    label: 'functions' },
              { value: modelCount, label: 'models'    },
            ].map(({ value, label }) => (
              <div key={label} className='bg-gray-50 dark:bg-white/[0.03] rounded-lg p-2 border border-gray-100 dark:border-white/[0.05] text-center'>
                <p className='font-mono text-sm font-bold text-gray-900 dark:text-white tabular-nums leading-none mb-0.5'>{value}</p>
                <p className='text-[9px] text-gray-400 dark:text-white/30'>{label}</p>
              </div>
            ))}
          </div>

          <div className='flex-1 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/[0.05] overflow-hidden flex flex-col'>
            <div className='px-3 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.05] flex-shrink-0'>
              <span className='w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse' />
              <span className='font-mono text-[9px] text-gray-400 dark:text-white/25 uppercase tracking-widest'>Extracted symbols</span>
            </div>
            <div className='flex-1 overflow-hidden p-2 space-y-0.5'>
              {feed.length === 0
                ? <p className='text-[9px] text-gray-300 dark:text-white/15 font-mono px-1 pt-1'>Waiting to scan…</p>
                : feed.map((item, i) => (
                  <div key={item.key} className='flex items-center gap-2 px-1 py-0.5 rounded' style={{ opacity: Math.max(0.15, 1 - i * 0.15) }}>
                    <span className='font-mono text-[8px] px-1 rounded flex-shrink-0' style={{ color: item.color, backgroundColor: item.color + '22' }}>
                      {item.typeLabel}
                    </span>
                    <span className='font-mono text-[9px] text-gray-600 dark:text-white/60 truncate'>{item.text}</span>
                  </div>
                ))
              }
            </div>
          </div>

          <p className='text-[10px] text-gray-400 dark:text-white/20 leading-relaxed flex-shrink-0'>
            Refreshes incrementally on every push via webhooks.
          </p>
        </div>

        {/* ── Right: spec building from scan ── */}
        <div className='bg-[#0D1117] rounded-xl border border-white/[0.07] overflow-hidden flex flex-col'>
          <div className='px-3.5 pt-3 pb-2 border-b border-white/[0.06] flex items-center gap-2 flex-shrink-0'>
            <span className='font-mono text-[9px] text-white/30 uppercase tracking-widest'>Spec building…</span>
            {allDone && <span className='ml-auto text-[9px] text-emerald-400'>✓ ready</span>}
          </div>
          <div className='flex-1 overflow-hidden p-3.5'>
            <pre className='font-mono text-[9px] leading-relaxed whitespace-pre-wrap'>
              <span className='text-white/25'>{'{\n'}</span>
              <span className='text-blue-400'>  &quot;affected_files&quot;</span>
              <span className='text-white/25'>: [</span>
              {SPEC_REVEAL.map(r => (
                <span key={r.path} style={{ display: revealedPaths.includes(r.path) ? 'inline' : 'none' }}>
                  {'\n'}<span className='text-emerald-400'>    &quot;{r.path}&quot;</span><span className='text-white/25'>,</span>
                </span>
              ))}
              <span className='text-white/25'>{'\n'}  ],\n</span>
              <span className='text-blue-400'>  &quot;acceptance_criteria&quot;</span>
              <span className='text-white/25'>: [{'\n'}</span>
              <span className='text-orange-300'>    &quot;Modify TokenRefreshMiddleware{'\n'}     in </span>
              <span className='text-yellow-300'>app/middleware/token_refresh.py</span>
              <span className='text-white/50'>:L42</span>
              <span className='text-orange-300'>{'\n'}     — refresh 5 min early&quot;</span>
              <span className='text-white/25'>,{'\n'}</span>
              <span className='text-orange-300'>    &quot;Extend Session in{'\n'}     </span>
              <span className='text-yellow-300'>app/models/session.py</span>
              <span className='text-orange-300'>{'\n'}     — add refresh_token field&quot;</span>
              <span className='text-white/25'>{'\n'}  ]{'\n'}{'}'}</span>
            </pre>
          </div>
          <div className='px-3.5 pb-3 flex-shrink-0'>
            <div className='h-px bg-white/[0.06] mb-2' />
            <p className='text-[9px] text-white/25 leading-relaxed'>
              Generic: &ldquo;add token refresh&rdquo;<br />
              <span className='text-blue-400'>SignalPath:</span>{' '}
              <span className='text-white/40'>exact file · exact line</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Shared: TileLabel ────────────────────────────────────────────────────────

function TileLabel({ icon, label, index }: { icon: React.ReactNode; label: string; index: string }) {
  return (
    <div className='flex items-center gap-2'>
      <span className='text-blue-400/70'>{icon}</span>
      <span className='font-display text-[10px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-widest'>{label}</span>
      <span className='ml-auto font-mono text-[10px] text-gray-300 dark:text-white/15'>{index}</span>
    </div>
  )
}

// ─── BentoSection ─────────────────────────────────────────────────────────────

export function BentoSection() {
  return (
    <section className='bg-[#F4F5F8] dark:bg-[#111318] px-8 py-20'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='mb-10'>
          <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
            Under the hood
          </p>
          <h2 className='font-display text-3xl font-bold text-gray-900 dark:text-white tracking-tight'>
            Five layers. Zero noise.
          </h2>
          <p className='text-gray-500 dark:text-white/35 text-sm mt-2 max-w-lg'>
            Each layer in the SignalPath engine is interactive. Explore how raw tickets and code structure become ranked, dev-ready specs.
          </p>
        </div>

        {/* Bento grid */}
        <div
          className='grid grid-cols-5 gap-4'
          style={{ gridTemplateRows: '280px 340px 300px' }}
        >
          {/* Tile 1 — Signal Counter: col 1, rows 1-2 */}
          <div className='row-span-2 min-h-0'>
            <SignalCounterTile />
          </div>

          {/* Tile 2 — Problem Graph: cols 2-5, row 1 */}
          <div className='col-span-4 min-h-0'>
            <ProblemGraphTile />
          </div>

          {/* Tile 3 — Scoring Slider: cols 2-3, row 2 */}
          <div className='col-span-2 min-h-0'>
            <ScoringSliderTile />
          </div>

          {/* Tile 4 — Handoff: cols 4-5, row 2 */}
          <div className='col-span-2 min-h-0'>
            <HandoffTile />
          </div>

          {/* Tile 5 — Codebase Index: all cols, row 3 */}
          <div className='col-span-5 min-h-0'>
            <CodebaseIndexTile />
          </div>
        </div>
      </div>
    </section>
  )
}
