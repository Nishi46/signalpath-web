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
      className='inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 px-4 py-2 rounded-lg transition-colors cursor-pointer'
    >
      <LogOut className='w-4 h-4' />
      Sign out
    </button>
  )
}
