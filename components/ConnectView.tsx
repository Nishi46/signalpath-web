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
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-lg mx-auto px-6 py-10 space-y-6'>

        {/* ── Zendesk (required) ──────────────────────────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8'>
          <div className='w-14 h-14 bg-blue-50 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
            <Link2 className='w-6 h-6 text-blue-600' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 mb-2 text-center'>Connect your Zendesk</h1>
          <p className='text-gray-500 text-sm mb-8 leading-relaxed text-center'>
            SignalPath reads your support tickets and surfaces the product
            opportunities most likely to reduce churn. Setup takes 60 seconds.
          </p>

          <div className='space-y-3'>
            {/* Subdomain */}
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1.5'>Zendesk subdomain</label>
              <div className='flex rounded-xl border border-gray-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all'>
                <input
                  type='text'
                  value={subdomain}
                  onChange={e => setSubdomain(e.target.value)}
                  placeholder='yourcompany'
                  className='flex-1 px-4 py-3 text-sm outline-none bg-gray-50 focus:bg-white transition-colors'
                />
                <span className='px-4 py-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200 flex items-center select-none'>
                  .zendesk.com
                </span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className='block text-xs font-medium text-gray-600 mb-1.5'>Zendesk admin email</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='you@yourcompany.com'
                className='w-full px-4 py-3 text-sm rounded-xl border border-gray-200 outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
              />
            </div>

            {/* API token */}
            <div>
              <div className='flex items-center justify-between mb-1.5'>
                <label className='text-xs font-medium text-gray-600'>API token</label>
                <a
                  href={`https://${subdomain || 'yourcompany'}.zendesk.com/admin/apps-integrations/apis/zendesk-api/settings`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1'
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
                className='w-full px-4 py-3 text-sm rounded-xl border border-gray-200 outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-mono'
              />
            </div>
          </div>

          {/* How to get a token */}
          <div className='mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-700 leading-relaxed'>
            <strong>How to get your API token:</strong> In Zendesk, go to{' '}
            <strong>Admin Center → Apps and Integrations → APIs → Zendesk API</strong>,
            then click <strong>Add API token</strong>, copy it, and paste it above.
          </div>

          <button
            onClick={onConnect}
            disabled={!canConnect}
            className='w-full mt-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
          >
            {connecting ? 'Verifying and connecting…' : 'Connect Zendesk'}
          </button>
        </div>

        {/* ── Support signals — Intercom (optional) ───────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center'>
              <MessageSquare className='w-5 h-5 text-blue-600' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-gray-900'>Support signals <span className='ml-1 text-xs font-normal text-gray-400'>(optional)</span></h2>
              <p className='text-xs text-gray-500'>Add more signal sources to improve opportunity detection.</p>
            </div>
          </div>

          <div className='flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center'>
                <span className='text-blue-600 font-bold text-xs'>IC</span>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-800'>Intercom</p>
                <p className='text-xs text-gray-400'>Imports user conversations as product signals</p>
              </div>
            </div>
            {intercomConnected ? (
              <div className='flex items-center gap-1.5 text-emerald-600 text-xs font-medium'>
                <CheckCircle2 className='w-4 h-4' />
                Connected
              </div>
            ) : (
              <button
                onClick={onConnectIntercom}
                disabled={connectingIntercom}
                className='text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors'
              >
                {connectingIntercom ? 'Redirecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* ── Notifications — Slack (optional) ────────────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center'>
              <Bell className='w-5 h-5 text-violet-600' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-gray-900'>Notifications <span className='ml-1 text-xs font-normal text-gray-400'>(optional)</span></h2>
              <p className='text-xs text-gray-500'>Get notified when high-priority opportunities surface.</p>
            </div>
          </div>

          <div className='flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50'>
            <div className='flex items-center gap-3'>
              <div className='w-8 h-8 rounded-lg bg-[#4A154B] flex items-center justify-center'>
                <span className='text-white font-bold text-xs'>SL</span>
              </div>
              <div>
                <p className='text-sm font-medium text-gray-800'>Slack</p>
                <p className='text-xs text-gray-400'>Weekly digest + instant alerts for scores ≥ 8.0</p>
              </div>
            </div>
            {slackConnected ? (
              <div className='flex items-center gap-1.5 text-emerald-600 text-xs font-medium'>
                <CheckCircle2 className='w-4 h-4' />
                Connected
              </div>
            ) : (
              <button
                onClick={onConnectSlack}
                disabled={connectingSlack}
                className='text-xs font-medium px-3 py-1.5 rounded-lg bg-[#4A154B] text-white hover:bg-[#611f69] disabled:opacity-50 transition-colors'
              >
                {connectingSlack ? 'Redirecting…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        {/* ── Revenue data — CRM (optional) ───────────────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
          <div className='flex items-center gap-3 mb-5'>
            <div className='w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center'>
              <DollarSign className='w-5 h-5 text-emerald-600' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-gray-900'>Revenue data <span className='ml-1 text-xs font-normal text-gray-400'>(optional)</span></h2>
              <p className='text-xs text-gray-500'>Connect your CRM to replace AI-estimated ARR with real deal values.</p>
            </div>
          </div>

          <div className='space-y-3'>
            {/* HubSpot */}
            <div className='flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center'>
                  <span className='text-orange-600 font-bold text-xs'>HS</span>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-800'>HubSpot</p>
                  <p className='text-xs text-gray-400'>Syncs company ARR from CRM deals</p>
                </div>
              </div>
              {hubspotConnected ? (
                <div className='flex items-center gap-1.5 text-emerald-600 text-xs font-medium'>
                  <CheckCircle2 className='w-4 h-4' />
                  Connected
                </div>
              ) : (
                <button
                  onClick={onConnectHubspot}
                  disabled={connectingCrm === 'hubspot'}
                  className='text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {connectingCrm === 'hubspot' ? 'Redirecting…' : 'Connect'}
                </button>
              )}
            </div>

            {/* Salesforce */}
            <div className='flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center'>
                  <span className='text-sky-600 font-bold text-xs'>SF</span>
                </div>
                <div>
                  <p className='text-sm font-medium text-gray-800'>Salesforce</p>
                  <p className='text-xs text-gray-400'>Syncs Account ARR via SOQL</p>
                </div>
              </div>
              {salesforceConnected ? (
                <div className='flex items-center gap-1.5 text-emerald-600 text-xs font-medium'>
                  <CheckCircle2 className='w-4 h-4' />
                  Connected
                </div>
              ) : (
                <button
                  onClick={onConnectSalesforce}
                  disabled={connectingCrm === 'salesforce'}
                  className='text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {connectingCrm === 'salesforce' ? 'Redirecting…' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
