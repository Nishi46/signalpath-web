'use client'
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function UserMenu() {
  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/signin'
  }

  return (
    <button
      onClick={handleSignOut}
      className='flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors'
    >
      <LogOut className='w-4 h-4' />
      Sign out
    </button>
  )
}
