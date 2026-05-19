'use client'

import Link from 'next/link'
import { Sun, Moon, CheckCircle, MessageSquare, BarChart2, Code2, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../ThemeProvider'
import { SignalPathLogo } from './SignalPathLogo'

function HeroEmailCapture() {
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

  if (done) {
    return (
      <div className='flex items-center gap-2.5 justify-center text-sm text-gray-600 dark:text-white/60'>
        <CheckCircle className='w-5 h-5 text-emerald-500 flex-shrink-0' />
        You&rsquo;re on the list — we&rsquo;ll be in touch within 24 hours.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex gap-2 max-w-sm mx-auto'>
      <input
        type='email'
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder='you@company.com'
        className='flex-1 bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/25 focus:outline-none focus:border-blue-500/70 transition-colors shadow-sm'
      />
      <button
        type='submit'
        disabled={loading}
        className='bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap shadow-lg shadow-blue-600/20'
      >
        {loading ? 'Saving…' : 'Get access'}
      </button>
    </form>
  )
}

export function AboutPage() {
  const { theme, toggle } = useTheme()

  return (
    <div className='bg-[#F4F5F8] dark:bg-[#111318] text-gray-900 dark:text-white min-h-screen'>

      {/* ── Nav ── */}
      <nav className='sticky top-0 z-50 bg-white/80 dark:bg-[#111318]/80 backdrop-blur border-b border-gray-200/60 dark:border-white/[0.06] flex justify-between items-center px-8 py-4'>
        <Link href='/' className='flex items-center gap-2.5'>
          <SignalPathLogo />
          <span className='font-display font-bold text-gray-900 dark:text-white'>SignalPath</span>
        </Link>
        <div className='flex items-center gap-3'>
          <Link
            href='/about'
            className='text-sm text-gray-800 dark:text-white/80 font-medium px-3 py-1.5'
          >
            About
          </Link>
          <button
            onClick={toggle}
            className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors'
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
          <Link
            href='/signin'
            className='text-sm text-gray-500 dark:text-white/45 hover:text-gray-800 dark:hover:text-white/80 px-3 py-1.5 transition-colors'
          >
            Sign in
          </Link>
          <Link
            href='/signup'
            className='text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 font-medium transition-colors'
          >
            Get early access
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className='relative px-8 py-28 text-center overflow-hidden'>
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            backgroundImage: theme === 'dark'
              ? 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
              : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10 max-w-2xl mx-auto'>
          <p className='font-mono text-[10px] font-semibold text-blue-400/70 uppercase tracking-[0.2em] mb-4'>
            About SignalPath
          </p>
          <h1 className='font-display text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-5'>
            We built the tool we wished<br />existed as PMs
          </h1>
          <p className='text-lg text-gray-500 dark:text-white/45 leading-relaxed'>
            Every week a support queue fills up with clues about what to build next.
            Most of them go unread. SignalPath makes sure none of them do.
          </p>
        </div>
      </section>

      {/* ── The Problem ── */}
      <section className='px-8 py-16'>
        <div className='max-w-3xl mx-auto'>
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-10'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-4'>
              The problem
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white mb-5'>
              Support queues are a goldmine that nobody mines
            </h2>
            <div className='space-y-4 text-gray-600 dark:text-white/55 text-sm leading-relaxed'>
              <p>
                The average mid-market SaaS company receives thousands of support tickets every month.
                Buried in those tickets are the exact problems your customers care about most — described
                in their own words, attached to real account values, and sorted roughly by frequency already.
              </p>
              <p>
                The problem is that nobody has time to read them all. Support teams triage and close.
                PMs rely on what bubbles up in customer calls and their own intuition. Engineers build
                what&rsquo;s on the roadmap. The signal stays locked in the helpdesk.
              </p>
              <p>
                We&rsquo;ve worked at companies where a single lurking bug, mentioned in 300 tickets over 18 months,
                cost more in churn than the entire Q3 roadmap recovered. Nobody connected the dots because
                the data was there but the analysis wasn&rsquo;t.
              </p>
              <p className='font-medium text-gray-800 dark:text-white/80'>
                SignalPath connects those dots automatically — and hands engineers a spec that references
                their actual codebase, so they can start building the same day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className='px-8 py-16'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center mb-10'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
              How it works
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white'>
              Three steps from queue to spec
            </h2>
          </div>

          <div className='space-y-4'>
            {[
              {
                icon: <MessageSquare className='w-5 h-5 text-blue-400' />,
                iconBg: 'bg-blue-500/10',
                num: '01',
                title: 'Ingest signals',
                body: 'Connect your help desk — Zendesk, Intercom, or Freshdesk. SignalPath reads every ticket and conversation, plus optional Salesforce data for account ARR. Nothing leaves your security perimeter without encryption.',
              },
              {
                icon: <BarChart2 className='w-5 h-5 text-violet-400' />,
                iconBg: 'bg-violet-500/10',
                num: '02',
                title: 'Cluster and score',
                body: 'Our ML pipeline groups related signals into product opportunities and scores each one across six dimensions: churn risk, account breadth, severity, frequency, recency, and revenue at risk. Scores improve as your team rates results.',
              },
              {
                icon: <Code2 className='w-5 h-5 text-emerald-400' />,
                iconBg: 'bg-emerald-500/10',
                num: '03',
                title: 'Generate a dev-ready spec',
                body: 'Connect your GitHub repository and SignalPath indexes its skeleton — file paths, routes, models, functions. When a spec is generated it references your actual files, not generic service names. Push directly to Linear or Jira, or open in Cursor.',
              },
            ].map(step => (
              <div key={step.num} className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-6 flex gap-5'>
                <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  {step.icon}
                </div>
                <div>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <span className='font-mono text-[10px] text-gray-300 dark:text-white/20'>{step.num}</span>
                    <h3 className='text-sm font-bold text-gray-900 dark:text-white'>{step.title}</h3>
                  </div>
                  <p className='text-sm text-gray-500 dark:text-white/45 leading-relaxed'>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ── */}
      <section className='px-8 py-16'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center mb-10'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
              What we believe
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white'>
              Principles we build by
            </h2>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {[
              {
                title: 'Customer voice over intuition',
                body: "A PM's gut is useful. 800 tickets saying the same thing is a fact. We bias toward evidence.",
              },
              {
                title: 'Engineers deserve context',
                body: "A spec that says 'fix the auth bug' wastes engineering time. A spec that says modify TokenRefreshMiddleware in app/middleware/ starts a sprint.",
              },
              {
                title: 'Security by default',
                body: "We index your codebase skeleton — file paths, routes, function names. We never store source code, and all data is encrypted in transit and at rest.",
              },
              {
                title: 'Opinions, not dashboards',
                body: "You already have analytics. We tell you what to build next and why, ranked by what will actually move your retention curve.",
              },
            ].map(v => (
              <div key={v.title} className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-6'>
                <h3 className='text-sm font-bold text-gray-900 dark:text-white mb-2'>{v.title}</h3>
                <p className='text-sm text-gray-500 dark:text-white/45 leading-relaxed'>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ── */}
      <section className='px-8 py-16'>
        <div className='max-w-3xl mx-auto'>
          <div className='text-center mb-10'>
            <p className='font-mono text-[10px] font-semibold text-blue-400/60 uppercase tracking-[0.2em] mb-3'>
              Team
            </p>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white'>
              Small team, sharp focus
            </h2>
            <p className='text-sm text-gray-500 dark:text-white/40 mt-2'>
              We&rsquo;re a small team of engineers and product people who have been on both sides of the
              support queue — as customers and as the people trying to make sense of it.
            </p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            {[
              {
                initials: 'NK',
                color: '#3B82F6',
                name: 'Nishi Kantamneni',
                role: 'Founder · Product & Engineering',
                bio: 'Previously built ML-powered analytics at enterprise SaaS. Spent too many Fridays manually tagging support tickets and decided there had to be a better way.',
              },
            ].map(member => (
              <div key={member.name} className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-6 flex gap-4'>
                <div
                  className='w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm'
                  style={{ backgroundColor: member.color }}
                >
                  {member.initials}
                </div>
                <div>
                  <p className='text-sm font-bold text-gray-900 dark:text-white'>{member.name}</p>
                  <p className='text-[11px] text-blue-400/70 font-mono mb-2'>{member.role}</p>
                  <p className='text-xs text-gray-500 dark:text-white/40 leading-relaxed'>{member.bio}</p>
                </div>
              </div>
            ))}

            {/* We're hiring card */}
            <div className='bg-blue-500/5 dark:bg-blue-500/8 rounded-2xl border border-blue-500/20 dark:border-blue-500/15 p-6 flex items-center justify-between gap-4'>
              <div>
                <p className='text-sm font-bold text-gray-900 dark:text-white mb-1'>We&rsquo;re hiring</p>
                <p className='text-xs text-gray-500 dark:text-white/40 leading-relaxed'>
                  Looking for a founding engineer who wants to work on hard ML + product problems.
                </p>
              </div>
              <a
                href='mailto:hello@signalpath.ai?subject=Founding Engineer'
                className='flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 whitespace-nowrap transition-colors'
              >
                Get in touch
                <ArrowRight className='w-3.5 h-3.5' />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className='px-8 py-16'>
        <div className='max-w-2xl mx-auto'>
          <div className='rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-10 text-center'>
            <h2 className='font-display text-2xl font-bold text-gray-900 dark:text-white mb-3'>
              Ready to stop guessing what to build next?
            </h2>
            <p className='text-sm text-gray-500 dark:text-white/40 mb-7'>
              Connect your help desk in minutes. See your first ranked opportunities within 48 hours.
            </p>
            <HeroEmailCapture />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className='border-t border-gray-200 dark:border-white/[0.05] py-8'>
        <div className='max-w-6xl mx-auto px-8 flex items-center justify-between flex-wrap gap-4'>
          <div className='flex items-center gap-4 text-xs text-gray-400 dark:text-white/25'>
            <span>&copy; {new Date().getFullYear()} SignalPath</span>
            <span className='w-px h-3 bg-gray-300 dark:bg-white/10' />
            <a href='/privacy' className='hover:text-gray-600 dark:hover:text-white/50 transition-colors'>Privacy Policy</a>
            <span className='w-px h-3 bg-gray-300 dark:bg-white/10' />
            <a href='mailto:hello@signalpath.ai' className='hover:text-gray-600 dark:hover:text-white/50 transition-colors'>hello@signalpath.ai</a>
          </div>
          <a
            href='mailto:hello@signalpath.ai'
            className='text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors'
          >
            Get early access →
          </a>
        </div>
      </footer>
    </div>
  )
}
