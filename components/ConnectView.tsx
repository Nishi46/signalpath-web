'use client'

interface ConnectViewProps {
  subdomain: string
  setSubdomain: (v: string) => void
  connecting: boolean
  onConnect: () => void
}

export function ConnectView({ subdomain, setSubdomain, connecting, onConnect }: ConnectViewProps) {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-8'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md w-full text-center'>
        <div className='w-12 h-12 bg-indigo-600 rounded-xl mx-auto mb-6 flex items-center justify-center'>
          <span className='text-white font-bold text-lg'>S</span>
        </div>
        <h1 className='text-2xl font-bold text-gray-900 mb-3'>Connect your Zendesk</h1>
        <p className='text-gray-500 text-sm mb-8'>
          SignalPath reads your support tickets and surfaces the product
          opportunities most likely to reduce churn. Setup takes 60 seconds.
        </p>
        <div className='flex rounded-lg border border-gray-300 overflow-hidden mb-2'>
          <input
            type='text'
            value={subdomain}
            onChange={e => setSubdomain(e.target.value)}
            placeholder='yourcompany'
            className='flex-1 px-4 py-3 text-sm outline-none'
            onKeyDown={e => e.key === 'Enter' && !connecting && subdomain.trim() && onConnect()}
          />
          <span className='px-3 py-3 bg-gray-50 text-gray-400 text-sm border-l'>.zendesk.com</span>
        </div>
        <p className='text-xs text-gray-400 mb-6'>Enter the subdomain from your Zendesk URL</p>
        <button
          onClick={onConnect}
          disabled={connecting || !subdomain.trim()}
          className='w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors'
        >
          {connecting ? 'Redirecting to Zendesk...' : 'Connect Zendesk'}
        </button>
      </div>
    </div>
  )
}
