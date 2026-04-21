'use client'
import { DashboardNav } from './DashboardNav'
import { Link2, CheckCircle2, DollarSign, MessageSquare, Bell, ExternalLink } from 'lucide-react'

interface ConnectViewProps {
  subdomain: string
  setSubdomain: (v: string) => void
  email: string
  setEmail: (v: string) => void
  apiToken: string
  setApiToken: (v: string) => void
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
}

const inputClass = 'w-full bg-gray-100 dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all'
const labelClass = 'block text-xs font-medium text-gray-500 dark:text-white/50 mb-1.5'

export function ConnectView({
  subdomain,
  setSubdomain,
  email,
  setEmail,
  apiToken,
  setApiToken,
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
}: ConnectViewProps) {
  const canConnect = subdomain.trim() && email.trim() && apiToken.trim() && !connecting

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

          <div className='space-y-3'>
            <div>
              <label className={labelClass}>Zendesk subdomain</label>
              <div className='flex rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all'>
                <input
                  type='text'
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder='yourcompany'
                  className='flex-1 px-4 py-3 text-sm outline-none bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-white/20'
                />
                <span className='px-4 py-3 bg-gray-50 dark:bg-white/[0.04] text-gray-400 dark:text-white/30 text-sm border-l border-gray-200 dark:border-white/[0.08] flex items-center select-none'>
                  .zendesk.com
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Zendesk admin email</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='you@yourcompany.com'
                className={inputClass}
              />
            </div>

            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className={labelClass.replace(' mb-1.5', '')}>API token</label>
                <a
                  href={`https://${subdomain || 'yourcompany'}.zendesk.com/admin/apps-integrations/apis/zendesk-api/settings`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors'
                >
                  Get token in Zendesk <ExternalLink className='w-3 h-3' />
                </a>
              </div>
              <input
                type='password'
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && canConnect && onConnect()}
                placeholder='Paste your API token'
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>

          <div className='mt-4 p-3 bg-blue-500/8 border border-blue-500/15 rounded-xl text-xs text-blue-300/80 leading-relaxed'>
            <strong className='text-blue-300'>How to get your API token:</strong> In Zendesk, go to{' '}
            <strong className='text-blue-300'>Admin Center → Apps and Integrations → APIs → Zendesk API</strong>,
            then click <strong className='text-blue-300'>Add API token</strong>, copy it, and paste it above.
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
