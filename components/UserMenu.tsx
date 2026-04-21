'use client'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function UserMenu() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleSignOut}
      className='flex items-center gap-1.5 text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:bg-white/[0.06] transition-colors cursor-pointer'
    >
      <LogOut className='w-4 h-4' />
      Sign out
    </button>
  )
}
