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
    <div className='min-h-screen bg-[#111318] flex items-center justify-center p-4'
      style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    >
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='flex items-center justify-center gap-2 mb-10'>
          <div className='w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30'>
            <span className='text-white font-bold'>S</span>
          </div>
          <span className='font-bold text-xl text-white'>SignalPath</span>
        </div>

        <div className='bg-[#1A1D24] rounded-2xl border border-white/[0.07] p-8'>
          <h1 className='text-2xl font-bold text-white mb-1'>Welcome back</h1>
          <p className='text-white/40 text-sm mb-8'>Sign in to your SignalPath account.</p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='email' className='block text-xs font-medium text-white/50 mb-1.5'>Email</label>
              <input
                id='email'
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className='w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors'
                placeholder='you@company.com'
              />
            </div>
            <div>
              <label htmlFor='password' className='block text-xs font-medium text-white/50 mb-1.5'>Password</label>
              <input
                id='password'
                type='password'
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className='w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors'
                placeholder='Your password'
              />
            </div>

            {error && (
              <p className='text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5'>{error}</p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className='text-white/35 text-sm text-center mt-6'>
            Don&apos;t have an account?{' '}
            <Link href='/signup' className='text-blue-400 hover:text-blue-300 font-medium transition-colors'>Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
