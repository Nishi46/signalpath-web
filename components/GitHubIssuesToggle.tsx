'use client'
import { useState, useEffect } from 'react'
import { Github, Loader2, RefreshCw } from 'lucide-react'

interface Props {
  initialEnabled: boolean
  initialIncludeLabels: string[]
  initialExcludeLabels: string[]
  initialLastSyncedAt: string | null
}

export function GitHubIssuesToggle({
  initialEnabled,
  initialIncludeLabels,
  initialExcludeLabels,
  initialLastSyncedAt,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [includeLabels, setIncludeLabels] = useState(initialIncludeLabels.join(', '))
  const [excludeLabels, setExcludeLabels] = useState(initialExcludeLabels.join(', '))
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Auto-save when toggle changes
  useEffect(() => {
    void save()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  async function save() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/github-issue-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          include_labels: includeLabels.split(',').map(l => l.trim()).filter(Boolean),
          exclude_labels: excludeLabels.split(',').map(l => l.trim()).filter(Boolean),
        }),
      })
      if (res.ok) setSaveMsg('Saved')
      else setSaveMsg('Save failed')
    } catch {
      setSaveMsg('Save failed')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2000)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/github-issue-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, include_labels: includeLabels.split(',').map(l => l.trim()).filter(Boolean), exclude_labels: excludeLabels.split(',').map(l => l.trim()).filter(Boolean) }) })
      const res = await fetch('/api/integrations/github/sync-issues', { method: 'POST' })
      if (res.ok) setSaveMsg('Sync queued')
      else setSaveMsg('Sync failed')
    } catch {
      setSaveMsg('Sync failed')
    } finally {
      setSyncing(false)
      setTimeout(() => setSaveMsg(null), 3000)
    }
  }

  return (
    <div className='space-y-3'>
      {/* Toggle row */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Github className='w-4 h-4 text-gray-400 dark:text-white/40' />
          <span className='text-sm font-medium text-gray-800 dark:text-white/85'>Ingest open issues as signals</span>
        </div>
        <button
          type='button'
          role='switch'
          aria-checked={enabled}
          onClick={() => setEnabled(e => !e)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${enabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-white/[0.12]'}`}
        >
          <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
      </div>

      {/* Label config — only show when enabled */}
      {enabled && (
        <div className='space-y-2 pl-6'>
          <div>
            <label className='block text-xs text-gray-500 dark:text-white/35 mb-1'>Include labels (comma-separated)</label>
            <input
              type='text'
              value={includeLabels}
              onChange={e => setIncludeLabels(e.target.value)}
              onBlur={() => void save()}
              className='w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 outline-none focus:border-blue-400 dark:focus:border-blue-500/50'
              placeholder='bug, enhancement, feature-request'
            />
          </div>
          <div>
            <label className='block text-xs text-gray-500 dark:text-white/35 mb-1'>Exclude labels (comma-separated)</label>
            <input
              type='text'
              value={excludeLabels}
              onChange={e => setExcludeLabels(e.target.value)}
              onBlur={() => void save()}
              className='w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] text-gray-800 dark:text-white/80 placeholder-gray-300 dark:placeholder-white/20 outline-none focus:border-blue-400 dark:focus:border-blue-500/50'
              placeholder='wontfix, duplicate, invalid'
            />
          </div>

          <div className='flex items-center justify-between pt-1'>
            <span className='text-xs text-gray-400 dark:text-white/25'>
              {initialLastSyncedAt
                ? `Last synced ${new Date(initialLastSyncedAt).toLocaleString()}`
                : 'Never synced'}
            </span>
            <button
              type='button'
              onClick={() => void handleSync()}
              disabled={syncing}
              className='inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed'
            >
              {syncing ? <Loader2 className='w-3 h-3 animate-spin' /> : <RefreshCw className='w-3 h-3' />}
              Sync now
            </button>
          </div>
        </div>
      )}

      {/* Status feedback */}
      <div className='flex items-center gap-2 pl-6 h-4'>
        {saving && <span className='text-xs text-gray-400 dark:text-white/30'>Saving…</span>}
        {saveMsg && !saving && <span className='text-xs text-emerald-400'>{saveMsg}</span>}
      </div>
    </div>
  )
}
