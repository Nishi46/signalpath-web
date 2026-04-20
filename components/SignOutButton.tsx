'use client'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function SignOutButton() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleSignOut}
      className='inline-flex items-center gap-2 text-sm font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-4 py-2 rounded-lg transition-colors cursor-pointer'
    >
      <LogOut className='w-4 h-4' />
      Sign out
    </button>
  )
}
