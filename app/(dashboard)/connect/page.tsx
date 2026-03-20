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

  async function handleConnect() {
    if (!subdomain.trim()) return
    setConnecting(true)

    const { data: { user } } = await supabase.auth.getUser()
    const workspaceId = user?.user_metadata?.workspace_id ?? 'test-workspace'

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

  // Subscribe to new signals being inserted so counter updates live
  useEffect(() => {
    if (!connected) return
    const channel = supabase.channel('ticket-progress')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signals' },
        () => setTicketCount(n => n + 1)
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [connected])

  if (connected) return <ProcessingView count={ticketCount} />
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
