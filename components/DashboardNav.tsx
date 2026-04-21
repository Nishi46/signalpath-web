'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'
import { useTheme } from './ThemeProvider'
import { BarChart3, Link2, Settings, LayoutDashboard, Sun, Moon } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/opportunities', label: 'Opportunities', icon: BarChart3 },
    { href: '/connect', label: 'Integrations', icon: Link2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className='bg-white dark:bg-[#111318] border-b border-gray-200 dark:border-white/[0.06]'>
      <div className='max-w-6xl mx-auto px-6 flex items-center justify-between h-14'>
        <div className='flex items-center gap-8'>
          <Link href='/dashboard' className='flex items-center gap-2'>
            <div className='w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shadow-blue-600/30'>
              <span className='text-white font-bold text-xs'>S</span>
            </div>
            <span className='font-bold text-gray-900 dark:text-white'>SignalPath</span>
          </Link>
          <div className='flex items-center gap-1'>
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-white/45 hover:text-gray-800 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={toggle}
            className='w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors'
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label='Toggle theme'
          >
            {theme === 'dark' ? <Sun className='w-4 h-4' /> : <Moon className='w-4 h-4' />}
          </button>
          <UserMenu />
        </div>
      </div>
    </nav>
  )
}
