'use client'
import { CheckCircle } from 'lucide-react'

export function ProcessingView({ count }: { count: number }) {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-8'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-12 max-w-md w-full text-center'>
        <div className='w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6'>
          <CheckCircle className='w-7 h-7 text-green-600' />
        </div>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Zendesk connected!</h1>
        <p className='text-gray-500 text-sm mb-8'>
          We are processing your support tickets. This usually takes 30–90 minutes.
          Your first ranked opportunities will appear automatically when ready.
        </p>
        <div className='bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8'>
          <p className='text-4xl font-bold text-indigo-700'>{count.toLocaleString()}</p>
          <p className='text-indigo-500 text-sm mt-2'>tickets processed so far</p>
        </div>
        <a href='/opportunities'
          className='block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl text-sm text-center transition-colors'>
          View Opportunities
        </a>
      </div>
    </div>
  )
}
