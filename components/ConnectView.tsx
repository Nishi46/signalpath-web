'use client'
import { DashboardNav } from './DashboardNav'
import { Link2, CheckCircle2, DollarSign } from 'lucide-react'

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
}

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
}: ConnectViewProps) {
  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-lg mx-auto px-6 py-10 space-y-6'>

        {/* ── Zendesk (required) ──────────────────────────────────────────── */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center'>
          <div className='w-14 h-14 bg-blue-50 rounded-2xl mx-auto mb-6 flex items-center justify-center'>
            <Link2 className='w-6 h-6 text-blue-600' />
          </div>
          <h1 className='text-2xl font-bold text-gray-900 mb-3'>Connect your Zendesk</h1>
          <p className='text-gray-500 text-sm mb-8 leading-relaxed'>
            SignalPath reads your support tickets and surfaces the product
            opportunities most likely to reduce churn. Setup takes 60 seconds.
          </p>
          <div className='flex rounded-xl border border-gray-200 overflow-hidden mb-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all'>
            <input
              type='text'
              value={subdomain}
              onChange={e => setSubdomain(e.target.value)}
              placeholder='yourcompany'
              className='flex-1 px-4 py-3 text-sm outline-none bg-gray-50 focus:bg-white transition-colors'
              onKeyDown={e => e.key === 'Enter' && !connecting && subdomain.trim() && onConnect()}
            />
            <span className='px-4 py-3 bg-gray-50 text-gray-400 text-sm border-l border-gray-200 flex items-center'>
              .zendesk.com
            </span>
          </div>
          <p className='text-xs text-gray-400 mb-6'>Enter the subdomain from your Zendesk URL</p>
          <button
            onClick={onConnect}
            disabled={connecting || !subdomain.trim()}
            className='w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors cursor-pointer disabled:cursor-not-allowed'
          >
            {connecting ? 'Redirecting to Zendesk…' : 'Connect Zendesk'}
          </button>
        </div>

        {/* ── Revenue data — CRM (optional, PRO) ─────────────────────────── */}
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
