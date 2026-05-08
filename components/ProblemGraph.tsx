'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { useRouter } from 'next/navigation'

export interface GraphNode {
  id: string
  label: string
  opportunity_score: number
  signal_count: number
  churn_signal_count: number
  recent_signal_count: number | null
  confidence: string | null
  dimension_c: number | null
  dimension_r: number | null
  dimension_f: number | null
}

export interface GraphEdge {
  source: string
  target: string
  shared_accounts: number
}

type GraphFilter = 'all' | 'high-confidence' | 'churn' | 'trending'

const FILTERS: { key: GraphFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'high-confidence', label: 'High Confidence' },
  { key: 'churn', label: 'Churn Risk' },
  { key: 'trending', label: 'Trending' },
]

function nodeRadius(n: GraphNode) {
  return Math.min(60, Math.max(18, Math.sqrt(n.signal_count) * 6))
}

function nodeColor(n: GraphNode) {
  const ratio = n.signal_count > 0 ? n.churn_signal_count / n.signal_count : 0
  if (ratio > 0.25) return '#EF4444'
  if (ratio > 0.10) return '#F59E0B'
  return '#22C55E'
}

function passesFilter(n: GraphNode, filter: GraphFilter) {
  if (filter === 'all') return true
  if (filter === 'high-confidence') {
    return n.signal_count >= 8 && (n.dimension_f ?? 0) >= 4
  }
  if (filter === 'churn') {
    return (n.dimension_c ?? 0) >= 4
  }
  if (filter === 'trending') {
    return n.signal_count > 0 &&
      (n.recent_signal_count ?? 0) / n.signal_count >= 0.4
  }
  return true
}

