'use client'
import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export function EmailCaptureForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className='bg-green-50 border border-green-200 rounded-2xl p-5 text-green-700 text-sm max-w-md mx-auto flex items-center gap-3'>
        <CheckCircle className='w-5 h-5 text-green-500 shrink-0' />
        <span>You&apos;re on the list. We&apos;ll be in touch within 24 hours.</span>
      </div>
    )
  }

  return (
    <div className='max-w-md mx-auto'>
      <form onSubmit={handleSubmit} className='flex gap-3'>
        <input
          type='email'
          required
          placeholder='your@email.com'
          value={email}
          onChange={e => setEmail(e.target.value)}
          className='flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
        />
        <button
          type='submit'
          disabled={loading}
          className='bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed'
        >
          {loading ? 'Saving...' : 'Request early access'}
        </button>
      </form>
      {error && <p className='text-red-500 text-xs mt-2 text-center'>{error}</p>}
    </div>
  )
}
