'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Create user + workspace via backend
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, company_name: companyName }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.detail ?? 'Sign up failed. Please try again.')
        setLoading(false)
        return
      }

      // 2. Sign in to establish session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Account created but sign-in failed. Please go to sign in.')
        setLoading(false)
        return
      }

      // 3. Hard redirect ensures cookies are set for server-side routes
      window.location.href = '/connect'
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-sm w-full'>
        <h1 className='text-2xl font-bold text-gray-900 mb-1'>Create your account</h1>
        <p className='text-gray-500 text-sm mb-8'>Start surfacing product opportunities from support tickets.</p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label htmlFor='company' className='block text-sm font-medium text-gray-700 mb-1'>Company name</label>
            <input
              id='company'
              type='text'
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              placeholder='Acme Inc.'
            />
          </div>
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
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              placeholder='At least 6 characters'
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className='text-gray-500 text-sm text-center mt-6'>
          Already have an account?{' '}
          <Link href='/signin' className='text-indigo-600 hover:text-indigo-700 font-medium'>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
