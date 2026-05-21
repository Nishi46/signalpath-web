'use client'
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { Github, CheckCircle2, Loader2, ChevronRight, GitBranch } from 'lucide-react'

interface Repo {
  full_name: string
  name: string
  private: boolean
  default_branch: string
  language: string | null
}

type IndexStatus = 'none' | 'pending' | 'indexing' | 'ready' | 'failed' | 'stale'

function GitHubConnectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const installationId = searchParams.get('installation_id')

  const [step, setStep] = useState<'install' | 'pick' | 'indexing' | 'done'>(
    installationId ? 'pick' : 'install'
  )
  const [installing, setInstalling] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [startingIndex, setStartingIndex] = useState(false)
  const [indexStatus, setIndexStatus] = useState<IndexStatus>('none')
  const [indexError, setIndexError] = useState<string | null>(null)
  const [indexStats, setIndexStats] = useState<Record<string, unknown> | null>(null)
  const [readyToLoadRepos, setReadyToLoadRepos] = useState(!!installationId)
  const [showClaim, setShowClaim] = useState(false)
  const [claimId, setClaimId] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // On mount, check if GitHub is already connected (app installed in a prior session).
  // When already connected, GitHub redirects back to its own settings page instead of
  // calling our callback, so installation_id never lands in the URL.
  useEffect(() => {
    if (installationId) return // URL param already handled above
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.github_connected) {
          setStep('pick')
          setReadyToLoadRepos(true)
        }
      })
      .catch(() => { /* ignore — stay on install step */ })
  }, [installationId])

  // Load repos once we have an installation (via URL param or existing connection)
  useEffect(() => {
    if (!readyToLoadRepos) return
    setLoadingRepos(true)
    setRepoError(null)
    fetch('/api/github-repos')
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error ?? 'Failed to load repos')))
      .then(data => setRepos(data.repos ?? []))
      .catch(err => setRepoError(typeof err === 'string' ? err : 'Failed to load repositories'))
      .finally(() => setLoadingRepos(false))
  }, [readyToLoadRepos])

  const pollIndexStatus = useCallback(async () => {
    if (!selectedRepo) return
    try {
      const res = await fetch(`/api/codebase-index?repo=${encodeURIComponent(selectedRepo)}`)
      if (!res.ok) return
      const data = await res.json()
      setIndexStatus(data.status ?? 'none')
      if (data.error) setIndexError(data.error)
      if (data.stats) setIndexStats(data.stats)
      if (data.status === 'ready') setStep('done')
    } catch { /* ignore network blips */ }
  }, [selectedRepo])

  // Poll while indexing
  useEffect(() => {
    if (step !== 'indexing') return
    pollIndexStatus()
    const interval = setInterval(pollIndexStatus, 5000)
    return () => clearInterval(interval)
  }, [step, pollIndexStatus])

  async function handleInstall() {
    setInstalling(true)
    try {
      const res = await fetch('/api/auth-github')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'GitHub connection failed')
        setInstalling(false)
        return
      }
      const { redirect_url } = await res.json()
      try {
        const url = new URL(redirect_url)
        if (url.hostname !== 'github.com') {
          alert('Unexpected redirect URL')
          setInstalling(false)
          return
        }
      } catch {
        alert('Invalid redirect URL')
        setInstalling(false)
        return
      }
      window.open(redirect_url, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Network error — please try again')
      setInstalling(false)
    }
  }

  async function handleClaim() {
    // Accept either the full URL (https://github.com/settings/installations/12345)
    // or just the numeric ID.
    const match = claimId.trim().match(/(\d+)\s*$/)
    const id = match ? parseInt(match[1], 10) : NaN
    if (!id || isNaN(id)) {
      setClaimError('Enter a valid installation ID or paste the full GitHub settings URL.')
      return
    }
    setClaiming(true)
    setClaimError(null)
    try {
      const res = await fetch('/api/github-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installation_id: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setClaimError(data.error ?? 'Failed to connect installation')
        setClaiming(false)
        return
      }
      setStep('pick')
      setReadyToLoadRepos(true)
    } catch {
      setClaimError('Network error — please try again')
      setClaiming(false)
    }
  }

  async function handleStartIndexing() {
    if (!selectedRepo) return
    setStartingIndex(true)
    try {
      const res = await fetch('/api/codebase-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_full_name: selectedRepo }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert(data.error ?? 'Failed to start indexing')
        setStartingIndex(false)
        return
      }
      setStep('indexing')
      setIndexStatus('pending')
    } catch {
      alert('Network error — please try again')
      setStartingIndex(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-lg mx-auto px-6 py-10'>

        {/* Step: Install */}
        {step === 'install' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
            <div className='w-14 h-14 bg-gray-900 dark:bg-white/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <Github className='w-7 h-7 text-white dark:text-white/80' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>Connect GitHub</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-8 leading-relaxed text-center'>
              Install the SignalPath GitHub App to let us read your repository
              structure. We only store file paths and symbol names — never source code.
            </p>

            <div className='space-y-3 mb-8'>
              {[
                'File paths and directory structure',
                'Class and function names',
                'Route paths and API endpoints',
                'Model field names',
              ].map(item => (
                <div key={item} className='flex items-center gap-3 text-sm text-gray-600 dark:text-white/60'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
                  {item}
                </div>
              ))}
            </div>

            <button
              onClick={handleInstall}
              disabled={installing}
              className='w-full bg-gray-900 hover:bg-gray-800 dark:bg-white/10 dark:hover:bg-white/15 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
            >
              {installing ? (
                <><Loader2 className='w-4 h-4 animate-spin' /> Redirecting to GitHub…</>
              ) : (
                <><Github className='w-4 h-4' /> Install GitHub App</>
              )}
            </button>

            {/* Recovery path for users whose app is already installed */}
            <div className='mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.06]'>
              {!showClaim ? (
                <button
                  onClick={() => setShowClaim(true)}
                  className='w-full text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors cursor-pointer'
                >
                  Already installed the app? Connect it manually →
                </button>
              ) : (
                <div className='space-y-3'>
                  <p className='text-xs text-gray-500 dark:text-white/40 text-center'>
                    Paste the URL GitHub sent you to, or just the numeric installation ID.
                    <br />
                    <span className='text-gray-400 dark:text-white/25'>e.g. github.com/settings/installations/133704229</span>
                  </p>
                  <input
                    type='text'
                    value={claimId}
                    onChange={e => { setClaimId(e.target.value); setClaimError(null) }}
                    placeholder='https://github.com/settings/installations/...'
                    className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-sm text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 outline-none focus:border-blue-400 dark:focus:border-blue-500/50'
                  />
                  {claimError && (
                    <p className='text-xs text-red-500 dark:text-red-400'>{claimError}</p>
                  )}
                  <button
                    onClick={handleClaim}
                    disabled={claiming || !claimId.trim()}
                    className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
                  >
                    {claiming ? (
                      <><Loader2 className='w-4 h-4 animate-spin' /> Connecting…</>
                    ) : (
                      <>Connect existing installation</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Pick repo */}
        {step === 'pick' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
            <div className='w-14 h-14 bg-gray-900 dark:bg-white/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <GitBranch className='w-7 h-7 text-white dark:text-white/80' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>Select a repository</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed text-center'>
              Choose the primary codebase to index. SignalPath will map its
              structure to surface development-ready opportunities.
            </p>

            {loadingRepos && (
              <div className='flex items-center justify-center gap-2 py-8 text-gray-400 dark:text-white/30 text-sm'>
                <Loader2 className='w-4 h-4 animate-spin' /> Loading repositories…
              </div>
            )}

            {repoError && (
              <div className='text-sm text-red-500 dark:text-red-400 text-center py-4'>{repoError}</div>
            )}

            {!loadingRepos && !repoError && repos.length > 0 && (
              <div className='space-y-2 mb-6 max-h-64 overflow-y-auto'>
                {repos.map(repo => (
                  <button
                    key={repo.full_name}
                    onClick={() => setSelectedRepo(repo.full_name)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedRepo === repo.full_name
                        ? 'border-blue-500/50 bg-blue-500/5 dark:bg-blue-500/10'
                        : 'border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03] hover:border-gray-200 dark:hover:border-white/[0.1]'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <Github className='w-4 h-4 text-gray-400 dark:text-white/40 shrink-0' />
                      <div>
                        <p className='text-sm font-medium text-gray-800 dark:text-white/85'>{repo.name}</p>
                        <p className='text-xs text-gray-400 dark:text-white/30'>
                          {repo.full_name} · {repo.language ?? 'Unknown'} · {repo.default_branch}
                        </p>
                      </div>
                    </div>
                    {selectedRepo === repo.full_name && (
                      <CheckCircle2 className='w-4 h-4 text-blue-500 shrink-0' />
                    )}
                  </button>
                ))}
              </div>
            )}

            {!loadingRepos && !repoError && repos.length === 0 && (
              <div className='text-sm text-gray-400 dark:text-white/30 text-center py-4'>
                No repositories found. Make sure the GitHub App has access to at least one repo.
              </div>
            )}

            <button
              onClick={handleStartIndexing}
              disabled={!selectedRepo || startingIndex}
              className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
            >
              {startingIndex ? (
                <><Loader2 className='w-4 h-4 animate-spin' /> Starting…</>
              ) : (
                <>Index repository <ChevronRight className='w-4 h-4' /></>
              )}
            </button>
          </div>
        )}

        {/* Step: Indexing */}
        {step === 'indexing' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 text-center'>
            <div className='w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <Loader2 className='w-7 h-7 text-blue-400 animate-spin' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Indexing codebase…</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed'>
              SignalPath is parsing{' '}
              <span className='font-medium text-gray-700 dark:text-white/60'>{selectedRepo}</span>.
              This usually takes 1–3 minutes.
            </p>

            <div className='flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-white/25'>
              <div className={`w-2 h-2 rounded-full ${indexStatus === 'indexing' ? 'bg-blue-400 animate-pulse' : 'bg-gray-300 dark:bg-white/20'}`} />
              {indexStatus === 'pending' ? 'Queued — worker starting…' : 'Parsing files and extracting structure…'}
            </div>

            {indexStatus === 'failed' && (
              <div className='mt-4 text-sm text-red-500 dark:text-red-400'>
                {indexError ?? 'Indexing failed. Please try again.'}
              </div>
            )}
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 text-center'>
            <div className='w-14 h-14 bg-emerald-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <CheckCircle2 className='w-7 h-7 text-emerald-400' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Codebase indexed</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-2 leading-relaxed'>
              <span className='font-medium text-gray-700 dark:text-white/60'>{selectedRepo}</span> is ready.
            </p>

            {indexStats && (
              <div className='grid grid-cols-3 gap-3 my-6'>
                {[
                  { label: 'Files', value: (indexStats as Record<string, number>).total_files ?? 0 },
                  { label: 'Functions', value: (indexStats as Record<string, number>).total_functions ?? 0 },
                  { label: 'Routes', value: (indexStats as Record<string, number>).total_routes ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className='bg-gray-50 dark:bg-white/[0.04] rounded-xl p-3'>
                    <p className='text-xl font-bold text-gray-900 dark:text-white'>{value}</p>
                    <p className='text-xs text-gray-400 dark:text-white/30'>{label}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => router.push('/dashboard')}
              className='w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer'
            >
              Go to dashboard
            </button>
            <button
              onClick={() => {
                setSelectedRepo(null)
                setIndexStatus('none')
                setIndexError(null)
                setIndexStats(null)
                setStartingIndex(false)
                setStep('pick')
              }}
              className='w-full mt-3 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors cursor-pointer'
            >
              Index another repo →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GitHubConnectPage() {
  return (
    <ErrorBoundary>
      <Suspense>
        <GitHubConnectContent />
      </Suspense>
    </ErrorBoundary>
  )
}
