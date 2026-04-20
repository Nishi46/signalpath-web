'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Code2,
  X,
  CheckCircle,
  ChevronRight,
} from 'lucide-react'
import { BentoSection } from './BentoSection'

// ─── Mock Data ────────────────────────────────────────────────────────────────

type Opportunity = {
  id: string
  title: string
  score: number
  tickets: number
  churn: number
  revenue: number
  dims: Record<string, number>
  verbatims: { text: string; from: string }[]
}

const OPPS: Opportunity[] = [
  {
    id: 'opp_1',
    title: 'OAuth token expiry crashes API integrations mid-session',
    score: 9.1,
    tickets: 47,
    churn: 12,
    revenue: 284000,
    dims: {
      'Churn Risk': 9.8,
      'Account Breadth': 9.4,
      'Severity': 9.2,
      'Frequency': 8.9,
      'Recency': 8.6,
      'Revenue': 9.0,
    },
    verbatims: [
      {
        text: "We're losing 3 active sessions per hour because of token expiry. This is costing us a critical demo with Acme Corp tomorrow.",
        from: 'Enterprise · $240K ARR',
      },
      {
        text: "Had to roll back our Salesforce integration twice this week. Engineering is spending more time on this than our actual roadmap.",
        from: 'Mid-market · $72K ARR',
      },
      {
        text: "This bug alone is why we're evaluating switching vendors before our contract renewal in Q2.",
        from: 'Enterprise · $180K ARR',
      },
    ],
  },
  {
    id: 'opp_2',
    title: 'Bulk export times out for accounts with >10k records',
    score: 8.4,
    tickets: 38,
    churn: 8,
    revenue: 196000,
    dims: {
      'Churn Risk': 7.9,
      'Account Breadth': 8.2,
      'Severity': 8.5,
      'Frequency': 8.1,
      'Recency': 8.8,
      'Revenue': 8.3,
    },
    verbatims: [
      {
        text: "Every Monday morning sync fails. We've built a workaround but it takes 2 hours of manual work each week.",
        from: 'Enterprise · $156K ARR',
      },
      {
        text: 'Finance team is blocked on quarterly reporting. This is a P0 for us.',
        from: 'Mid-market · $84K ARR',
      },
    ],
  },
  {
    id: 'opp_3',
    title: 'Webhook delivery fails silently on 4xx client errors',
    score: 7.7,
    tickets: 29,
    churn: 5,
    revenue: 147000,
    dims: {
      'Churn Risk': 7.2,
      'Account Breadth': 7.4,
      'Severity': 7.9,
      'Frequency': 7.6,
      'Recency': 7.8,
      'Revenue': 7.5,
    },
    verbatims: [
      {
        text: "Silent failures are the worst. We had no idea data wasn't syncing for 2 weeks.",
        from: 'Growth · $48K ARR',
      },
      {
        text: 'Need dead-letter queue or at minimum email alerts when webhooks fail.',
        from: 'Mid-market · $95K ARR',
      },
    ],
  },
  {
    id: 'opp_4',
    title: 'Custom field mapping lost after workspace migration',
    score: 6.2,
    tickets: 22,
    churn: 2,
    revenue: 89000,
    dims: {
      'Churn Risk': 5.8,
      'Account Breadth': 6.0,
      'Severity': 6.5,
      'Frequency': 6.3,
      'Recency': 6.1,
      'Revenue': 6.4,
    },
    verbatims: [
      {
        text: "Migration took 3 days to re-map everything. There should be an export/import for field configs.",
        from: 'Enterprise · $210K ARR',
      },
    ],
  },
  {
    id: 'opp_5',
    title: 'Dashboard filter state not persisted across page reloads',
    score: 5.8,
    tickets: 18,
    churn: 1,
    revenue: 45000,
    dims: {
      'Churn Risk': 4.8,
      'Account Breadth': 5.5,
      'Severity': 5.9,
      'Frequency': 5.7,
      'Recency': 6.2,
      'Revenue': 5.4,
    },
    verbatims: [
      {
        text: "Every time I reload the page I have to re-apply my filters. It's death by a thousand cuts.",
        from: 'Growth · $36K ARR',
      },
    ],
  },
]