interface Props {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function ProblemGraph({ nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [filter, setFilter] = useState<GraphFilter>('all')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    svg.selectAll('*').remove()

    const rect = svgRef.current!.getBoundingClientRect()
    const W = rect.width || 900
    const H = rect.height || 600

    // Zoom container
    const g = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform)),
    )

    // Dim non-matching nodes when filter active
    const dimmedNodes = filter === 'all' ? [] : nodes.filter(n => !passesFilter(n, filter))
    const dimmedIds = new Set(dimmedNodes.map(n => n.id))

    const simNodes = nodes.map(n => ({ ...n })) as (GraphNode & d3.SimulationNodeDatum)[]
    const nodeById = new Map(simNodes.map(n => [n.id, n]))

    const simEdges = edges.map(e => ({
      source: nodeById.get(e.source as string)!,
      target: nodeById.get(e.target as string)!,
      shared_accounts: e.shared_accounts,
    }))

    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges)
        .id((d) => (d as GraphNode).id)
        .distance(d => Math.max(60, 160 - (d as typeof simEdges[0]).shared_accounts * 10)))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius((d) => nodeRadius(d as GraphNode) + 10))

    // Edges
    const link = g.append('g')
      .selectAll<SVGLineElement, typeof simEdges[0]>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', '#6B7280')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => Math.max(1, Math.sqrt(d.shared_accounts) * 1.8))

    // Edge labels (shared account count)
    const edgeLabel = g.append('g')
      .selectAll<SVGTextElement, typeof simEdges[0]>('text')
      .data(simEdges.filter(e => e.shared_accounts >= 3))
      .join('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#9CA3AF')
      .attr('font-size', 9)
      .attr('pointer-events', 'none')
      .text(d => `${d.shared_accounts} accts`)

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, typeof simNodes[0]>('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .attr('opacity', d => dimmedIds.has(d.id) ? 0.2 : 1)
      .call(
        d3.drag<SVGGElement, typeof simNodes[0]>()
          .on('start', (event, d) => {
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x; d.fy = d.y
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event) => {
            if (!event.active) sim.alphaTarget(0)
          }),
      )

    // Circle
    node.append('circle')
      .attr('r', d => nodeRadius(d))
      .attr('fill', d => nodeColor(d))
      .attr('fill-opacity', 0.15)
      .attr('stroke', d => nodeColor(d))
      .attr('stroke-width', 2)

    // Score label inside circle
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', d => nodeColor(d))
      .attr('font-size', d => nodeRadius(d) > 30 ? 13 : 10)
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .text(d => d.opportunity_score.toFixed(1))

    // Cluster label below circle
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', d => nodeRadius(d) + 13)
      .attr('fill', '#9CA3AF')
      .attr('font-size', 10)
      .attr('pointer-events', 'none')
      .text(d => d.label.length > 28 ? d.label.slice(0, 27) + '…' : d.label)

    // Click → navigate to detail
    node.on('click', (event, d) => {
      if (!dimmedIds.has(d.id)) {
        router.push(`/opportunities/${d.id}`)
      }
    })

    // Hover tooltip
    node
      .on('mouseenter', (event, d) => {
        const svgRect = svgRef.current!.getBoundingClientRect()
        setTooltip({
          x: event.clientX - svgRect.left,
          y: event.clientY - svgRect.top,
          node: d,
        })
      })
      .on('mouseleave', () => setTooltip(null))

    sim.on('tick', () => {
      link
        .attr('x1', d => (d.source as typeof simNodes[0]).x!)
        .attr('y1', d => (d.source as typeof simNodes[0]).y!)
        .attr('x2', d => (d.target as typeof simNodes[0]).x!)
        .attr('y2', d => (d.target as typeof simNodes[0]).y!)

      edgeLabel
        .attr('x', d => ((d.source as typeof simNodes[0]).x! + (d.target as typeof simNodes[0]).x!) / 2)
        .attr('y', d => ((d.source as typeof simNodes[0]).y! + (d.target as typeof simNodes[0]).y!) / 2 - 4)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => { sim.stop() }
  }, [nodes, edges, filter, router])

  const hasEdges = edges.length > 0

  return (
    <div className='relative w-full' style={{ height: 620 }}>
      {/* Filter bar */}
      <div className='absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur border border-gray-100 dark:border-white/[0.07] rounded-xl px-3 py-2 shadow-sm'>
        {FILTERS.map(f => (
          <button
            key={f.key}
            type='button'
            onClick={() => setFilter(f.key)}
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className='absolute top-3 right-3 z-10 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur border border-gray-100 dark:border-white/[0.07] rounded-xl px-3 py-2.5 shadow-sm space-y-1.5'>
        <p className='text-[10px] font-semibold text-gray-400 dark:text-white/30 uppercase tracking-wider mb-1'>Churn correlation</p>
        {[
          { color: '#EF4444', label: '> 25%' },
          { color: '#F59E0B', label: '10–25%' },
          { color: '#22C55E', label: '< 10%' },
        ].map(({ color, label }) => (
          <div key={label} className='flex items-center gap-2'>
            <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: color }} />
            <span className='text-[10px] text-gray-500 dark:text-white/40'>{label}</span>
          </div>
        ))}
        <p className='text-[10px] text-gray-400 dark:text-white/25 mt-1 pt-1 border-t border-gray-100 dark:border-white/[0.05]'>
          Size = signal volume<br />Edge = shared accounts
        </p>
      </div>

      {/* Empty edge state */}
      {!hasEdges && (
        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 dark:bg-[#1A1D24]/90 backdrop-blur border border-gray-100 dark:border-white/[0.07] rounded-xl px-4 py-2.5 shadow-sm'>
          <p className='text-xs text-gray-400 dark:text-white/30 text-center'>
            No compound problems detected — clusters don&apos;t share accounts yet
          </p>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className='absolute z-20 pointer-events-none bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.08] rounded-xl shadow-lg px-3 py-2.5 max-w-[220px]'
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <p className='text-xs font-semibold text-gray-800 dark:text-white/90 leading-snug mb-1'>
            {tooltip.node.label}
          </p>
          <div className='space-y-0.5'>
            <p className='text-[10px] text-gray-500 dark:text-white/40'>
              Score: <span className='text-gray-700 dark:text-white/70 font-medium'>{tooltip.node.opportunity_score.toFixed(1)}</span>
            </p>
            <p className='text-[10px] text-gray-500 dark:text-white/40'>
              Signals: <span className='text-gray-700 dark:text-white/70 font-medium'>{tooltip.node.signal_count}</span>
            </p>
            <p className='text-[10px] text-gray-500 dark:text-white/40'>
              Churn signals: <span className='text-gray-700 dark:text-white/70 font-medium'>{tooltip.node.churn_signal_count}</span>
            </p>
          </div>
          <p className='text-[10px] text-blue-400 mt-1.5'>Click to explore →</p>
        </div>
      )}

      <svg
        ref={svgRef}
        className='w-full h-full rounded-2xl bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07]'
      />
    </div>
  )
}
