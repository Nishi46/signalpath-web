'use client'
import Link from 'next/link'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export function EmptyState({ processing = false, insufficient = false }: { processing?: boolean; insufficient?: boolean }) {
  if (insufficient) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <div className='w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-5'>
          <AlertTriangle className='w-7 h-7 text-amber-500' />
        </div>
        <h2 className='text-lg font-semibold text-gray-900 mb-2'>Not enough ticket data</h2>
        <p className='text-gray-500 text-sm max-w-sm mb-6 leading-relaxed'>
          We need at least 3 support tickets from the last 90 days to identify patterns.
          Add more tickets to your Zendesk and reconnect.
        </p>
        <Link
          href='/connect'
          className='bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors'
        >
          Reconnect Zendesk
        </Link>
      </div>
    )
  }

  if (processing) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <div className='w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5'>
          <Loader2 className='w-7 h-7 text-blue-500 animate-spin' />
        </div>
        <h2 className='text-lg font-semibold text-gray-900 mb-2'>Tickets are still being processed</h2>
        <p className='text-gray-500 text-sm max-w-sm leading-relaxed'>
          Your support tickets are being analyzed. Opportunities will appear here once processing is complete — check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center justify-center py-24 text-center'>
      <div className='w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5'>
        <Inbox className='w-7 h-7 text-gray-400' />
      </div>
      <h2 className='text-lg font-semibold text-gray-900 mb-2'>No opportunities yet</h2>
      <p className='text-gray-500 text-sm mb-6 max-w-sm leading-relaxed'>
        Connect your Zendesk account and we&apos;ll surface the product opportunities
        most likely to reduce churn.
      </p>
      <Link
        href='/connect'
        className='bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors'
      >
        Connect Zendesk
      </Link>
    </div>
  )
}
