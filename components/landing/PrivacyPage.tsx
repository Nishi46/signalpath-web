'use client'

import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../ThemeProvider'
import { SignalPathLogo } from './SignalPathLogo'

export function PrivacyPage() {
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
      <section className='relative px-8 py-20 text-center overflow-hidden'>
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
            Legal
          </p>
          <h1 className='font-display text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-[1.1] mb-5'>
            Privacy Policy
          </h1>
          <p className='text-base text-gray-500 dark:text-white/45'>
            Last updated: May 19, 2026
          </p>
        </div>
      </section>

      {/* ── Content ── */}
      <section className='px-8 pb-20'>
        <div className='max-w-3xl mx-auto'>
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-200 dark:border-white/[0.07] p-10 space-y-10 text-sm text-gray-600 dark:text-white/55 leading-relaxed'>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Overview</h2>
              <p>
                SignalPath (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates as an early-access product that connects to your support tooling,
                analyzes customer feedback, and surfaces product opportunities. This Privacy Policy explains what data we
                collect, how we use it, and the choices you have. If you have questions, reach out at{' '}
                <a href='mailto:nishigoldy@gmail.com' className='text-blue-500 hover:text-blue-400 transition-colors'>
                  nishigoldy@gmail.com
                </a>.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Information we collect</h2>
              <div className='space-y-3'>
                <p>
                  <span className='font-medium text-gray-800 dark:text-white/80'>Account information.</span>{' '}
                  When you sign up we collect your name, work email address, and company name.
                </p>
                <p>
                  <span className='font-medium text-gray-800 dark:text-white/80'>Helpdesk data.</span>{' '}
                  When you connect an integration (Zendesk, Intercom, Linear, Jira, etc.) we read support ticket
                  content, metadata, and customer identifiers that you grant us access to. We do not store raw ticket
                  bodies beyond what is necessary to generate analysis.
                </p>
                <p>
                  <span className='font-medium text-gray-800 dark:text-white/80'>Codebase context.</span>{' '}
                  If you connect a GitHub repository, we index file structure and relevant code snippets to generate
                  engineering specs. We do not store your source code beyond the indexed embeddings.
                </p>
                <p>
                  <span className='font-medium text-gray-800 dark:text-white/80'>Usage data.</span>{' '}
                  We collect standard web analytics (pages visited, feature interactions, timestamps) to understand
                  how the product is used and to improve it.
                </p>
              </div>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>How we use your data</h2>
              <ul className='space-y-2 list-disc list-inside marker:text-blue-400'>
                <li>To provide, maintain, and improve the SignalPath service.</li>
                <li>To generate signal clusters, feature opportunity rankings, and engineering specs.</li>
                <li>To communicate with you about your account, updates, and early-access milestones.</li>
                <li>To detect and prevent abuse or unauthorized access.</li>
              </ul>
              <p className='mt-4'>
                We do not sell your data. We do not use your support ticket content or codebase data to train shared
                models or share it with other customers.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Third-party services</h2>
              <p>
                SignalPath relies on a small number of sub-processors to operate: Supabase (database and
                authentication), and AI model providers for natural-language analysis. Each is bound by data
                processing agreements and appropriate security standards. We do not share your data with third parties
                for advertising or marketing purposes.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Data retention</h2>
              <p>
                We retain your account data for as long as your account is active. Helpdesk-derived analysis and
                embeddings are retained to power the product and deleted within 30 days of account closure on request.
                You can request deletion at any time by emailing{' '}
                <a href='mailto:nishigoldy@gmail.com' className='text-blue-500 hover:text-blue-400 transition-colors'>
                  nishigoldy@gmail.com
                </a>.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Security</h2>
              <p>
                We use industry-standard encryption in transit (TLS) and at rest. Access to production data is
                restricted to authorized team members. We conduct regular security reviews as the product matures.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Your rights</h2>
              <p>
                Depending on your jurisdiction you may have the right to access, correct, port, or delete your
                personal data. To exercise any of these rights, email{' '}
                <a href='mailto:nishigoldy@gmail.com' className='text-blue-500 hover:text-blue-400 transition-colors'>
                  nishigoldy@gmail.com
                </a>{' '}
                and we will respond within 30 days.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Changes to this policy</h2>
              <p>
                We may update this policy as the product evolves. We will notify active users of material changes by
                email. Continued use of SignalPath after notice constitutes acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className='font-display text-lg font-bold text-gray-900 dark:text-white mb-3'>Contact</h2>
              <p>
                Questions or concerns? Email us at{' '}
                <a href='mailto:nishigoldy@gmail.com' className='text-blue-500 hover:text-blue-400 transition-colors'>
                  nishigoldy@gmail.com
                </a>.
              </p>
            </div>

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
            <a href='mailto:nishigoldy@gmail.com' className='hover:text-gray-600 dark:hover:text-white/50 transition-colors'>nishigoldy@gmail.com</a>
          </div>
          <a
            href='mailto:nishigoldy@gmail.com'
            className='text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors'
          >
            Get early access →
          </a>
        </div>
      </footer>
    </div>
  )
}
