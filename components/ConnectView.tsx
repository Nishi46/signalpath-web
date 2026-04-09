'use client'
import { DashboardNav } from './DashboardNav'
import { Link2 } from 'lucide-react'

interface ConnectViewProps {
  subdomain: string
  setSubdomain: (v: string) => void
  connecting: boolean
  onConnect: () => void
}

export function ConnectView({ subdomain, setSubdomain, connecting, onConnect }: ConnectViewProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='flex items-center justify-center p-8 mt-10'>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center'>
          <div className='w-14 h-14 bg-blue-50 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
            <Link2 className='w-6 h-6 text-blue-600' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 mb-3'>Connect your Zendesk</h1>
          <p className='text-gray-500 text-sm mb-8 leading-relaxed'>
            SignalPath reads your support tickets and surfaces the product
            opportunities most likely to reduce churn. Setup takes 60 seconds.
          </p>
          <div className='flex rounded-xl border border-gray-200 overflow-hidden mb-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all'>
            <input
              type='text'
              value={subdomain}
              onChange={e => setSubdomain(e.target.value)}
              placeholder='yourcompany'
              className='flex-1 px-4 py-3 text-sm outline-none bg-gray-50 focus:bg-white transition-colors'
              onKeyDown={e => e.key === 'Enter' && !connecting && subdomain.trim() && onConnect()}
            />
            <span className='px-4 py-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200 flex items-center'>.zendesk.com</span>
          </div>
          <p className='text-xs text-gray-400 mb-6'>Enter the subdomain from your Zendesk URL</p>
          <button
            onClick={onConnect}
            disabled={connecting || !subdomain.trim()}
            className='w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
          >
            {connecting ? 'Redirecting to Zendesk...' : 'Connect Zendesk'}
          </button>
        </div>
      </div>
    </div>
  )
}
