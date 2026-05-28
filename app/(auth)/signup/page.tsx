'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const [companyName, setCompanyName] = useState('')
  const [techStack, setTechStack] = useState('')
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
        body: JSON.stringify({
          email,
          password,
          company_name: companyName,
          tech_stack: techStack.trim() || undefined,
        }),
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

  const inputClass = 'w-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-colors'
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5'

  return (
    <div
      className='auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden'
    >
      <div className='absolute inset-0 pointer-events-none' style={{ background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 70%)' }} />
      <div className='w-full max-w-sm'>
        {/* Logo */}
        <div className='flex items-center justify-center gap-2 mb-10'>
          <div className='w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30'>
            <span className='text-gray-900 dark:text-white font-bold'>S</span>
          </div>
          <span className='font-bold text-xl text-gray-900 dark:text-white'>SignalPath</span>
        </div>

        <div className='bg-white/80 dark:bg-[#1A1D24]/80 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-white/[0.07] p-8 shadow-xl shadow-black/[0.06] dark:shadow-black/30'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-1'>Create your account</h1>
          <p className='text-gray-500 dark:text-white/40 text-sm mb-8'>Start surfacing product opportunities from support tickets.</p>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label htmlFor='company' className={labelClass}>Company name</label>
              <input
                id='company'
                type='text'
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className={inputClass}
                placeholder='Acme Inc.'
              />
            </div>
            <div>
              <label htmlFor='tech_stack' className={labelClass}>
                Tech stack <span className='text-gray-400 dark:text-white/25 font-normal'>(optional)</span>
              </label>
              <input
                id='tech_stack'
                type='text'
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
                className={inputClass}
                placeholder='e.g. React, Next.js, Python, PostgreSQL'
              />
              <p className='text-xs text-gray-400 dark:text-white/25 mt-1'>Used to constrain AI-generated specs to your stack.</p>
            </div>
            <div>
              <label htmlFor='email' className={labelClass}>Email</label>
              <input
                id='email'
                type='email'
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                placeholder='you@company.com'
              />
            </div>
            <div>
              <label htmlFor='password' className={labelClass}>Password</label>
              <input
                id='password'
                type='password'
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                placeholder='At least 6 characters'
              />
            </div>

            {error && (
              <p className='text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5'>{error}</p>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-2.5 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className='text-gray-500 dark:text-white/35 text-sm text-center mt-6'>
            Already have an account?{' '}
            <Link href='/signin' className='text-blue-400 hover:text-blue-300 font-medium transition-colors'>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
