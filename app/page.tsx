import Link from 'next/link'
import { EmailCaptureForm } from '@/components/EmailCaptureForm'
import { ArrowRight, Zap, BarChart3, Send } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className='min-h-screen bg-white'>
      {/* Nav */}
      <nav className='flex justify-between items-center px-8 py-5 max-w-6xl mx-auto'>
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold text-sm'>S</span>
          </div>
          <span className='font-bold text-lg text-gray-900'>SignalPath</span>
        </div>
        <div className='flex items-center gap-3'>
          <Link href='/signin' className='text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors'>
            Sign in
          </Link>
          <Link
            href='/signup'
            className='text-sm bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium transition-colors'
          >
            Get early access
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className='relative overflow-hidden'>
        <div className='absolute inset-0 bg-gradient-to-b from-blue-50/50 via-white to-white' />
        <div className='absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-100/30 rounded-full blur-3xl' />

        <div className='relative max-w-3xl mx-auto px-8 pt-24 pb-20 text-center'>
          <div className='inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 border border-blue-100'>
            <span className='w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse' />
            90-day pilots open — 10 spots remaining
          </div>
          <h1 className='text-5xl sm:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6 tracking-tight'>
            The only tool that tells you which problems will{' '}
            <span className='bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent'>
              cost you customers
            </span>
            <br />if you ignore them.
          </h1>
          <p className='text-xl text-gray-500 mb-12 max-w-xl mx-auto leading-relaxed'>
            Connect your Zendesk. See ranked product opportunities in 48 hours.
            Push to Linear or Jira in one click.
          </p>
          <EmailCaptureForm />
          <p className='text-gray-400 text-sm mt-5'>
            Or{' '}
            <a
              href='https://calendly.com/nishigoldy'
              className='text-blue-600 hover:text-blue-700 font-medium hover:underline'
              target='_blank'
              rel='noopener noreferrer'
            >
              book a 15-minute demo directly
              <ArrowRight className='w-3.5 h-3.5 inline ml-1' />
            </a>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className='max-w-4xl mx-auto px-8 py-20'>
        <div className='text-center mb-14'>
          <p className='text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wide'>How it works</p>
          <h2 className='text-3xl font-bold text-gray-900'>Three steps to better product decisions</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-10'>
          {[
            {
              icon: Zap,
              title: 'Connect Zendesk',
              desc: 'One-click OAuth. We import the last 90 days of tickets automatically.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              icon: BarChart3,
              title: 'AI finds the patterns',
              desc: 'SignalPath clusters tickets by problem and scores each one by frequency, recency, and churn risk.',
              color: 'bg-sky-50 text-sky-600',
            },
            {
              icon: Send,
              title: 'Act on ranked decisions',
              desc: 'See opportunities ranked by urgency. Push to Linear or Jira in one click.',
              color: 'bg-blue-50 text-blue-600',
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className='text-center'>
              <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <Icon className='w-6 h-6' />
              </div>
              <h3 className='font-semibold text-gray-900 text-lg mb-2'>{title}</h3>
              <p className='text-gray-500 text-sm leading-relaxed'>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className='max-w-3xl mx-auto px-8 py-20'>
        <div className='text-center mb-14'>
          <p className='text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wide'>FAQ</p>
          <h2 className='text-3xl font-bold text-gray-900'>Common questions</h2>
        </div>
        <div className='divide-y divide-gray-100'>
          {[
            {
              q: 'How long does setup take?',
              a: 'About five minutes. You connect your Zendesk account via OAuth — no API keys to copy, no spreadsheets to export. SignalPath pulls the last 90 days of tickets automatically and the first ranked opportunities are ready within 48 hours.',
            },
            {
              q: 'Do you read the content of our support tickets?',
              a: 'SignalPath processes ticket text to detect patterns and cluster similar problems. We never store raw ticket content beyond what is needed for analysis, and your data is never used to train models for other customers. Each workspace is fully isolated.',
            },
            {
              q: 'What if we use Intercom, Freshdesk, or another help desk?',
              a: 'Zendesk is the only direct integration right now. Intercom and Freshdesk are on the roadmap. If you are on a different platform, reach out — we can often import via CSV while a native connector is built.',
            },
            {
              q: 'How is the opportunity score calculated?',
              a: 'The formula weighs six dimensions: account breadth (how many customers are affected), severity, churn risk, recency, frequency, and revenue at risk. Once your team rates 50 opportunities, a personalized XGBoost model replaces the formula and learns your actual priorities.',
            },
            {
              q: 'Can I push opportunities directly into our roadmap tool?',
              a: 'Yes. SignalPath has one-click push to Linear and Jira. Each opportunity becomes a ticket pre-filled with a summary, evidence quotes, and affected account count. More integrations — including GitHub Issues and Productboard — are planned.',
            },
            {
              q: 'Is there a free trial?',
              a: 'We are running a 90-day paid pilot with a small number of teams. The pilot includes full access, white-glove onboarding, and a monthly review call. Spots are limited — request access above and we will be in touch within one business day.',
            },
            {
              q: 'How is revenue at risk estimated?',
              a: "We estimate revenue by matching affected Zendesk organizations to their ARR via a CRM integration (HubSpot or Salesforce). If no CRM is connected we fall back to an AI estimate based on the organization's size signals in tickets. The source is always labelled so you know how confident the number is.",
            },
            {
              q: 'How do you handle data security?',
              a: 'All data is encrypted in transit (TLS) and at rest. OAuth tokens are encrypted with Fernet before storage. Row-level security in Postgres ensures no workspace can access another\'s data. We do not sell or share your data with third parties.',
            },
          ].map(({ q, a }) => (
            <details key={q} className='group py-5'>
              <summary className='flex items-center justify-between cursor-pointer list-none gap-4'>
                <span className='font-semibold text-gray-900 text-base'>{q}</span>
                <span className='flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 group-open:bg-blue-100 flex items-center justify-center transition-colors'>
                  <svg className='w-3 h-3 text-gray-500 group-open:text-blue-600 group-open:rotate-180 transition-transform' fill='none' viewBox='0 0 10 10' stroke='currentColor' strokeWidth='1.5'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M2 3.5l3 3 3-3' />
                  </svg>
                </span>
              </summary>
              <p className='mt-3 text-gray-500 text-sm leading-relaxed'>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-gray-100 py-8 text-center'>
        <p className='text-xs text-gray-400'>&copy; {new Date().getFullYear()} SignalPath. All rights reserved.</p>
      </footer>
    </div>
  )
}
