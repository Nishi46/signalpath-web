import Link from 'next/link'
import { EmailCaptureForm } from '@/components/EmailCaptureForm'

export default function LandingPage() {
  return (
    <div className='min-h-screen bg-white'>
      {/* Nav */}
      <nav className='flex justify-between items-center px-8 py-5 border-b'>
        <span className='font-bold text-xl text-indigo-600'>SignalPath</span>
        <div className='flex gap-4'>
          <Link href='/signin' className='text-sm text-gray-600 hover:text-gray-900'>
            Sign in
          </Link>
          <Link
            href='/signup'
            className='text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700'
          >
            Get early access
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className='max-w-3xl mx-auto px-8 pt-20 pb-16 text-center'>
        <div className='inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6'>
          90-day pilots open — 10 spots remaining
        </div>
        <h1 className='text-5xl font-bold text-gray-900 leading-tight mb-6'>
          The only tool that tells you which problems will{' '}
          <span className='text-indigo-600'>cost you customers</span>
          <br />if you ignore them.
        </h1>
        <p className='text-xl text-gray-500 mb-10 max-w-xl mx-auto'>
          Connect your Zendesk. See ranked product opportunities in 48 hours.
          Push to Linear or Jira in one click.
        </p>
        <EmailCaptureForm />
        <p className='text-gray-400 text-sm mt-4'>
          Or{' '}
          <a
            href='https://calendly.com/YOUR_USERNAME/demo'
            className='text-indigo-600 hover:underline'
            target='_blank'
            rel='noopener noreferrer'
          >
            book a 15-minute demo directly
          </a>
        </p>
      </section>

      {/* How it works */}
      <section className='max-w-4xl mx-auto px-8 py-16'>
        <h2 className='text-2xl font-bold text-gray-900 text-center mb-12'>How it works</h2>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
          {[
            {
              step: '1',
              title: 'Connect Zendesk',
              desc: 'One-click OAuth. We import the last 90 days of tickets automatically.',
            },
            {
              step: '2',
              title: 'AI finds the patterns',
              desc: 'SignalPath clusters tickets by problem and scores each one by frequency, recency, and churn risk.',
            },
            {
              step: '3',
              title: 'Act on ranked decisions',
              desc: 'See opportunities ranked by urgency. Push to Linear or Jira in one click.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className='text-center'>
              <div className='w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-4'>
                {step}
              </div>
              <h3 className='font-semibold text-gray-900 mb-2'>{title}</h3>
              <p className='text-gray-500 text-sm'>{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
