'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const [connecting, setConnecting] = useState(false)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>({
    signals_total: 0, signals_embedded: 0, signals_clustered: 0, clusters: 0,
  })
  const searchParams = useSearchParams()
  const connected = searchParams.get('connected') === 'true'
  const linearConnected = searchParams.get('linear_connected') === 'true'
  const jiraConnected = searchParams.get('jira_connected') === 'true'

  async function handleConnect() {
    if (!subdomain.trim() || !workspaceId) return
    setConnecting(true)

    try {
      const res = await fetch(
        `/api/auth-init?subdomain=${encodeURIComponent(subdomain.trim())}`
      )
      if (!res.ok) {
        let message = 'Connection failed'
        try { message = (await res.json()).detail ?? message } catch { /* non-JSON response */ }
        alert(message)
        setConnecting(false)
        return
      }
      const { redirect_url } = await res.json()
      // Validate redirect URL points to expected OAuth providers
      try {
        const url = new URL(redirect_url)
        if (!url.hostname.endsWith('.zendesk.com')) {
          alert('Unexpected redirect URL')
          setConnecting(false)
          return
        }
      } catch {
        alert('Invalid redirect URL')
        setConnecting(false)
        return
      }
      window.location.href = redirect_url
    } catch {
      alert('Network error — please try again')
      setConnecting(false)
    }
  }

  // Poll pipeline status every 10 seconds
  useEffect(() => {
    if (!connected) return

    async function poll() {
      try {
        const res = await fetch('/api/pipeline-status')
        if (res.ok) {
          const data = await res.json()
          setPipelineStatus(data)
        }
      } catch { /* ignore network blips */ }
    }

    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [connected])

  if (connected) return <ProcessingView status={pipelineStatus} />
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
      connecting={connecting}
      onConnect={handleConnect}
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