const SPEC_JSON = `{
  "opportunity_id": "opp_9f2a3c",
  "schema_version": "1.2",
  "generated_at": "2026-04-20T09:14:33Z",
  "title": "OAuth token expiry crashes API integrations",
  "priority": "critical",
  "score": 9.1,
  "affected_accounts": 47,
  "revenue_at_risk_usd": 284000,
  "churn_signals": 12,
  "recommended_action": "ship_fix",
  "spec": {
    "problem_statement": "OAuth2 access tokens expire after 1h with no silent refresh, terminating active API sessions and requiring full re-auth.",
    "acceptance_criteria": [
      "Implement silent token refresh 5 min before expiry",
      "Add refresh token rotation with 30-day TTL",
      "Emit auth.token_refreshed event to audit log",
      "Zero session interruptions in staging for 48h"
    ],
    "affected_services": [
      "api-gateway",
      "auth-service",
      "session-manager"
    ],
    "suggested_assignee": "platform-team",
    "estimated_effort": "3-5 days"
  },
  "evidence": {
    "verbatim_count": 47,
    "top_accounts": [
      { "name": "Acme Corp", "arr": 240000 },
      { "name": "GlobalTech", "arr": 180000 }
    ]
  }
}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 8) return { bar: '#F97316', text: '#FB923C', badge: 'text-orange-400 bg-orange-500/10 ring-1 ring-orange-500/20' }
  if (score >= 6) return { bar: '#F59E0B', text: '#FBBF24', badge: 'text-amber-400 bg-amber-500/10 ring-1 ring-amber-500/20' }
  return { bar: '#64748B', text: '#94A3B8', badge: 'text-slate-400 bg-slate-500/10 ring-1 ring-slate-500/20' }
}

function fmt(n: number) {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n}`
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

function FeedCard({
  opp,
  isSelected,
  isTop,
  compact,
  onClick,
}: {
  opp: Opportunity
  isSelected: boolean
  isTop: boolean
  compact: boolean
  onClick: () => void
}) {
  const { bar, badge } = scoreColor(opp.score)
  return (
    <button
      onClick={onClick}
      className={[
        'relative w-full text-left rounded-xl overflow-hidden transition-all duration-200 border group',
        isSelected
          ? 'border-blue-500/40 bg-[#1A1D24]'
          : 'border-white/[0.07] bg-[#1A1D24] hover:border-white/[0.14] hover:bg-[#1E2129]',
        isTop && !isSelected ? 'animate-glow-pulse' : '',
      ].join(' ')}
    >
      {/* score bar accent */}
      <div className='absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl' style={{ backgroundColor: bar }} />

      <div className={`pl-4 pr-3 ${compact ? 'py-2.5' : 'py-3'}`}>
        <div className='flex items-start justify-between gap-2 mb-1.5'>
          <span
            className={`font-semibold text-white/90 leading-snug flex-1 ${compact ? 'text-[11px] line-clamp-2' : 'text-xs line-clamp-2'} group-hover:text-white transition-colors`}
          >
            {opp.title}
          </span>
          <span className={`flex-shrink-0 font-mono font-bold rounded-md px-1.5 py-0.5 tabular-nums ${compact ? 'text-[10px]' : 'text-xs'} ${badge}`}>
            {opp.score.toFixed(1)}
          </span>
        </div>
        {!compact && (
          <div className='flex items-center gap-3 text-[10px] text-white/35'>
            <span className='flex items-center gap-1'>
              <MessageSquare className='w-3 h-3' />
              {opp.tickets}
            </span>
            {opp.churn > 0 && (
              <span className='flex items-center gap-1 text-orange-400/70'>
                <AlertTriangle className='w-3 h-3' />
                {opp.churn} churn
              </span>
            )}
            <span className='flex items-center gap-1 text-emerald-400/70'>
              <DollarSign className='w-3 h-3' />
              {fmt(opp.revenue)}
            </span>
          </div>
        )}
      </div>

      {/* pulsing dot for top card */}
      {isTop && (
        <span className='absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-orange-400 animate-dot-pulse' />
      )}
    </button>
  )
}

