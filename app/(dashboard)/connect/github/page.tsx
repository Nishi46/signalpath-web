'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
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
type Step = 'install' | 'waiting' | 'pick' | 'indexing' | 'done'

function GitHubConnectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const installationId = searchParams.get('installation_id')

  const [step, setStep] = useState<Step>(installationId ? 'pick' : 'install')
  const [installing, setInstalling] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [startingIndex, setStartingIndex] = useState(false)
  const [indexStatus, setIndexStatus] = useState<IndexStatus>('none')
  const [indexError, setIndexError] = useState<string | null>(null)
  const [indexStats, setIndexStats] = useState<Record<string, unknown> | null>(null)
  const [readyToLoadRepos, setReadyToLoadRepos] = useState(false)

  // Manual claim state (shown inside 'waiting' step)
  const [showClaim, setShowClaim] = useState(false)
  const [claimId, setClaimId] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const advanceToPicker = useCallback(() => {
    stopPolling()
    setStep('pick')
    setReadyToLoadRepos(true)
  }, [stopPolling])

  // When GitHub redirects back with installation_id in URL (Setup URL configured),
  // auto-save the installation then go straight to the repo picker.
  useEffect(() => {
    if (!installationId) return
    const id = Number(installationId)
    if (!id || !Number.isInteger(id)) return
    fetch('/api/github-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installation_id: id }),
    })
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error ?? 'Failed')))
      .then(() => advanceToPicker())
      .catch(() => advanceToPicker()) // even on error, show picker (installation may already be saved)
  }, [installationId, advanceToPicker])

  // On mount (no installation_id in URL), check if already connected from a prior session.
  useEffect(() => {
    if (installationId) return
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.github_connected) advanceToPicker()
      })
      .catch(() => {})
  }, [installationId, advanceToPicker])

  // While in the 'waiting' step, poll workspace-status every 4s.
  // In production (with webhook configured), the backend saves the installation
  // via the webhook event and this polling detects it automatically.
  useEffect(() => {
    if (step !== 'waiting') {
      stopPolling()
      return
    }
    pollRef.current = setInterval(() => {
      fetch('/api/workspace-status')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.github_connected) advanceToPicker() })
        .catch(() => {})
    }, 4000)
    return stopPolling
  }, [step, advanceToPicker, stopPolling])

  // Load repos once we have a confirmed installation
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
      // Open GitHub in a new tab so this tab can poll for the connection.
      window.open(redirect_url, '_blank', 'noopener,noreferrer')
      setInstalling(false)
      setStep('waiting')
    } catch {
      alert('Network error — please try again')
      setInstalling(false)
    }
  }

  async function handleCheckConnection() {
    setChecking(true)
    try {
      const res = await fetch('/api/workspace-status')
      if (res.ok) {
        const data = await res.json()
        if (data?.github_connected) {
          advanceToPicker()
          return
        }
      }
    } catch { /* ignore */ }
    // Not connected yet — show the manual claim form
    setChecking(false)
    setShowClaim(true)
  }

  async function handleClaim() {
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
      advanceToPicker()
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
                <><Loader2 className='w-4 h-4 animate-spin' /> Opening GitHub…</>
              ) : (
                <><Github className='w-4 h-4' /> Install GitHub App</>
              )}
            </button>
          </div>
        )}

        {/* Step: Waiting for GitHub installation to complete */}
        {step === 'waiting' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
            <div className='w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <Github className='w-7 h-7 text-blue-400' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>
              Complete the install on GitHub
            </h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed text-center'>
              GitHub opened in a new tab. Approve the app there, then come back here and click the button below.
            </p>

            <div className='flex items-center justify-center gap-2 mb-8 text-xs text-gray-400 dark:text-white/25'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' />
              Checking automatically every few seconds…
            </div>

            <button
              onClick={handleCheckConnection}
              disabled={checking}
              className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
            >
              {checking ? (
                <><Loader2 className='w-4 h-4 animate-spin' /> Checking…</>
              ) : (
                <><CheckCircle2 className='w-4 h-4' /> I&apos;ve installed it — check connection</>
              )}
            </button>

            {showClaim && (
              <div className='mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.06] space-y-3'>
                <p className='text-xs text-gray-500 dark:text-white/40 text-center'>
                  Not connected yet. Paste the URL or ID from GitHub&apos;s installation settings page.
                </p>
                <p className='text-xs text-gray-400 dark:text-white/25 text-center'>
                  github.com/settings/installations/{'<number>'}
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
                  className='w-full bg-gray-800 hover:bg-gray-700 dark:bg-white/10 dark:hover:bg-white/15 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
                >
                  {claiming ? (
                    <><Loader2 className='w-4 h-4 animate-spin' /> Connecting…</>
                  ) : (
                    <>Connect manually</>
                  )}
                </button>
              </div>
            )}

            <div className='mt-4 text-center'>
              <button
                onClick={() => setStep('install')}
                className='text-xs text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/40 transition-colors cursor-pointer'
              >
                ← Start over
              </button>
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
