'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConnectView } from '@/components/ConnectView'
import { ProcessingView } from '@/components/ProcessingView'

function ConnectContent() {
  const [subdomain, setSubdomain] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [ticketCount, setTicketCount] = useState(0)
  const searchParams = useSearchParams()
  const connected = searchParams.get('connected') === 'true'
  const linearConnected = searchParams.get('linear_connected') === 'true'
  const jiraConnected = searchParams.get('jira_connected') === 'true'

  async function handleConnect() {
    if (!subdomain.trim()) return
    setConnecting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user?.user_metadata?.workspace_id ?? '11111111-1111-1111-1111-111111111111'

    try {
      const res = await fetch(
        `/api/auth-init?workspace_id=${encodeURIComponent(workspaceId)}&subdomain=${encodeURIComponent(subdomain.trim())}`
      )
      if (!res.ok) {
        const err = await res.json()
        alert(err.detail ?? 'Connection failed')
        setConnecting(false)
        return
      }
      const { redirect_url } = await res.json()
      window.location.href = redirect_url
    } catch {
      alert('Network error — please try again')
      setConnecting(false)
    }
  }

  // Poll signal count every 5 seconds via server-side route (bypasses RLS)
  useEffect(() => {
    if (!connected) return

    const workspaceId = '11111111-1111-1111-1111-111111111111' // TODO: from auth

    async function poll() {
      try {
        const res = await fetch(`/api/signal-count?workspace_id=${workspaceId}`)
        if (res.ok) {
          const { count } = await res.json()
          setTicketCount(count)
        }
      } catch { /* ignore network blips */ }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [connected])

  if (connected) return <ProcessingView count={ticketCount} />
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
    <Suspense>
      <ConnectContent />
    </Suspense>
  )
}
