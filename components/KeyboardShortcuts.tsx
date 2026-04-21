'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const SHORTCUTS = [
  { keys: ['J', 'K'],     desc: 'Move between opportunities' },
  { keys: ['Enter'],      desc: 'Open focused opportunity' },
  { keys: ['A'],          desc: 'Approve focused opportunity' },
  { keys: ['S'],          desc: 'Skip focused opportunity' },
  { keys: ['D'],          desc: 'Dismiss focused opportunity' },
  { keys: ['/'],          desc: 'Focus search' },
  { keys: ['Esc'],        desc: 'Clear search / close modal' },
  { keys: ['?'],          desc: 'Show keyboard shortcuts' },
]

export function KeyboardShortcutsButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?') setOpen(prev => !prev)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className='fixed bottom-5 left-5 z-40 w-8 h-8 rounded-full bg-white dark:bg-[#1A1D24] border border-gray-200 dark:border-white/[0.08] shadow-sm flex items-center justify-center text-xs font-bold text-gray-500 dark:text-white/40 hover:text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:bg-white/[0.06] transition-colors'
        title='Keyboard shortcuts [?]'
        aria-label='Keyboard shortcuts'
      >
        ?
      </button>

      {open && (
        <div className='fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4' onClick={() => setOpen(false)}>
          <div className='bg-white dark:bg-[#1A1D24] border border-gray-100 dark:border-white/[0.07] rounded-2xl shadow-xl p-6 w-80' onClick={e => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-sm font-semibold text-gray-900 dark:text-white'>Keyboard shortcuts</h2>
              <button onClick={() => setOpen(false)} className='p-1 rounded-lg hover:bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 hover:text-gray-500 dark:text-white/60 transition-colors'>
                <X className='w-4 h-4' />
              </button>
            </div>
            <ul className='space-y-2.5'>
              {SHORTCUTS.map(({ keys, desc }) => (
                <li key={desc} className='flex items-center justify-between'>
                  <span className='text-xs text-gray-500 dark:text-white/50'>{desc}</span>
                  <div className='flex items-center gap-1'>
                    {keys.map(k => (
                      <kbd key={k} className='inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-gray-500 dark:text-white/60 bg-gray-100 dark:bg-white/[0.07] border border-white/[0.1] rounded'>
                        {k}
                      </kbd>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
