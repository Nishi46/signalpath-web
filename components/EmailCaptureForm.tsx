'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function EmailCaptureForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase.from('early_access').insert({ email })
      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate email — treat as success
          setSubmitted(true)
        } else {
          setError('Something went wrong. Please try again.')
        }
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className='bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm max-w-md mx-auto'>
        You are on the list. We will be in touch within 24 hours.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className='flex gap-3 max-w-md mx-auto'>
      <input
        type='email'
        required
        placeholder='your@email.com'
        value={email}
        onChange={e => setEmail(e.target.value)}
        className='flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm'
      />
      <button
        type='submit'
        disabled={loading}
        className='bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50'
      >
        {loading ? 'Saving...' : 'Request early access'}
      </button>
      {error && <p className='text-red-600 text-xs mt-1'>{error}</p>}
    </form>
  )
}
