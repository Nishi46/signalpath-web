'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setWorkspaceId(session?.user?.app_metadata?.workspace_id ?? null)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setWorkspaceId(session?.user?.app_metadata?.workspace_id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { workspaceId, loading }
}
