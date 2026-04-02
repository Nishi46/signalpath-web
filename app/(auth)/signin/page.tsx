'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    window.location.href = '/opportunities'
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='flex items-center justify-center gap-2 mb-10'>
          <div className='w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold'>S</span>
          </div>
          <span className='font-bold text-xl text-gray-900'>SignalPath</span>
        </div>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
          <h1 className='text-2xl font-bold text-gray-900 mb-1'>Welcome back</h1>
          <p className='text-gray-500 text-sm mb-8'>Sign in to your SignalPath account.</p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1.5'>Email</label>
              <input
                id='email'
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'
                placeholder='you@company.com'
              />
            </div>
            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-1.5'>Password</label>
              <input
                id='password'
                type='password'
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'
                placeholder='Your password'
              />
            </div>

            {error && (
              <p className='text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5'>{error}</p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className='text-gray-500 text-sm text-center mt-6'>
            Don&apos;t have an account?{' '}
            <Link href='/signup' className='text-emerald-600 hover:text-emerald-700 font-medium'>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
