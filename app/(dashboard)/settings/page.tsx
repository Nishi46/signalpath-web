export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getWorkspaceId } from '@/lib/get-workspace-id'
import { createClient } from '@supabase/supabase-js'
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Brain,
  Zap,
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
  intercom_connected: boolean
  slack_connected: boolean
  ml_stats: {
    labeled_cluster_count: number
    ml_ready: boolean
    ml_model_version: number
    labels_needed: number
  }
}

async function getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  type WsRow = {
    zendesk_domain: string | null
    zendesk_token: string | null
    linear_token: string | null
    jira_token: string | null
    hubspot_token: string | null
    salesforce_token: string | null
    intercom_token: string | null
    slack_webhook_url: string | null
    ml_ready: boolean | null
    ml_model_version: number | null
  }

  const [wsResult, countResult] = await Promise.all([
    supabaseAdmin
      .from('workspaces')
      .select(
        'zendesk_domain, zendesk_token, linear_token, jira_token, ' +
        'hubspot_token, salesforce_token, intercom_token, slack_webhook_url, ' +
        'ml_ready, ml_model_version'
      )
      .eq('id', workspaceId)
      .single(),
    supabaseAdmin
      .from('clusters')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .not('pm_rating', 'is', null),
  ])

  const data = wsResult.data as WsRow | null
  const labeledCount = countResult.count

  return {
    zendesk_connected: !!(data?.zendesk_domain && data?.zendesk_token),
    linear_connected: !!data?.linear_token,
    jira_connected: !!data?.jira_token,
    hubspot_connected: !!data?.hubspot_token,
    salesforce_connected: !!data?.salesforce_token,
    intercom_connected: !!data?.intercom_token,
    slack_connected: !!data?.slack_webhook_url,
    ml_stats: {
      labeled_cluster_count: labeledCount ?? 0,
      ml_ready: data?.ml_ready ?? false,
      ml_model_version: data?.ml_model_version ?? 0,
      labels_needed: Math.max(0, ML_THRESHOLD - (labeledCount ?? 0)),
    },
  }
}

// Brand-colored integration icon badges
function IntegrationIcon({ abbr, color }: { abbr: string; color: string }) {
  return (
    <div
      className='w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-gray-900 dark:text-white text-xs font-bold'
      style={{ backgroundColor: color }}
    >
      {abbr}
    </div>
  )
}

