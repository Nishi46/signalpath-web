'use client'
import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { DashboardNav } from '@/components/DashboardNav'
import { GitHubIssuesToggle } from '@/components/GitHubIssuesToggle'
import {
  Github, CheckCircle2, Loader2, ChevronRight, GitBranch,
  RefreshCw, AlertTriangle, ExternalLink, Clock, X,
} from 'lucide-react'

interface Repo {
  full_name: string
  name: string
  private: boolean
  default_branch: string
  language: string | null
}

interface IndexedRepo {
  repo: string
  status: 'none' | 'pending' | 'indexing' | 'ready' | 'failed' | 'stale'
  last_indexed_at: string | null
  stats: { total_files: number; total_functions: number; total_routes: number } | null
  error: string | null
}

interface IssueConfig {
  github_issues_enabled: boolean
  github_issues_include_labels: string[]
  github_issues_exclude_labels: string[]
  github_issues_last_synced_at: string | null
}

type Step = 'install' | 'waiting' | 'manage' | 'pick' | 'indexing'

function relativeTime(isoString: string | null): string {
  if (!isoString) return 'never'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatusBadge({ status }: { status: IndexedRepo['status'] }) {
  if (status === 'ready') {
    return (
      <span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full'>
        <CheckCircle2 className='w-3 h-3' /> Ready
      </span>
    )
  }
  if (status === 'indexing' || status === 'pending') {
    return (
      <span className='inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full'>
        <Loader2 className='w-3 h-3 animate-spin' /> Indexing
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className='inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full'>
        <AlertTriangle className='w-3 h-3' /> Failed
      </span>
    )
  }
  if (status === 'stale') {
    return (
      <span className='inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full'>
        <Clock className='w-3 h-3' /> Stale
      </span>
    )
  }
  return null
}

function GitHubConnectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const installationId = searchParams.get('installation_id')

  const [step, setStep] = useState<Step>(installationId ? 'pick' : 'install')

  // Install flow state
  const [installing, setInstalling] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const [claimId, setClaimId] = useState('')
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  // Repo picker state
  const [repos, setRepos] = useState<Repo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [readyToLoadRepos, setReadyToLoadRepos] = useState(false)
  const [startingIndex, setStartingIndex] = useState(false)

  // Indexing step state
  const [indexingRepo, setIndexingRepo] = useState<string | null>(null)
  const [indexStatus, setIndexStatus] = useState<IndexedRepo['status']>('none')
  const [indexError, setIndexError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // Management view state
  const [accountLogin, setAccountLogin] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [indexedRepos, setIndexedRepos] = useState<IndexedRepo[]>([])
  const [issueConfig, setIssueConfig] = useState<IssueConfig | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [reindexingRepo, setReindexingRepo] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const returnToManage = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }, [])

  const loadManagementData = useCallback(async () => {
    try {
      const [infoRes, reposRes] = await Promise.all([
        fetch('/api/github-info'),
        fetch('/api/codebase-index'),
      ])
      if (infoRes.ok) {
        const info = await infoRes.json()
        setAccountLogin(info.account_login)
        setAccountType(info.account_type)
        setConnectedAt(info.connected_at)
        setIssueConfig({
          github_issues_enabled: info.github_issues_enabled,
          github_issues_include_labels: info.github_issues_include_labels,
          github_issues_exclude_labels: info.github_issues_exclude_labels,
          github_issues_last_synced_at: info.github_issues_last_synced_at,
        })
      }
      if (reposRes.ok) {
        const data = await reposRes.json()
        setIndexedRepos(data.repos ?? [])
      }
    } catch { /* non-fatal */ }
    setStep('manage')
  }, [])

  // When GitHub redirects back with installation_id in URL, auto-save then pick a repo
  useEffect(() => {
    if (!installationId) return
    const id = Number(installationId)
    if (!id || !Number.isInteger(id)) return
    returnToManage.current = true
    fetch('/api/github-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installation_id: id }),
    })
      .then(() => { setStep('pick'); setReadyToLoadRepos(true) })
      .catch(() => { setStep('pick'); setReadyToLoadRepos(true) })
  }, [installationId])

  // On mount (no installation_id), check if already connected
  useEffect(() => {
    if (installationId) return
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.github_connected) loadManagementData() })
      .catch(() => {})
  }, [installationId, loadManagementData])

  // Poll workspace-status while waiting for GitHub installation
  useEffect(() => {
    if (step !== 'waiting') { stopPolling(); return }
    pollRef.current = setInterval(() => {
      fetch('/api/workspace-status')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.github_connected) loadManagementData() })
        .catch(() => {})
    }, 4000)
    return stopPolling
  }, [step, loadManagementData, stopPolling])

  // Load repos for picker
  useEffect(() => {
    if (!readyToLoadRepos) return
    setLoadingRepos(true)
    setRepoError(null)
    fetch('/api/github-repos')
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.error ?? 'Failed')))
      .then(data => setRepos(data.repos ?? []))
      .catch(err => setRepoError(typeof err === 'string' ? err : 'Failed to load repositories'))
      .finally(() => setLoadingRepos(false))
  }, [readyToLoadRepos])

  // Poll indexing status
  const pollIndexStatus = useCallback(async () => {
    if (!indexingRepo) return
    try {
      const res = await fetch(`/api/codebase-index?repo=${encodeURIComponent(indexingRepo)}`)
      if (!res.ok) return
      const data = await res.json()
      setIndexStatus(data.status ?? 'none')
      if (data.error) setIndexError(data.error)
      if (data.status === 'ready') {
        // Indexing complete — go to manage view
        if (returnToManage.current) {
          returnToManage.current = false
          await loadManagementData()
        } else {
          returnToManage.current = false
          setStep('manage')
          loadManagementData()
        }
      }
    } catch { /* ignore */ }
  }, [indexingRepo, loadManagementData])

  useEffect(() => {
    if (step !== 'indexing') return
    pollIndexStatus()
    const interval = setInterval(pollIndexStatus, 5000)
    return () => clearInterval(interval)
  }, [step, pollIndexStatus])

  // Poll re-index status
  useEffect(() => {
    if (!reindexingRepo) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/codebase-index?repo=${encodeURIComponent(reindexingRepo)}`)
        if (!res.ok) return
        const data = await res.json()
        setIndexedRepos(prev => prev.map(r =>
          r.repo === reindexingRepo
            ? { ...r, status: data.status, last_indexed_at: data.last_indexed_at, stats: data.stats ?? r.stats, error: data.error ?? null }
            : r
        ))
        if (data.status === 'ready' || data.status === 'failed') {
          setReindexingRepo(null)
        }
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [reindexingRepo])

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
        if (data?.github_connected) { await loadManagementData(); return }
      }
    } catch { /* ignore */ }
    setChecking(false)
    setShowClaim(true)
  }

  async function handleClaim() {
    const match = claimId.trim().match(/(\d+)\s*$/)
    const id = match ? parseInt(match[1], 10) : NaN
    if (!id || isNaN(id)) { setClaimError('Enter a valid installation ID or paste the full GitHub settings URL.'); return }
    setClaiming(true)
    setClaimError(null)
    try {
      const res = await fetch('/api/github-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installation_id: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setClaimError(data.error ?? 'Failed to connect installation'); setClaiming(false); return }
      returnToManage.current = true
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
      setIndexingRepo(selectedRepo)
      setIndexStatus('pending')
      setIndexError(null)
      setStep('indexing')
    } catch {
      alert('Network error — please try again')
      setStartingIndex(false)
    }
  }

  async function handleCancelIndexing() {
    if (!indexingRepo) return
    setCancelling(true)
    try {
      await fetch('/api/codebase-index', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_full_name: indexingRepo }),
      })
    } catch { /* ignore — we navigate away regardless */ }
    setCancelling(false)
    setIndexingRepo(null)
    setIndexStatus('none')
    setIndexError(null)
    setStep('pick')
  }

  async function handleReindex(repoName: string) {
    setReindexingRepo(repoName)
    setIndexedRepos(prev => prev.map(r => r.repo === repoName ? { ...r, status: 'pending' } : r))
    try {
      await fetch('/api/codebase-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_full_name: repoName }),
      })
    } catch {
      setReindexingRepo(null)
      setIndexedRepos(prev => prev.map(r => r.repo === repoName ? { ...r, status: 'failed' } : r))
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/github-disconnect', { method: 'POST' })
    } catch { /* ignore — UI resets regardless */ }
    // Reset all state
    setAccountLogin(null)
    setAccountType(null)
    setConnectedAt(null)
    setIndexedRepos([])
    setIssueConfig(null)
    setShowDisconnectConfirm(false)
    setDisconnecting(false)
    setStep('install')
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-lg mx-auto px-6 py-10 space-y-4'>

        {/* ── Install step ──────────────────────────────────────────────── */}
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
              {['File paths and directory structure', 'Class and function names', 'Route paths and API endpoints', 'Model field names'].map(item => (
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
              {installing ? <><Loader2 className='w-4 h-4 animate-spin' /> Opening GitHub…</> : <><Github className='w-4 h-4' /> Install GitHub App</>}
            </button>
          </div>
        )}

        {/* ── Waiting step ──────────────────────────────────────────────── */}
        {step === 'waiting' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
            <div className='w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <Github className='w-7 h-7 text-blue-400' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>Complete the install on GitHub</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed text-center'>
              GitHub opened in a new tab. Approve the app there, then come back here.
            </p>
            <div className='flex items-center justify-center gap-2 mb-8 text-xs text-gray-400 dark:text-white/25'>
              <Loader2 className='w-3.5 h-3.5 animate-spin' /> Checking automatically…
            </div>
            <button
              onClick={handleCheckConnection}
              disabled={checking}
              className='w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
            >
              {checking ? <><Loader2 className='w-4 h-4 animate-spin' /> Checking…</> : <><CheckCircle2 className='w-4 h-4' /> I&apos;ve installed it — check connection</>}
            </button>

            {showClaim && (
              <div className='mt-6 pt-5 border-t border-gray-100 dark:border-white/[0.06] space-y-3'>
                <p className='text-xs text-gray-500 dark:text-white/40 text-center'>
                  Not connected yet. Paste the installation URL or ID from GitHub.
                </p>
                <p className='text-xs text-gray-400 dark:text-white/25 text-center'>github.com/settings/installations/{'<number>'}</p>
                <input
                  type='text'
                  value={claimId}
                  onChange={e => { setClaimId(e.target.value); setClaimError(null) }}
                  placeholder='https://github.com/settings/installations/...'
                  className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-sm text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 outline-none focus:border-blue-400 dark:focus:border-blue-500/50'
                />
                {claimError && <p className='text-xs text-red-500 dark:text-red-400'>{claimError}</p>}
                <button
                  onClick={handleClaim}
                  disabled={claiming || !claimId.trim()}
                  className='w-full bg-gray-800 hover:bg-gray-700 dark:bg-white/10 dark:hover:bg-white/15 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed'
                >
                  {claiming ? <><Loader2 className='w-4 h-4 animate-spin' /> Connecting…</> : <>Connect manually</>}
                </button>
              </div>
            )}
            <div className='mt-4 text-center'>
              <button onClick={() => setStep('install')} className='text-xs text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/40 transition-colors cursor-pointer'>
                ← Start over
              </button>
            </div>
          </div>
        )}

        {/* ── Management view ───────────────────────────────────────────── */}
        {step === 'manage' && (
          <>
            {/* Connection card */}
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-gray-900 dark:bg-white/10 rounded-xl flex items-center justify-center shrink-0'>
                    <Github className='w-5 h-5 text-white dark:text-white/80' />
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <span className='text-sm font-semibold text-gray-900 dark:text-white'>
                        {accountLogin ? `@${accountLogin}` : 'GitHub App'}
                      </span>
                      {accountType && (
                        <span className='text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-md'>
                          {accountType}
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-gray-400 dark:text-white/30 mt-0.5'>
                      {connectedAt ? `Connected ${relativeTime(connectedAt)}` : 'Connected'}
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full'>
                    <CheckCircle2 className='w-3 h-3' /> Connected
                  </span>
                </div>
              </div>

              {/* Disconnect */}
              <div className='mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]'>
                {!showDisconnectConfirm ? (
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className='text-xs text-gray-400 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer'
                  >
                    Disconnect GitHub →
                  </button>
                ) : (
                  <div className='space-y-2'>
                    <p className='text-xs text-gray-500 dark:text-white/40'>
                      This removes the connection from SignalPath. To fully uninstall, also visit{' '}
                      <a
                        href='https://github.com/settings/installations'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5'
                      >
                        github.com/settings/installations <ExternalLink className='w-3 h-3' />
                      </a>
                    </p>
                    <div className='flex gap-2'>
                      <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className='text-xs text-red-500 dark:text-red-400 hover:text-red-600 disabled:opacity-50 font-medium cursor-pointer disabled:cursor-not-allowed'
                      >
                        {disconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                      </button>
                      <span className='text-xs text-gray-300 dark:text-white/20'>·</span>
                      <button
                        onClick={() => setShowDisconnectConfirm(false)}
                        className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 cursor-pointer'
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Codebase index card */}
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6'>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-2'>
                  <GitBranch className='w-4 h-4 text-gray-400 dark:text-white/40' />
                  <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Codebase Index</h2>
                </div>
                <button
                  onClick={() => { setSelectedRepo(null); setStartingIndex(false); setReadyToLoadRepos(true); returnToManage.current = true; setStep('pick') }}
                  className='text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer'
                >
                  {indexedRepos.length > 0 ? 'Change repository →' : 'Pick a repository →'}
                </button>
              </div>

              {indexedRepos.length === 0 ? (
                <p className='text-sm text-gray-400 dark:text-white/30 text-center py-4'>
                  No repository indexed yet.
                </p>
              ) : (
                <div className='space-y-3'>
                  {indexedRepos.map(repo => (
                    <div key={repo.repo} className='rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-4'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <p className='text-sm font-medium text-gray-800 dark:text-white/85 truncate'>{repo.repo}</p>
                          {repo.last_indexed_at && (
                            <p className='text-xs text-gray-400 dark:text-white/30 mt-0.5'>
                              Last indexed {relativeTime(repo.last_indexed_at)}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={repo.status} />
                      </div>

                      {repo.stats && (
                        <div className='flex gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]'>
                          {[
                            { label: 'Files', value: repo.stats.total_files },
                            { label: 'Functions', value: repo.stats.total_functions },
                            { label: 'Routes', value: repo.stats.total_routes },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className='text-sm font-semibold text-gray-900 dark:text-white'>{value}</p>
                              <p className='text-xs text-gray-400 dark:text-white/30'>{label}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {repo.error && (
                        <p className='text-xs text-red-500 dark:text-red-400 mt-2'>{repo.error}</p>
                      )}

                      <button
                        onClick={() => handleReindex(repo.repo)}
                        disabled={reindexingRepo === repo.repo || repo.status === 'indexing' || repo.status === 'pending'}
                        className='mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed'
                      >
                        {reindexingRepo === repo.repo ? (
                          <><Loader2 className='w-3 h-3 animate-spin' /> Re-indexing…</>
                        ) : (
                          <><RefreshCw className='w-3 h-3' /> Re-index</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GitHub Issues card */}
            <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6'>
              <div className='flex items-center gap-2 mb-4'>
                <Github className='w-4 h-4 text-gray-400 dark:text-white/40' />
                <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>GitHub Issues</h2>
              </div>
              {issueConfig ? (
                <GitHubIssuesToggle
                  initialEnabled={issueConfig.github_issues_enabled}
                  initialIncludeLabels={issueConfig.github_issues_include_labels}
                  initialExcludeLabels={issueConfig.github_issues_exclude_labels}
                  initialLastSyncedAt={issueConfig.github_issues_last_synced_at}
                />
              ) : (
                <div className='flex items-center gap-2 text-xs text-gray-400 dark:text-white/30'>
                  <Loader2 className='w-3.5 h-3.5 animate-spin' /> Loading…
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Pick repo step ────────────────────────────────────────────── */}
        {step === 'pick' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
            <div className='w-14 h-14 bg-gray-900 dark:bg-white/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <GitBranch className='w-7 h-7 text-white dark:text-white/80' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>Select a repository</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed text-center'>
              Choose the codebase to index. SignalPath maps its structure to surface development-ready opportunities.
            </p>

            {loadingRepos && (
              <div className='flex items-center justify-center gap-2 py-8 text-gray-400 dark:text-white/30 text-sm'>
                <Loader2 className='w-4 h-4 animate-spin' /> Loading repositories…
              </div>
            )}
            {repoError && <div className='text-sm text-red-500 dark:text-red-400 text-center py-4'>{repoError}</div>}

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
                    {selectedRepo === repo.full_name && <CheckCircle2 className='w-4 h-4 text-blue-500 shrink-0' />}
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
              {startingIndex ? <><Loader2 className='w-4 h-4 animate-spin' /> Starting…</> : <>Index repository <ChevronRight className='w-4 h-4' /></>}
            </button>

            {returnToManage.current && (
              <button
                onClick={() => setStep('manage')}
                className='w-full mt-3 text-sm text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/50 transition-colors cursor-pointer'
              >
                ← Back to GitHub settings
              </button>
            )}
          </div>
        )}

        {/* ── Indexing step ─────────────────────────────────────────────── */}
        {step === 'indexing' && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8 text-center'>
            <div className='w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
              <Loader2 className='w-7 h-7 text-blue-400 animate-spin' />
            </div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Indexing codebase…</h1>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6 leading-relaxed'>
              SignalPath is parsing{' '}
              <span className='font-medium text-gray-700 dark:text-white/60'>{indexingRepo}</span>.
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
            <button
              onClick={handleCancelIndexing}
              disabled={cancelling}
              className='mt-6 inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/25 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-not-allowed'
            >
              {cancelling ? <><Loader2 className='w-3.5 h-3.5 animate-spin' /> Cancelling…</> : <><X className='w-3.5 h-3.5' /> Cancel indexing</>}
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
