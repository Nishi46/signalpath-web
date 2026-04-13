import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Plug,
  User,
  Bell,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { SignOutButton } from '@/components/SignOutButton'
import { DashboardNav } from '@/components/DashboardNav'

const ML_THRESHOLD = 50

interface WorkspaceSettings {
  zendesk_connected: boolean
  linear_connected: boolean
  jira_connected: boolean
  hubspot_connected: boolean
  salesforce_connected: boolean
  ml_stats: {
    labeled_cluster_count: number
    ml_ready: boolean
    ml_model_version: number
    labels_needed: number
  }
}

async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/workspace-status`, {
      headers: { 'x-workspace-id': workspaceId },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Failed')
    return await res.json()
  } catch {
    return {
      zendesk_connected: false,
      linear_connected: false,
      jira_connected: false,
      hubspot_connected: false,
      salesforce_connected: false,
      ml_stats: { labeled_cluster_count: 0, ml_ready: false, ml_model_version: 0, labels_needed: ML_THRESHOLD },
    }
  }
}

function SectionHeader({ icon: Icon, title, description }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className='flex items-center gap-3 mb-5'>
      <div className='w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0'>
        <Icon className='w-4.5 h-4.5 text-gray-600' />
      </div>
      <div>
        <h2 className='text-sm font-semibold text-gray-900'>{title}</h2>
        <p className='text-xs text-gray-500'>{description}</p>
      </div>
    </div>
  )
}

function IntegrationRow({ label, description, connected, badge }: {
  label: string
  description: string
  connected: boolean
  badge?: string
}) {
  return (
    <div className='flex items-center justify-between py-3 border-b border-gray-50 last:border-0'>
      <div className='flex items-center gap-3'>
        <div className={`w-2 h-2 rounded-full shrink-0 ${connected ? 'bg-emerald-400' : 'bg-gray-200'}`} />
        <div>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium text-gray-800'>{label}</span>
            {badge && (
              <span className='text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide'>
                {badge}
              </span>
            )}
          </div>
          <p className='text-xs text-gray-400 mt-0.5'>{description}</p>
        </div>
      </div>
      <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
        connected
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-gray-100 text-gray-500'
      }`}>
        {connected ? 'Connected' : 'Not connected'}
      </span>
    </div>
  )
}

