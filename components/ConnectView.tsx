'use client'
import { useState } from 'react'
import { DashboardNav } from './DashboardNav'
import { Link2, CheckCircle2, DollarSign, MessageSquare, Bell, Github, ChevronDown, ChevronUp } from 'lucide-react'

interface ConnectViewProps {
  subdomain: string
  setSubdomain: (v: string) => void
  connecting: boolean
  onConnect: () => void
  hubspotConnected?: boolean
  salesforceConnected?: boolean
  onConnectHubspot?: () => void
  onConnectSalesforce?: () => void
  connectingCrm?: 'hubspot' | 'salesforce' | null
  intercomConnected?: boolean
  onConnectIntercom?: () => void
  connectingIntercom?: boolean
  slackConnected?: boolean
  onConnectSlack?: () => void
  connectingSlack?: boolean
  githubConnected?: boolean
  onConnectGitHub?: () => void
}

const labelClass = 'block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5'

export function ConnectView({
  subdomain,
  setSubdomain,
  connecting,
  onConnect,
  hubspotConnected = false,
  salesforceConnected = false,
  onConnectHubspot,
  onConnectSalesforce,
  connectingCrm = null,
  intercomConnected = false,
  onConnectIntercom,
  connectingIntercom = false,
  slackConnected = false,
  onConnectSlack,
  connectingSlack = false,
  githubConnected = false,
  onConnectGitHub,
}: ConnectViewProps) {
  const canConnect = subdomain.trim() && !connecting
  const [treeOpen, setTreeOpen] = useState(false)
  const [fileTree, setFileTree] = useState('')
  const [treeSaving, setTreeSaving] = useState(false)
  const [treeSaved, setTreeSaved] = useState(false)

  async function handleSaveTree() {
    if (!fileTree.trim()) return
    setTreeSaving(true)
    try {
      await fetch('/api/file-tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_tree: fileTree }),
      })
      setTreeSaved(true)
    } catch { /* non-fatal */ } finally {
      setTreeSaving(false)
    }
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-lg mx-auto px-6 py-10 space-y-4'>

        {/* ── Zendesk (required) ──────────────────────────────────────────── */}
        <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-8'>
          <div className='w-14 h-14 bg-blue-500/10 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
            <Link2 className='w-6 h-6 text-blue-400' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center'>Connect your Zendesk</h1>
          <p className='text-gray-500 dark:text-white/40 text-sm mb-8 leading-relaxed text-center'>
            SignalPath reads your support tickets and surfaces the product
            opportunities most likely to reduce churn. Setup takes 60 seconds.
          </p>

          <div>
            <label className={labelClass}>Zendesk subdomain</label>
            <div className='flex rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all'>
              <input
                type='text'
                value={subdomain}
                onChange={e => setSubdomain(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canConnect && onConnect()}
                placeholder='yourcompany'
                className='flex-1 px-4 py-3 text-sm outline-none bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20'
              />
              <span className='px-4 py-3 bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-white/30 text-sm border-l border-gray-200 dark:border-white/[0.08] flex items-center select-none'>
                .zendesk.com
              </span>
            </div>
          </div>

          <button
            onClick={onConnect}
            disabled={!canConnect}
            className='w-full mt-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-gray-900 dark:text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
          >
            {connecting ? 'Verifying and connecting…' : 'Connect Zendesk'}
          </button>
        </div>

        {/* ── Support signals — Intercom (optional) ── */}
        <OptionalSection
          icon={<MessageSquare className='w-5 h-5 text-blue-400' />}
          iconBg='bg-blue-500/10'
          title='Support signals'
          description='Add more signal sources to improve opportunity detection.'
        >
          <IntegrationRow
            abbr='IC' color='#1F8DED'
            label='Intercom'
            desc='Imports user conversations as product signals'
            connected={intercomConnected}
            connecting={connectingIntercom}
            onConnect={onConnectIntercom}
          />
        </OptionalSection>

        {/* ── Notifications — Slack (optional) ── */}
        <OptionalSection
          icon={<Bell className='w-5 h-5 text-violet-400' />}
          iconBg='bg-violet-500/10'
          title='Notifications'
          description='Get notified when high-priority opportunities surface.'
        >
          <IntegrationRow
            abbr='SL' color='#4A154B'
            label='Slack'
            desc='Weekly digest + instant alerts for scores ≥ 8.0'
            connected={slackConnected}
            connecting={connectingSlack}
            onConnect={onConnectSlack}
            btnBg='#4A154B'
            btnHover='#611f69'
          />
        </OptionalSection>

        {/* ── Codebase — GitHub (optional) ── */}
        <OptionalSection
          icon={<Github className='w-5 h-5 text-gray-400 dark:text-white/50' />}
          iconBg='bg-gray-100 dark:bg-white/10'
          title='Codebase'
          description='Map your codebase so opportunities include real file paths.'
        >
          <IntegrationRow
            abbr='GH' color='#24292e'
            label='GitHub'
            desc='Indexes file paths, routes, and model names — never source code'
            connected={githubConnected}
            connecting={false}
            onConnect={onConnectGitHub}
          />

          {!githubConnected && (
            <div className='mt-3'>
              <button
                type='button'
                onClick={() => setTreeOpen(o => !o)}
                className='flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors'
              >
                {treeOpen ? <ChevronUp className='w-3.5 h-3.5' /> : <ChevronDown className='w-3.5 h-3.5' />}
                No GitHub? Paste your file tree instead
              </button>

              {treeOpen && (
                <div className='mt-3 space-y-2'>
                  <p className='text-xs text-gray-400 dark:text-white/30 leading-relaxed'>
                    Run <code className='font-mono bg-gray-100 dark:bg-white/[0.07] px-1 py-0.5 rounded text-gray-600 dark:text-white/60'>tree -L 4 --gitignore</code> in your repo root and paste the output below. SignalPath will use it to reference real file paths in specs and plans.
                  </p>
                  <textarea
                    value={fileTree}
                    onChange={e => { setFileTree(e.target.value); setTreeSaved(false) }}
                    placeholder={'src/\n  app/\n    page.tsx\n    layout.tsx\n  components/\n    Button.tsx\n  lib/\n    api.ts'}
                    rows={8}
                    className='w-full font-mono text-xs bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-gray-700 dark:text-white/70 placeholder-gray-300 dark:placeholder-white/15 outline-none focus:border-gray-400 dark:focus:border-white/20 resize-none transition-colors'
                  />
                  <div className='flex items-center gap-3'>
                    <button
                      type='button'
                      disabled={!fileTree.trim() || treeSaving}
                      onClick={handleSaveTree}
                      className='text-xs font-medium px-3 py-1.5 bg-gray-800 dark:bg-white/10 hover:bg-gray-700 dark:hover:bg-white/15 disabled:opacity-40 text-white rounded-lg transition-colors'
                    >
                      {treeSaving ? 'Saving…' : 'Save file tree'}
                    </button>
                    {treeSaved && (
                      <span className='flex items-center gap-1 text-xs text-emerald-400'>
                        <CheckCircle2 className='w-3.5 h-3.5' /> Saved
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </OptionalSection>

        {/* ── Revenue data — CRM (optional) ── */}
        <OptionalSection
          icon={<DollarSign className='w-5 h-5 text-emerald-400' />}
          iconBg='bg-emerald-500/10'
          title='Revenue data'
          description='Connect your CRM to replace AI-estimated ARR with real deal values.'
        >
          <div className='space-y-3'>
            <IntegrationRow
              abbr='HS' color='#FF7A59'
              label='HubSpot'
              desc='Syncs company ARR from CRM deals'
              connected={hubspotConnected}
              connecting={connectingCrm === 'hubspot'}
              onConnect={onConnectHubspot}
            />
            <IntegrationRow
              abbr='SF' color='#00A1E0'
              label='Salesforce'
              desc='Syncs Account ARR via SOQL'
              connected={salesforceConnected}
              connecting={connectingCrm === 'salesforce'}
              onConnect={onConnectSalesforce}
            />
          </div>
        </OptionalSection>
      </div>
    </div>
  )
}

function OptionalSection({
  icon, iconBg, title, description, children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] p-6'>
      <div className='flex items-center gap-3 mb-5'>
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>
            {title} <span className='ml-1 text-xs font-normal text-gray-400 dark:text-white/25'>(optional)</span>
          </h2>
          <p className='text-xs text-gray-500 dark:text-white/35'>{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function IntegrationRow({
  abbr, color, label, desc, connected, connecting, onConnect, btnBg, btnHover,
}: {
  abbr: string
  color: string
  label: string
  desc: string
  connected: boolean
  connecting: boolean
  onConnect?: () => void
  btnBg?: string
  btnHover?: string
}) {
  return (
    <div className='flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.03]'>
      <div className='flex items-center gap-3'>
        <div className='w-8 h-8 rounded-lg flex items-center justify-center shrink-0' style={{ backgroundColor: color }}>
          <span className='text-gray-900 dark:text-white font-bold text-xs'>{abbr}</span>
        </div>
        <div>
          <p className='text-sm font-medium text-gray-800 dark:text-white/85'>{label}</p>
          <p className='text-xs text-gray-500 dark:text-white/35'>{desc}</p>
        </div>
      </div>
      {connected ? (
        <div className='flex items-center gap-1.5 text-emerald-400 text-xs font-medium'>
          <CheckCircle2 className='w-4 h-4' />
          Connected
        </div>
      ) : (
        <button
          onClick={onConnect}
          disabled={connecting}
          className='text-xs font-medium px-3 py-1.5 rounded-lg text-gray-900 dark:text-white disabled:opacity-50 transition-colors'
          style={{ backgroundColor: btnBg ?? '#3B82F6' }}
        >
          {connecting ? 'Redirecting…' : 'Connect'}
        </button>
      )}
    </div>
  )
}
