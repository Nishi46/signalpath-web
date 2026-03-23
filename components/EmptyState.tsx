'use client'
import Link from 'next/link'
import { Inbox, Loader2 } from 'lucide-react'

export function EmptyState({ processing = false }: { processing?: boolean }) {
  if (processing) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4'>
          <Loader2 className='w-7 h-7 text-indigo-500 animate-spin' />
        </div>
        <h2 className='text-lg font-semibold text-gray-900 mb-2'>Tickets are still being processed</h2>
        <p className='text-gray-500 text-sm max-w-sm'>
          Your support tickets are being analyzed. Opportunities will appear here once processing is complete — check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center justify-center py-20 text-center'>
      <div className='w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4'>
        <Inbox className='w-7 h-7 text-gray-400' />
      </div>
      <h2 className='text-lg font-semibold text-gray-900 mb-2'>No opportunities yet</h2>
      <p className='text-gray-500 text-sm mb-6 max-w-sm'>
        Connect your Zendesk account and we&apos;ll surface the product opportunities
        most likely to reduce churn.
      </p>
      <Link
        href='/connect'
        className='bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors'
      >
        Connect Zendesk
      </Link>
    </div>
  )
}