export default async function SettingsPage() {
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) redirect('/signin')

  const settings = await getWorkspaceSettings(workspaceId)
  const { ml_stats: ml } = settings

  const progressPct = Math.min(Math.round((ml.labeled_cluster_count / ML_THRESHOLD) * 100), 100)
  const isTraining = ml.ml_ready && ml.ml_model_version === 0
  const isActive   = ml.ml_model_version > 0

  const integrations = [
    {
      label: 'Zendesk',
      description: 'Import support tickets and detect product signals.',
      connected: settings.zendesk_connected,
    },
    {
      label: 'Linear',
      description: 'Push opportunities as tickets with one click.',
      connected: settings.linear_connected,
    },
    {
      label: 'Jira',
      description: 'Push opportunities to your Jira project.',
      connected: settings.jira_connected,
    },
    {
      label: 'HubSpot',
      description: 'Link CRM accounts to replace AI-estimated revenue with real ARR.',
      connected: settings.hubspot_connected,
      badge: 'pro',
    },
    {
      label: 'Salesforce',
      description: 'Pull AnnualRevenue from Account records for accurate scoring.',
      connected: settings.salesforce_connected,
      badge: 'pro',
    },
  ]

  const connectedCount = integrations.filter(i => i.connected).length

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav />
      <div className='max-w-2xl mx-auto px-6 py-10'>
        <h1 className='text-xl font-bold text-gray-900 mb-1'>Settings</h1>
        <p className='text-sm text-gray-500 mb-8'>Manage your workspace, integrations, and model.</p>

        <div className='space-y-4'>

          {/* ── Account ─────────────────────────────────────────────────────── */}
          <div className='bg-white border border-gray-200 rounded-2xl p-6'>
            <SectionHeader
              icon={User}
              title='Account'
              description='Your workspace identity and session.'
            />
            <div className='space-y-3'>
              <div className='flex items-center justify-between py-2.5 border-b border-gray-50'>
                <span className='text-sm text-gray-600'>Workspace ID</span>
                <span className='text-xs font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100'>
                  {workspaceId.slice(0, 8)}…
                </span>
              </div>
              <div className='flex items-center justify-between py-2.5'>
                <div>
                  <p className='text-sm text-gray-800 font-medium'>Sign out</p>
                  <p className='text-xs text-gray-400 mt-0.5'>End your current session on this device.</p>
                </div>
                <SignOutButton />
              </div>
            </div>
          </div>

          {/* ── Integrations ─────────────────────────────────────────────────── */}
          <div className='bg-white border border-gray-200 rounded-2xl p-6'>
            <div className='flex items-start justify-between mb-5'>
              <div className='flex items-center gap-3'>
                <div className='w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0'>
                  <Plug className='w-4 h-4 text-gray-600' />
                </div>
                <div>
                  <h2 className='text-sm font-semibold text-gray-900'>Integrations</h2>
                  <p className='text-xs text-gray-500'>
                    {connectedCount} of {integrations.length} connected
                  </p>
                </div>
              </div>
              <Link
                href='/connect'
                className='inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors'
              >
                Manage <ExternalLink className='w-3 h-3' />
              </Link>
            </div>
            <div>
              {integrations.map(i => (
                <IntegrationRow key={i.label} {...i} />
              ))}
            </div>
          </div>

          {/* ── Personalized Scoring Model ────────────────────────────────── */}
          <div className='bg-white border border-gray-200 rounded-2xl p-6'>
            <SectionHeader
              icon={Sparkles}
              title='Personalized Scoring Model'
              description='Learns which opportunities your team actually prioritises.'
            />

            {/* State A: collecting labels */}
            {!isTraining && !isActive && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between text-xs text-gray-500'>
                  <span>Ratings collected</span>
                  <span className='font-medium text-gray-700'>
                    {ml.labeled_cluster_count} / {ML_THRESHOLD}
                  </span>
                </div>
                <div className='w-full bg-gray-100 rounded-full h-2'>
                  <div
                    className='bg-blue-500 h-2 rounded-full transition-all duration-500'
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className='text-xs text-gray-500'>
                  {ml.labels_needed > 0
                    ? `Your scoring model improves at ${ML_THRESHOLD} ratings — ${ml.labels_needed} to go.`
                    : 'Almost there — model training will start automatically.'}
                </p>
                <div className='mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700'>
                  <span className='font-medium'>How to collect ratings: </span>
                  Go to{' '}
                  <Link href='/opportunities' className='underline underline-offset-2'>
                    Opportunities
                  </Link>{' '}
                  and Approve, Skip, or Dismiss each cluster. Every rating teaches your model your team&apos;s priorities.
                </div>
              </div>
            )}

            {/* State B: training in progress */}
            {isTraining && (
              <div className='flex items-center gap-3 py-2'>
                <Loader2 className='w-4 h-4 text-blue-500 animate-spin shrink-0' />
                <div>
                  <p className='text-sm font-medium text-gray-800'>Training your personalized model…</p>
                  <p className='text-xs text-gray-500 mt-0.5'>
                    This usually takes under a minute. Refresh to check progress.
                  </p>
                </div>
              </div>
            )}

            {/* State C: model active */}
            {isActive && (
              <div className='space-y-3'>
                <div className='flex items-center gap-2.5'>
                  <CheckCircle2 className='w-4 h-4 text-emerald-500 shrink-0' />
                  <p className='text-sm font-medium text-gray-800'>
                    Personalized scoring model active{' '}
                    <span className='text-xs font-normal text-gray-500'>(v{ml.ml_model_version})</span>
                  </p>
                </div>
                <p className='text-xs text-gray-500'>
                  Scoring now reflects your team&apos;s actual priorities. The model retrains
                  automatically every 10 new ratings.
                </p>
              </div>
            )}
          </div>

          {/* ── Notifications ─────────────────────────────────────────────── */}
          <div className='bg-white border border-gray-200 rounded-2xl p-6'>
            <SectionHeader
              icon={Bell}
              title='Notifications'
              description='Control when SignalPath emails your team.'
            />
            <div className='space-y-1'>
              {[
                { label: 'New clusters detected', desc: 'When a pipeline run surfaces new opportunity clusters.', defaultOn: true },
                { label: 'Model trained', desc: 'When your personalized scoring model finishes training.', defaultOn: true },
                { label: 'Weekly digest', desc: 'A summary of your top opportunities every Monday.', defaultOn: false },
                { label: 'CRM sync errors', desc: 'When HubSpot or Salesforce sync fails.', defaultOn: true },
              ].map(({ label, desc, defaultOn }) => (
                <div key={label} className='flex items-center justify-between py-3 border-b border-gray-50 last:border-0'>
                  <div>
                    <p className='text-sm font-medium text-gray-800'>{label}</p>
                    <p className='text-xs text-gray-400 mt-0.5'>{desc}</p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs text-gray-400'>Coming soon</span>
                    <div className={`w-9 h-5 rounded-full flex items-center px-0.5 ${defaultOn ? 'bg-blue-100' : 'bg-gray-100'} opacity-50`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${defaultOn ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Danger Zone ───────────────────────────────────────────────── */}
          <div className='bg-white border border-red-100 rounded-2xl p-6'>
            <SectionHeader
              icon={AlertTriangle}
              title='Danger zone'
              description='Irreversible actions — proceed carefully.'
            />
            <div className='space-y-4'>
              <div className='flex items-center justify-between py-3 border-b border-gray-50'>
                <div>
                  <p className='text-sm font-medium text-gray-800'>Export workspace data</p>
                  <p className='text-xs text-gray-400 mt-0.5'>Download all clusters, signals, and feedback as JSON.</p>
                </div>
                <button
                  disabled
                  className='text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed'
                >
                  Coming soon
                </button>
              </div>
              <div className='flex items-center justify-between py-3'>
                <div>
                  <p className='text-sm font-medium text-red-700'>Delete workspace</p>
                  <p className='text-xs text-gray-400 mt-0.5'>Permanently delete all data. This cannot be undone.</p>
                </div>
                <button
                  disabled
                  className='text-xs font-medium text-red-400 bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg cursor-not-allowed'
                >
                  Coming soon
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
