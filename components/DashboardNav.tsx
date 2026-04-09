'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserMenu } from './UserMenu'
import { BarChart3, Link2 } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()

  const links = [
    { href: '/opportunities', label: 'Opportunities', icon: BarChart3 },
    { href: '/connect', label: 'Integrations', icon: Link2 },
  ]

  return (
    <nav className='bg-white border-b border-gray-200'>
      <div className='max-w-6xl mx-auto px-6 flex items-center justify-between h-14'>
        <div className='flex items-center gap-8'>
          <Link href='/opportunities' className='flex items-center gap-2'>
            <div className='w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center'>
              <span className='text-white font-bold text-xs'>S</span>
            </div>
            <span className='font-bold text-gray-900'>SignalPath</span>
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
