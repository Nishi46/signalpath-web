'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConnectView } from '@/components/ConnectView'
import { ProcessingView } from '@/components/ProcessingView'
import { useWorkspace } from '@/lib/hooks/use-workspace'

interface PipelineStatus {
  signals_total: number
  signals_embedded: number
  signals_clustered: number
  clusters: number
}

function ConnectContent() {
  const { workspaceId } = useWorkspace()
  const [subdomain, setSubdomain] = useState('')
  const [email, setEmail] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    signals_total: 0, signals_embedded: 0, signals_clustered: 0, clusters: 0,
  })
  const [stalledPolls, setStalledPolls] = useState(0)
  const [hubspotConnected, setHubspotConnected] = useState(false)
  const [salesforceConnected, setSalesforceConnected] = useState(false)
  const [connectingCrm, setConnectingCrm] = useState<'hubspot' | 'salesforce' | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const connected = searchParams.get('connected') === 'true'
  const linearConnected = searchParams.get('linear_connected') === 'true'
  const jiraConnected = searchParams.get('jira_connected') === 'true'
  const crmParam = searchParams.get('crm')

  // Fetch current CRM connection status on mount
  useEffect(() => {
    fetch('/api/workspace-status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setHubspotConnected(!!data.hubspot_connected)
        setSalesforceConnected(!!data.salesforce_connected)
      })
      .catch(() => { /* ignore */ })
  }, [])

  // Handle CRM OAuth return params (?crm=hubspot&connected=true)
  useEffect(() => {
    if (crmParam === 'hubspot') setHubspotConnected(true)
    if (crmParam === 'salesforce') setSalesforceConnected(true)
  }, [crmParam])

  // After Linear/Jira OAuth, redirect back to the page the user was on
  useEffect(() => {
    if (linearConnected || jiraConnected) {
      const returnTo = sessionStorage.getItem('oauth_return_to')
      if (returnTo) {
        sessionStorage.removeItem('oauth_return_to')
        router.replace(returnTo)
      }
    }
  }, [linearConnected, jiraConnected, router])

  async function handleConnectHubspot() {
    setConnectingCrm('hubspot')
    try {
      const res = await fetch('/api/auth-hubspot')
      if (!res.ok) {
        alert((await res.json().catch(() => ({}))).error ?? 'HubSpot connection failed')
        setConnectingCrm(null)
        return
      }
      const { redirect_url } = await res.json()
      try {
        const url = new URL(redirect_url)
        if (!url.hostname.endsWith('.hubspot.com')) {
          alert('Unexpected redirect URL')
          setConnectingCrm(null)
          return
        }
      } catch {
        alert('Invalid redirect URL')
        setConnectingCrm(null)
        return
      }
      window.location.href = redirect_url
    } catch {
      alert('Network error — please try again')
      setConnectingCrm(null)
    }
  }

  async function handleConnectSalesforce() {
    setConnectingCrm('salesforce')
    try {
      const res = await fetch('/api/auth-salesforce')
      if (!res.ok) {
        alert((await res.json().catch(() => ({}))).error ?? 'Salesforce connection failed')
        setConnectingCrm(null)
        return
      }
      const { redirect_url } = await res.json()
      try {
        const url = new URL(redirect_url)
        if (!url.hostname.endsWith('.salesforce.com') && !url.hostname.endsWith('.force.com')) {
          alert('Unexpected redirect URL')
          setConnectingCrm(null)
          return
        }
      } catch {
        alert('Invalid redirect URL')
        setConnectingCrm(null)
        return
      }
      window.location.href = redirect_url
    } catch {
      alert('Network error — please try again')
      setConnectingCrm(null)
    }
  }

  async function handleConnect() {
    if (!subdomain.trim() || !email.trim() || !apiToken.trim() || !workspaceId) return
    setConnecting(true)

    try {
      const res = await fetch('/api/auth-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: subdomain.trim(),
          email: email.trim(),
          api_token: apiToken.trim(),
        }),
      })
      if (!res.ok) {
        let message = 'Connection failed'
        try { message = (await res.json()).detail ?? (await res.json()).error ?? message } catch { /* non-JSON */ }
        alert(message)
        setConnecting(false)
        return
      }
      // Success — redirect to processing view
      window.location.href = '/connect?connected=true'
    } catch {
      alert('Network error — please try again')
      setConnecting(false)
    }
  }

  // Poll pipeline status every 10 seconds, stop when done
  useEffect(() => {
    if (!connected) return

    let stopped = false
    let stalled = 0

    async function poll() {
      try {
        const res = await fetch('/api/pipeline-status')
        if (res.ok) {
          const data = await res.json()
          setPipelineStatus(data)

          if (data.clusters > 0) {
            // Pipeline complete with results — stop polling
            stopped = true
            stalled = 0
          } else if (data.signals_total > 0 && data.signals_embedded >= data.signals_total) {
            // All embedded but no clusters yet — clustering may still be running
            stalled++
            setStalledPolls(stalled)
            // Stop polling after ~2 minutes (12 polls × 10s) — clustering is definitely done
            if (stalled >= 12) stopped = true
          }
        }
      } catch { /* ignore network blips */ }
    }

    poll()
    const interval = setInterval(() => {
      if (!stopped) poll()
    }, 10000)
    return () => clearInterval(interval)
  }, [connected])

  if (connected) return <ProcessingView status={pipelineStatus} stalledPolls={stalledPolls} />
  if (linearConnected || jiraConnected) {
    const service = linearConnected ? 'Linear' : 'Jira'
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center max-w-sm'>
          <h1 className='text-xl font-bold text-gray-900 mb-2'>{service} connected</h1>
          <p className='text-gray-500 text-sm'>You can now push opportunities to {service}.</p>
        </div>
      </div>
    )
  }
  return (
    <ConnectView
      subdomain={subdomain}
      setSubdomain={setSubdomain}
      email={email}
      setEmail={setEmail}
      apiToken={apiToken}
      setApiToken={setApiToken}
      connecting={connecting}
      onConnect={handleConnect}
      hubspotConnected={hubspotConnected}
      salesforceConnected={salesforceConnected}
      onConnectHubspot={handleConnectHubspot}
      onConnectSalesforce={handleConnectSalesforce}
      connectingCrm={connectingCrm}
    />
  )
}

export default function ConnectPage() {
  return (
    <ErrorBoundary>
      <Suspense>
        <ConnectContent />
      </Suspense>
    </ErrorBoundary>
  )
}