function IntegrationCard({
  abbr,
  color,
  label,
  description,
  connected,
  badge,
}: {
  abbr: string
  color: string
  label: string
  description: string
  connected: boolean
  badge?: string
}) {
  return (
    <div className='flex items-center gap-3 py-3 border-b border-gray-100 dark:border-white/[0.04] last:border-0'>
      <IntegrationIcon abbr={abbr} color={color} />
      <div className='flex-1 min-w-0'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-gray-800 dark:text-white/85'>{label}</span>
          {badge && (
            <span className='text-[10px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-md uppercase tracking-wide'>
              {badge}
            </span>
          )}
        </div>
        <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5 truncate'>{description}</p>
      </div>
      {connected ? (
        <div className='flex items-center gap-1.5 text-emerald-400 text-xs font-medium shrink-0'>
          <CheckCircle2 className='w-3.5 h-3.5' />
          Connected
        </div>
      ) : (
        <Link
          href='/connect'
          className='flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-white/35 hover:text-blue-400 shrink-0 transition-colors group'
        >
          Connect
          <ArrowRight className='w-3 h-3 group-hover:translate-x-0.5 transition-transform' />
        </Link>
      )}
    </div>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-[10px] font-semibold text-gray-400 dark:text-white/25 uppercase tracking-wider mb-1 px-0.5'>
      {children}
    </p>
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

  const signalSources = [
    {
      abbr: 'ZD', color: '#78CC66',
      label: 'Zendesk', description: 'Import support tickets and detect product signals.',
      connected: settings.zendesk_connected,
    },
    {
      abbr: 'IC', color: '#1F8DED',
      label: 'Intercom', description: 'Import user conversations as additional signals.',
      connected: settings.intercom_connected,
    },
    {
      abbr: 'SL', color: '#4A154B',
      label: 'Slack', description: 'Weekly digest + instant alerts for high-scoring opportunities.',
      connected: settings.slack_connected,
    },
  ]

  const issueTrackers = [
    {
      abbr: 'LN', color: '#5E6AD2',
      label: 'Linear', description: 'Push opportunities as tickets with one click.',
      connected: settings.linear_connected,
    },
    {
      abbr: 'JR', color: '#0052CC',
      label: 'Jira', description: 'Push opportunities to your Jira project.',
      connected: settings.jira_connected,
    },
  ]

  const crmIntegrations = [
    {
      abbr: 'HS', color: '#FF7A59',
      label: 'HubSpot', description: 'Link CRM accounts to replace AI-estimated ARR.',
      connected: settings.hubspot_connected,
      badge: 'pro',
    },
    {
      abbr: 'SF', color: '#00A1E0',
      label: 'Salesforce', description: 'Pull AnnualRevenue from Account records.',
      connected: settings.salesforce_connected,
      badge: 'pro',
    },
  ]

  const allIntegrations = [...signalSources, ...issueTrackers, ...crmIntegrations]
  const connectedCount = allIntegrations.filter(i => i.connected).length

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />
      <div className='max-w-2xl mx-auto px-6 py-10'>

        {/* Page header */}
        <div className='mb-8'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Settings</h1>
          <p className='text-sm text-gray-500 dark:text-white/40 mt-1'>Manage your workspace, integrations, and scoring model.</p>
        </div>

        <div className='space-y-4'>

          {/* ── Integrations ──────────────────────────────────────────────── */}
          <div className='bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07] rounded-2xl overflow-hidden'>
            <div className='flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.05]'>
              <div>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Integrations</h2>
                <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>
                  {connectedCount} of {allIntegrations.length} connected
                </p>
              </div>
              <div className='flex items-center gap-1.5'>
                {Array.from({ length: allIntegrations.length }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < connectedCount ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-white/[0.12]'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className='px-6 py-4 space-y-5'>
              <div>
                <GroupLabel>Signal sources</GroupLabel>
                {signalSources.map(i => <IntegrationCard key={i.label} {...i} />)}
              </div>
              <div>
                <GroupLabel>Issue trackers</GroupLabel>
                {issueTrackers.map(i => <IntegrationCard key={i.label} {...i} />)}
              </div>
              <div>
                <GroupLabel>CRM</GroupLabel>
                {crmIntegrations.map(i => <IntegrationCard key={i.label} {...i} />)}
              </div>
            </div>
          </div>

          {/* ── Personalized Scoring Model ────────────────────────────────── */}
          <div className='bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07] rounded-2xl overflow-hidden'>
            <div className='px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-3'>
              <div className='w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0'>
                <Brain className='w-4 h-4 text-violet-400' />
              </div>
              <div>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Personalized Scoring</h2>
                <p className='text-xs text-gray-500 dark:text-white/35'>Learns your team&apos;s priorities from ratings.</p>
              </div>
              {isActive && (
                <span className='ml-auto flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg'>
                  <Zap className='w-3 h-3' />
                  Active · v{ml.ml_model_version}
                </span>
              )}
            </div>

            <div className='px-6 py-5'>
              {!isTraining && !isActive && (
                <div className='space-y-4'>
                  <div className='flex items-end justify-between'>
                    <div>
                      <p className='text-2xl font-bold text-gray-900 dark:text-white tabular-nums'>
                        {ml.labeled_cluster_count}
                        <span className='text-sm font-normal text-gray-400 dark:text-white/30 ml-1'>/ {ML_THRESHOLD}</span>
                      </p>
                      <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>ratings collected</p>
                    </div>
                    <p className='text-xs text-gray-400 dark:text-white/30 mb-1'>
                      {ml.labels_needed > 0 ? `${ml.labels_needed} to go` : 'Training soon'}
                    </p>
                  </div>
                  <div className='w-full bg-gray-100 dark:bg-white/[0.07] rounded-full h-2'>
                    <div
                      className='bg-violet-500 h-2 rounded-full transition-all duration-700'
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className='flex items-start gap-2.5 p-3.5 bg-violet-500/8 border border-violet-500/15 rounded-xl'>
                    <Sparkles className='w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0' />
                    <p className='text-xs text-violet-300/80 leading-relaxed'>
                      Rate opportunities as <strong className='text-violet-300'>Approve</strong>, <strong className='text-violet-300'>Skip</strong>, or <strong className='text-violet-300'>Dismiss</strong> to teach the model your team&apos;s priorities.{' '}
                      <Link href='/opportunities' className='font-semibold underline underline-offset-2 text-violet-300'>
                        Go to Opportunities →
                      </Link>
                    </p>
                  </div>
                </div>
              )}

              {isTraining && (
                <div className='flex items-center gap-3.5 py-1'>
                  <div className='w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0'>
                    <Loader2 className='w-4 h-4 text-blue-400 animate-spin' />
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-gray-900 dark:text-white'>Training in progress</p>
                    <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>Usually under a minute. Refresh to check.</p>
                  </div>
                </div>
              )}

              {isActive && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2.5'>
                    <CheckCircle2 className='w-4 h-4 text-emerald-400 shrink-0' />
                    <p className='text-sm font-medium text-gray-800 dark:text-white/85'>Model is scoring your opportunities</p>
                  </div>
                  <p className='text-xs text-gray-500 dark:text-white/40 leading-relaxed'>
                    Scores reflect your team&apos;s actual priorities. The model retrains automatically
                    every 10 new ratings to stay current.
                  </p>
                  <div className='flex items-center justify-between py-2.5 px-3.5 bg-gray-50 dark:bg-white/[0.04] rounded-xl text-xs text-gray-500 dark:text-white/40'>
                    <span>Ratings collected</span>
                    <span className='font-semibold text-gray-500 dark:text-white/65 tabular-nums'>{ml.labeled_cluster_count}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Account ─────────────────────────────────────────────────────── */}
          <div className='bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07] rounded-2xl overflow-hidden'>
            <div className='px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.05]'>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Account</h2>
              <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>Your workspace identity and session.</p>
            </div>
            <div className='px-6 py-2'>
              <div className='flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/[0.04]'>
                <span className='text-sm text-gray-500 dark:text-white/55'>Workspace ID</span>
                <span className='text-xs font-mono text-gray-500 dark:text-white/35 bg-gray-100 dark:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/[0.07] select-all'>
                  {workspaceId.slice(0, 8)}…
                </span>
              </div>
              <div className='flex items-center justify-between py-3.5'>
                <div className='flex items-center gap-2.5'>
                  <LogOut className='w-4 h-4 text-gray-400 dark:text-white/30' />
                  <div>
                    <p className='text-sm font-medium text-gray-800 dark:text-white/85'>Sign out</p>
                    <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>End your current session.</p>
                  </div>
                </div>
                <SignOutButton />
              </div>
            </div>
          </div>

          {/* ── Danger Zone ───────────────────────────────────────────────── */}
          <div className='bg-white dark:bg-[#1A1D24] border border-red-500/20 rounded-2xl overflow-hidden'>
            <div className='px-6 pt-5 pb-4 border-b border-red-500/10 flex items-center gap-2.5'>
              <AlertTriangle className='w-4 h-4 text-red-400 shrink-0' />
              <div>
                <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Danger zone</h2>
                <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>Irreversible actions — proceed carefully.</p>
              </div>
            </div>
            <div className='px-6 py-2'>
              <div className='flex items-center justify-between py-3.5 border-b border-gray-100 dark:border-white/[0.04]'>
                <div>
                  <p className='text-sm font-medium text-gray-800 dark:text-white/85'>Export workspace data</p>
                  <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>Download clusters, signals, and feedback as JSON.</p>
                </div>
                <button
                  disabled
                  className='text-xs font-medium text-gray-400 dark:text-white/25 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] px-3 py-1.5 rounded-lg cursor-not-allowed'
                >
                  Coming soon
                </button>
              </div>
              <div className='flex items-center justify-between py-3.5'>
                <div>
                  <p className='text-sm font-medium text-red-400'>Delete workspace</p>
                  <p className='text-xs text-gray-500 dark:text-white/35 mt-0.5'>Permanently delete all data. This cannot be undone.</p>
                </div>
                <button
                  disabled
                  className='text-xs font-medium text-red-400/50 bg-red-500/8 border border-red-500/15 px-3 py-1.5 rounded-lg cursor-not-allowed'
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
