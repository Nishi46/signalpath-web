'use client'
import { useState, useEffect, useRef } from 'react'
import { Bookmark, ChevronDown, Plus, Trash2, X } from 'lucide-react'

export interface SavedViewFilters {
  confidenceFilter: 'all' | 'High' | 'Medium' | 'Low'
  minScore: number
  churnOnly: boolean
  hasSpecOnly: boolean
  sortBy: 'opportunity_score' | 'signal_count' | 'churn_signal_count' | 'unique_orgs'
  sourceFilter: 'all' | 'zendesk' | 'intercom'
  minRevenue: number
  maxRevenue: number
}

interface SavedView {
  id: string
  name: string
  filters: SavedViewFilters
}

const STORAGE_KEY = 'sp_saved_views'

function loadViews(): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveViews(views: SavedView[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views))
}

interface SavedViewsProps {
  currentFilters: SavedViewFilters
  onLoadView: (filters: SavedViewFilters) => void
}

export function SavedViews({ currentFilters, onLoadView }: SavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>(() => loadViews())
  const [open, setOpen] = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setNaming(false)
      }
    }
    document.addEventListener('mousedown', onOutsideClick)
    return () => document.removeEventListener('mousedown', onOutsideClick)
  }, [])

  function handleSave() {
    if (!name.trim()) return
    const newView: SavedView = {
      id: crypto.randomUUID(),
      name: name.trim(),
      filters: { ...currentFilters },
    }
    const updated = [...views, newView]
    setViews(updated)
    saveViews(updated)
    setName('')
    setNaming(false)
    setOpen(false)
  }

  function handleDelete(id: string) {
    const updated = views.filter(v => v.id !== id)
    setViews(updated)
    saveViews(updated)
  }

  function handleLoad(view: SavedView) {
    onLoadView(view.filters)
    setOpen(false)
  }

  return (
    <div className='relative' ref={dropdownRef}>
      <button
        type='button'
        onClick={() => { setOpen(prev => !prev); setNaming(false) }}
        className='inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors'
        title='Saved views'
      >
        <Bookmark className='w-3.5 h-3.5' />
        Views
        {views.length > 0 && (
          <span className='text-[10px] font-bold text-gray-500 bg-gray-100 rounded-full px-1.5 py-0.5'>
            {views.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className='absolute right-0 top-full mt-1 z-30 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden'>
          {views.length > 0 && (
            <ul className='py-1 divide-y divide-gray-50'>
              {views.map(view => (
                <li key={view.id} className='flex items-center gap-1 px-2 py-1.5 group hover:bg-gray-50'>
                  <button
                    type='button'
                    onClick={() => handleLoad(view)}
                    className='flex-1 text-left text-sm text-gray-700 font-medium truncate px-2 py-0.5 rounded hover:text-blue-700'
                  >
                    {view.name}
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDelete(view.id)}
                    className='shrink-0 p-1 text-gray-300 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity'
                    title='Delete view'
                  >
                    <Trash2 className='w-3 h-3' />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className='border-t border-gray-100 p-2'>
            {naming ? (
              <div className='flex items-center gap-1.5'>
                <input
                  autoFocus
                  type='text'
                  placeholder='View name…'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave()
                    if (e.key === 'Escape') { setNaming(false); setName('') }
                  }}
                  className='flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300'
                />
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className='text-xs font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-300 px-1'
                >
                  Save
                </button>
                <button
                  type='button'
                  onClick={() => { setNaming(false); setName('') }}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            ) : (
              <button
                type='button'
                onClick={() => setNaming(true)}
                className='w-full flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-blue-700 px-2 py-1.5 rounded-lg hover:bg-blue-50 transition-colors'
              >
                <Plus className='w-3.5 h-3.5' />
                Save current filters as view
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