// ─── DetailPanel ──────────────────────────────────────────────────────────────

function DetailPanel({
  opp,
  onClose,
  onGenerateSpec,
}: {
  opp: Opportunity
  onClose: () => void
  onGenerateSpec: () => void
}) {
  const [animated, setAnimated] = useState(false)
  const { bar, text } = scoreColor(opp.score)

  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [opp.id])

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      {/* Header */}
      <div className='flex items-start gap-3 mb-4'>
        <h2 className='text-sm font-bold text-white leading-snug flex-1'>{opp.title}</h2>
        <button
          onClick={onClose}
          className='text-white/25 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5'
          aria-label='Close'
        >
          <X className='w-4 h-4' />
        </button>
      </div>

      {/* Score hero */}
      <div className='flex items-end gap-3 mb-5'>
        <span className='font-mono text-4xl font-black leading-none' style={{ color: text }}>
          {opp.score.toFixed(1)}
        </span>
        <div className='text-[10px] text-white/35 pb-1 space-y-0.5'>
          <div>{opp.tickets} tickets · {opp.churn} churn signals</div>
          <div className='text-emerald-400/70'>{fmt(opp.revenue)} revenue at risk</div>
        </div>
      </div>

      {/* Score dimensions */}
      <div className='mb-5'>
        <p className='text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5'>
          Score Breakdown
        </p>
        <div className='space-y-2'>
          {Object.entries(opp.dims).map(([dim, val]) => (
            <div key={dim} className='flex items-center gap-2.5'>
              <span className='text-[10px] text-white/45 w-28 flex-shrink-0'>{dim}</span>
              <div className='flex-1 bg-white/[0.06] rounded-full h-1 overflow-hidden'>
                <div
                  className='h-full rounded-full'
                  style={{
                    width: animated ? `${(val / 10) * 100}%` : '0%',
                    backgroundColor: bar,
                    transition: 'width 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                />
              </div>
              <span className='font-mono text-[10px] text-white/35 w-6 text-right'>{val.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Verbatims */}
      <div className='flex-1 overflow-y-auto min-h-0 mb-4'>
        <p className='text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2.5'>
          Representative Signals
        </p>
        <div className='space-y-2'>
          {opp.verbatims.map((v, i) => (
            <div key={i} className='bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]'>
              <p className='text-[11px] text-white/65 leading-relaxed italic mb-1.5'>
                &ldquo;{v.text}&rdquo;
              </p>
              <p className='text-[10px] text-white/25'>{v.from}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onGenerateSpec}
        className='flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors flex-shrink-0'
      >
        <Code2 className='w-3.5 h-3.5' />
        Generate Spec
        <ChevronRight className='w-3.5 h-3.5' />
      </button>
    </div>
  )
}

// ─── SpecPanel ────────────────────────────────────────────────────────────────

function SpecPanel({ specText, onClose }: { specText: string; onClose: () => void }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [specText])

  return (
    <div className='h-full flex flex-col bg-[#0D1117] rounded-2xl border border-white/[0.07] overflow-hidden animate-slide-in-right'>
      {/* Title bar */}
      <div className='flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0'>
        <div className='flex items-center gap-2.5'>
          <div className='flex gap-1.5'>
            <span className='w-2.5 h-2.5 rounded-full bg-red-500/50' />
            <span className='w-2.5 h-2.5 rounded-full bg-yellow-500/50' />
            <span className='w-2.5 h-2.5 rounded-full bg-green-500/50' />
          </div>
          <span className='font-mono text-[10px] text-white/25'>agent_spec.json</span>
        </div>
        <button
          onClick={onClose}
          className='text-white/20 hover:text-white/50 transition-colors'
          aria-label='Close spec'
        >
          <X className='w-3.5 h-3.5' />
        </button>
      </div>
      <div className='flex-1 overflow-y-auto p-4'>
        <pre className='font-mono text-[11px] leading-relaxed whitespace-pre-wrap'>
          <JsonHighlight text={specText} />
          {specText.length < SPEC_JSON.length && (
            <span className='text-white/60 animate-pulse'>█</span>
          )}
        </pre>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── JSON Syntax Highlight ────────────────────────────────────────────────────

function JsonHighlight({ text }: { text: string }) {
  // Minimal tokenizer: keys, strings, numbers, booleans, punctuation
  const tokens = text.split(/("(?:[^"\\]|\\.)*"|\b\d+(?:\.\d+)?\b|[{}\[\],:])/g)
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.startsWith('"')) {
          const isKey = i + 1 < tokens.length && tokens[i + 1]?.trim() === ':'
          return (
            <span key={i} className={isKey ? 'text-blue-400' : 'text-emerald-400'}>
              {tok}
            </span>
          )
        }
        if (/^\d/.test(tok)) return <span key={i} className='text-orange-400'>{tok}</span>
        if (tok === 'true' || tok === 'false' || tok === 'null')
          return <span key={i} className='text-purple-400'>{tok}</span>
        if (['{', '}', '[', ']', ',', ':'].includes(tok))
          return <span key={i} className='text-white/30'>{tok}</span>
        return <span key={i} className='text-white/50'>{tok}</span>
      })}
    </>
  )
}

// ─── Conversion Banner ───────────────────────────────────────────────────────

function ConversionBanner({ onDismiss }: { onDismiss: () => void }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setDone(true)
    } catch {
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up'>
      <div className='max-w-xl mx-auto bg-[#1A1D24] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-black/60'>
        <button
          onClick={onDismiss}
          className='absolute top-3 right-3 text-white/25 hover:text-white/55 transition-colors'
          aria-label='Dismiss'
        >
          <X className='w-4 h-4' />
        </button>

        {done ? (
          <div className='flex items-center gap-3 text-sm'>
            <CheckCircle className='w-5 h-5 text-emerald-400 flex-shrink-0' />
            <span className='text-white/70'>
              You&rsquo;re on the list. We&rsquo;ll be in touch within 24 hours.
            </span>
          </div>
        ) : (
          <>
            <p className='text-white/80 text-sm font-semibold mb-0.5'>
              This demo uses synthetic data.
            </p>
            <p className='text-white/35 text-xs mb-4'>
              Connect your real Zendesk and see your actual opportunities in 24 hours.
            </p>
            <form onSubmit={handleSubmit} className='flex gap-2'>
              <input
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='you@company.com'
                className='flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-colors'
              />
              <button
                type='submit'
                disabled={loading}
                className='bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap'
              >
                {loading ? 'Saving…' : 'Get access'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MissionControlPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSpec, setShowSpec] = useState(false)
  const [specText, setSpecText] = useState('')
  const [showBanner, setShowBanner] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const specIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const specIndexRef = useRef(0)
  const engagedRef = useRef(false)

  const selected = OPPS.find(o => o.id === selectedId) ?? null

  // Banner after 30 s of page load, or sooner after first interaction
  useEffect(() => {
    const t = setTimeout(() => {
      if (!bannerDismissed) setShowBanner(true)
    }, 30_000)
    return () => clearTimeout(t)
  }, [bannerDismissed])

  // Start typewriter for spec JSON
  const startSpec = useCallback(() => {
    setShowSpec(true)
    setSpecText('')
    specIndexRef.current = 0
    if (specIntervalRef.current) clearInterval(specIntervalRef.current)
    specIntervalRef.current = setInterval(() => {
      specIndexRef.current += 2 // 2 chars per tick for snappy feel
      setSpecText(SPEC_JSON.slice(0, specIndexRef.current))
      if (specIndexRef.current >= SPEC_JSON.length) {
        clearInterval(specIntervalRef.current!)
        specIntervalRef.current = null
      }
    }, 10)
  }, [])

  useEffect(() => {
    return () => {
      if (specIntervalRef.current) clearInterval(specIntervalRef.current)
    }
  }, [])

  function handleCardClick(id: string) {
    if (selectedId === id) {
      setSelectedId(null)
      setShowSpec(false)
      setSpecText('')
    } else {
      setSelectedId(id)
      setShowSpec(false)
      setSpecText('')
    }
    // After first interaction, show banner after 25 s
    if (!engagedRef.current) {
      engagedRef.current = true
      setTimeout(() => {
        if (!bannerDismissed) setShowBanner(true)
      }, 25_000)
    }
  }

  return (
    <div className='min-h-screen bg-[#111318] text-white overflow-x-hidden'>
      {/* ══════════════════ HERO ══════════════════ */}
      <section className='relative flex flex-col' style={{ minHeight: '100svh' }}>
        {/* Subtle grid background */}
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Nav */}
        <nav className='relative z-10 flex justify-between items-center px-8 py-5'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30'>
              <span className='text-white font-bold text-sm'>S</span>
            </div>
            <span className='font-bold text-lg text-white'>SignalPath</span>
          </div>
          <div className='flex items-center gap-3'>
            <Link
              href='/signin'
              className='text-sm text-white/45 hover:text-white/80 px-3 py-2 transition-colors'
            >
              Sign in
            </Link>
            <Link
              href='/signup'
              className='text-sm bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-500 font-medium transition-colors shadow-lg shadow-blue-600/25'
            >
              Get early access
            </Link>
          </div>
        </nav>

        {/* Content */}
        <div className='relative z-10 flex-1 flex items-center px-8 py-6 overflow-hidden'>
          <div className='flex gap-5 w-full max-w-6xl mx-auto' style={{ minHeight: 0 }}>

            {/* ── Feed column ── */}
            <div
              className='flex-shrink-0 transition-all duration-400'
              style={{ width: selected ? '280px' : '100%', maxWidth: selected ? '280px' : '480px', margin: selected ? undefined : '0 auto' }}
            >
              {!selected && (
                <div className='text-center mb-6 animate-fade-in'>
                  <p className='font-mono text-[10px] font-semibold text-white/25 uppercase tracking-[0.2em] mb-1'>
                    Live Opportunity Feed
                  </p>
                  <p className='text-white/20 text-xs'>Click any opportunity to explore the detail view</p>
                </div>
              )}
              <div className='space-y-2'>
                {OPPS.map((opp, i) => (
                  <FeedCard
                    key={opp.id}
                    opp={opp}
                    isSelected={selectedId === opp.id}
                    isTop={i === 0}
                    compact={!!selected}
                    onClick={() => handleCardClick(opp.id)}
                  />
                ))}
              </div>
            </div>

            {/* ── Detail / Spec column ── */}
            {selected && (
              <div className='flex-1 flex gap-4 animate-slide-in-right overflow-hidden' style={{ minHeight: 0 }}>
                {/* Detail panel */}
                <div
                  className='bg-[#1A1D24] rounded-2xl border border-white/[0.07] p-5 flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300'
                  style={{ width: showSpec ? '320px' : '100%' }}
                >
                  <DetailPanel
                    opp={selected}
                    onClose={() => {
                      setSelectedId(null)
                      setShowSpec(false)
                      setSpecText('')
                    }}
                    onGenerateSpec={startSpec}
                  />
                </div>

                {/* Spec JSON panel */}
                {showSpec && (
                  <div className='flex-1 overflow-hidden' style={{ minWidth: 0 }}>
                    <SpecPanel specText={specText} onClose={() => { setShowSpec(false); setSpecText('') }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tagline bar */}
        <div className='relative z-10 border-t border-white/[0.05] py-3 px-8'>
          <p className='text-center font-mono text-[11px] text-white/25 tracking-wide'>
            &ldquo;This is what your Zendesk tickets are trying to tell you.&rdquo;
          </p>
        </div>
      </section>

      {/* ══════════════════ BENTO ══════════════════ */}
      <BentoSection />

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className='border-t border-white/[0.05] py-8 text-center'>
        <p className='text-xs text-white/20'>
          &copy; {new Date().getFullYear()} SignalPath. All rights reserved.
        </p>
      </footer>

      {/* ══════════════════ CONVERSION BANNER ══════════════════ */}
      {showBanner && !bannerDismissed && (
        <ConversionBanner onDismiss={() => setBannerDismissed(true)} />
      )}
    </div>
  )
}
