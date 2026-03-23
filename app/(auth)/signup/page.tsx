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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
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

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError('Account created but sign-in failed. Please go to sign in.')
        setLoading(false)
        return
      }

      window.location.href = '/connect'
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30 flex items-center justify-center p-4'>
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='flex items-center justify-center gap-2 mb-10'>
          <div className='w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center'>
            <span className='text-white font-bold'>S</span>
          </div>
          <span className='font-bold text-xl text-gray-900'>SignalPath</span>
        </div>

        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
          <h1 className='text-2xl font-bold text-gray-900 mb-1'>Create your account</h1>
          <p className='text-gray-500 text-sm mb-8'>Start surfacing product opportunities from support tickets.</p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='company' className='block text-sm font-medium text-gray-700 mb-1.5'>Company name</label>
              <input
                id='company'
                type='text'
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'
                placeholder='Acme Inc.'
              />
            </div>
            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1.5'>Email</label>
              <input
                id='email'
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'
                placeholder='you@company.com'
              />
            </div>
            <div>
              <label htmlFor='password' className='block text-sm font-medium text-gray-700 mb-1.5'>Password</label>
              <input
                id='password'
                type='password'
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors'
                placeholder='At least 6 characters'
              />
            </div>

            {error && (
              <p className='text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-2.5'>{error}</p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
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
    </div>
  )
}
