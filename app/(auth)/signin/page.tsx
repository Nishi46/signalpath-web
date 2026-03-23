'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    // Check if workspace has Zendesk connected — if not, send to /connect
    try {
      const statusRes = await fetch('/api/pipeline-status')
      if (statusRes.ok) {
        const status = await statusRes.json()
        if (status.signals_total === 0) {
          router.push('/connect')
          return
        }
      }
    } catch { /* fall through to opportunities */ }

    router.push('/opportunities')
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-sm w-full'>
        <h1 className='text-2xl font-bold text-gray-900 mb-1'>Welcome back</h1>
        <p className='text-gray-500 text-sm mb-8'>Sign in to your SignalPath account.</p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>Email</label>
            <input
              id='email'
              type='email'
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              placeholder='you@company.com'
            />
          </div>
          <div>
            <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
            <input
              id='password'
              type='password'
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              placeholder='Your password'
            />
          </div>

          {error && (
            <p className='text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2'>{error}</p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors'
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className='text-gray-500 text-sm text-center mt-6'>
          Don&apos;t have an account?{' '}
          <Link href='/signup' className='text-indigo-600 hover:text-indigo-700 font-medium'>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
