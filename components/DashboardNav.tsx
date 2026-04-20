'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'
import { BarChart3, Link2, Settings, LayoutDashboard } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()

  const links = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/opportunities', label: 'Opportunities', icon: BarChart3 },
    { href: '/connect', label: 'Integrations', icon: Link2 },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className='bg-[#111318] border-b border-white/[0.06]'>
      <div className='max-w-6xl mx-auto px-6 flex items-center justify-between h-14'>
        <div className='flex items-center gap-8'>
          <Link href='/opportunities' className='flex items-center gap-2'>
            <div className='w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center shadow-sm shadow-blue-600/30'>
              <span className='text-white font-bold text-xs'>S</span>
            </div>
            <span className='font-bold text-white'>SignalPath</span>
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
                      ? 'bg-blue-600/15 text-blue-400'
                      : 'text-white/45 hover:text-white/80 hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className='w-4 h-4' />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <UserMenu />
      </div>
    </nav>
  )
}
