'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Zap, GitMerge, Sliders, Send } from 'lucide-react'

// ─── Tile 1: Signal Counter ────────────────────────────────────────────────────

const SOURCES = [
  { name: 'Zendesk', color: '#03363D', dot: '#78E1D2' },
  { name: 'Intercom', color: '#2A2358', dot: '#7C3AED' },
  { name: 'Freshdesk', color: '#1A2D4A', dot: '#38BDF8' },
  { name: 'Salesforce', color: '#1A2D4A', dot: '#22D3EE' },
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
    <div ref={tileRef} className='bento-tile flex flex-col justify-between h-full'>
      <div>
        <TileLabel icon={<Zap className='w-3.5 h-3.5' />} label='Signal Ingestion' index='01' />
        <p className='font-mono text-5xl font-black text-white mt-4 mb-1 tabular-nums leading-none'>
          {count.toLocaleString()}
        </p>
        <p className='text-xs text-white/30 font-mono'>signals processed</p>
      </div>

      <div className='mt-5 space-y-2'>
        {SOURCES.map(s => (
          <div key={s.name} className='flex items-center gap-2.5'>
            <span className='w-2 h-2 rounded-full flex-shrink-0' style={{ backgroundColor: s.dot }} />
            <span className='text-xs text-white/50'>{s.name}</span>
            <div className='flex-1 bg-white/[0.05] rounded-full h-0.5 overflow-hidden'>
              <div
                className='h-full rounded-full'
                style={{
                  backgroundColor: s.dot,
                  width: visible ? `${Math.random() * 40 + 40}%` : '0%',
                  transition: 'width 1.4s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className='text-[10px] text-white/20 mt-4'>
        Real-time ingestion across all connected help-desk sources.
      </p>
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
      <p className='text-[10px] text-white/25 mt-1 mb-3'>Drag nodes to explore cluster relationships.</p>
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
                stroke='rgba(255,255,255,0.07)'
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

const ITEM_H = 46

function ScoringSliderTile() {
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
      <div className='mt-3 mb-4'>
        <div className='flex justify-between text-[10px] text-white/30 mb-2'>
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
            background: `linear-gradient(to right, #3B82F6 ${weight * 100}%, rgba(255,255,255,0.1) ${weight * 100}%)`,
          }}
        />
        <p className='text-center font-mono text-[10px] text-white/25 mt-1.5'>
          {weight === 0 ? 'Recency only' : weight === 1 ? 'Revenue only' : `${Math.round((1 - weight) * 100)}% recency · ${Math.round(weight * 100)}% revenue`}
        </p>
      </div>

      {/* Sortable list */}
      <div className='flex-1 relative' style={{ minHeight: SLIDER_ITEMS.length * ITEM_H }}>
        {SLIDER_ITEMS.map(item => {
          const rank = ranked.findIndex(r => r.id === item.id)
          const score = (1 - weight) * item.recency + weight * item.revenue
          const color = getScoreColor(score)
          return (
            <div
              key={item.id}
              className='absolute left-0 right-0 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]'
              style={{
                top: rank * ITEM_H,
                transition: 'top 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                height: ITEM_H - 4,
              }}
            >
              <span className='font-mono text-[10px] text-white/25 w-4 text-center'>{rank + 1}</span>
              <span className='text-[11px] text-white/65 flex-1 truncate'>{item.label}</span>
              <span className='font-mono text-[10px] font-bold flex-shrink-0' style={{ color }}>
                {score.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tile 4: Spec & Agent Handoff ─────────────────────────────────────────────

type Section = 'problem' | 'evidence' | 'recommendation' | 'criteria' | null

const BRIEF_SECTIONS: { id: Section & string; title: string; body: string }[] = [
  {
    id: 'problem',
    title: 'Problem',
    body: 'OAuth2 access tokens expire after 1h with no silent refresh, terminating active API sessions.',
  },
  {
    id: 'evidence',
    title: 'Evidence',
    body: '47 tickets · $284K ARR at risk · 12 churn signals across 3 enterprise accounts.',
  },
  {
    id: 'recommendation',
    title: 'Recommendation',
    body: 'Ship silent token refresh endpoint with rotation. Assign to platform team, estimate 3–5 days.',
  },
  {
    id: 'criteria',
    title: 'Acceptance Criteria',
    body: 'Silent refresh 5 min before expiry · Refresh token rotation 30-day TTL · Zero session interruptions in staging for 48h.',
  },
]

const JSON_SEGMENTS: { section: string | null; text: string }[] = [
  { section: null,             text: '{\n  "score": 9.1,\n  "affected_accounts": 47,\n  ' },
  { section: 'recommendation', text: '"recommended_action": "ship_fix",\n  ' },
  { section: 'problem',        text: '"spec": {\n    "problem_statement":\n      "OAuth2 tokens expire after 1h...",\n    ' },
  { section: 'criteria',       text: '"acceptance_criteria": [\n      "Silent refresh 5min before expiry",\n      "Rotation with 30-day TTL",\n      "Zero interruptions 48h"\n    ]\n  },\n  ' },
  { section: 'evidence',       text: '"evidence": {\n    "verbatim_count": 47,\n    "arr_at_risk": 284000\n  }\n}' },
]

function HandoffTile() {
  const [hovered, setHovered] = useState<string | null>(null)

  function segmentColor(seg: { section: string | null; text: string }) {
    if (!seg.section || seg.section !== hovered) return ''
    return 'bg-blue-500/10 rounded'
  }

  return (
    <div className='bento-tile flex flex-col h-full'>
      <TileLabel icon={<Send className='w-3.5 h-3.5' />} label='Spec & Agent Handoff' index='04' />
      <p className='text-[10px] text-white/25 mt-1 mb-3'>Hover a section to see the JSON mapping.</p>

      <div className='flex-1 flex gap-3 min-h-0 overflow-hidden'>
        {/* Human brief */}
        <div className='flex-1 space-y-2 overflow-y-auto'>
          {BRIEF_SECTIONS.map(s => (
            <div
              key={s.id}
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              className={`rounded-lg p-2.5 border cursor-default transition-all duration-150 ${
                hovered === s.id
                  ? 'border-blue-500/40 bg-blue-500/8'
                  : 'border-white/[0.06] bg-white/[0.03]'
              }`}
            >
              <p className={`text-[10px] font-semibold mb-0.5 transition-colors ${hovered === s.id ? 'text-blue-400' : 'text-white/40'}`}>
                {s.title}
              </p>
              <p className='text-[10px] text-white/50 leading-relaxed'>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className='w-px bg-white/[0.06] flex-shrink-0' />

        {/* JSON */}
        <div className='flex-1 overflow-y-auto'>
          <pre className='font-mono text-[10px] leading-relaxed whitespace-pre-wrap'>
            {JSON_SEGMENTS.map((seg, i) => (
              <span
                key={i}
                className={`transition-all duration-150 ${segmentColor(seg)}`}
                style={{ display: 'inline' }}
              >
                <JsonTokens text={seg.text} highlighted={!!seg.section && seg.section === hovered} />
              </span>
            ))}
          </pre>
        </div>
      </div>
    </div>
  )
}

function JsonTokens({ text, highlighted }: { text: string; highlighted: boolean }) {
  const tokens = text.split(/("(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|[{}\[\],:])/g)
  return (
    <>
      {tokens.map((tok, i) => {
        const isKey = tok.startsWith('"') && i + 1 < tokens.length && tokens[i + 1]?.trim() === ':'
        if (tok.startsWith('"')) {
          return (
            <span key={i} className={highlighted ? (isKey ? 'text-blue-300' : 'text-emerald-300') : (isKey ? 'text-blue-400/60' : 'text-emerald-400/60')}>
              {tok}
            </span>
          )
        }
        if (/^\d/.test(tok)) return <span key={i} className={highlighted ? 'text-orange-300' : 'text-orange-400/60'}>{tok}</span>
        if (['{', '}', '[', ']', ',', ':'].includes(tok))
          return <span key={i} className='text-white/20'>{tok}</span>
        return <span key={i} className='text-white/35'>{tok}</span>
      })}
    </>
  )
}

// ─── Shared: TileLabel ────────────────────────────────────────────────────────

function TileLabel({ icon, label, index }: { icon: React.ReactNode; label: string; index: string }) {
  return (
    <div className='flex items-center gap-2'>
      <span className='text-blue-400/70'>{icon}</span>
      <span className='text-[10px] font-semibold text-white/40 uppercase tracking-widest'>{label}</span>
      <span className='ml-auto font-mono text-[10px] text-white/15'>{index}</span>
    </div>
  )
}

// ─── BentoSection ─────────────────────────────────────────────────────────────

export function BentoSection() {
  return (
    <section className='bg-[#111318] px-8 py-20'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='mb-10'>
          <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
            Under the hood
          </p>
          <h2 className='text-3xl font-bold text-white tracking-tight'>
            Four layers. Zero noise.
          </h2>
          <p className='text-white/35 text-sm mt-2 max-w-lg'>
            Each layer in the SignalPath engine is interactive. Explore how raw tickets become ranked decisions.
          </p>
        </div>

        {/* Bento grid */}
        <div className='grid grid-cols-3 grid-rows-2 gap-4' style={{ height: '620px' }}>
          {/* Tile 1 — Signal Counter: col 1, rows 1-2 */}
          <div className='row-span-2'>
            <SignalCounterTile />
          </div>

          {/* Tile 2 — Problem Graph: col 2-3, row 1 */}
          <div className='col-span-2'>
            <ProblemGraphTile />
          </div>

          {/* Tile 3 — Scoring Slider: col 2, row 2 */}
          <div>
            <ScoringSliderTile />
          </div>

          {/* Tile 4 — Handoff: col 3, row 2 */}
          <div>
            <HandoffTile />
          </div>
        </div>
      </div>
    </section>
  )
}
