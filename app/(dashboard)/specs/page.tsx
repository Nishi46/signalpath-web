'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardNav } from '@/components/DashboardNav'
import { Plus, Loader2, ExternalLink, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react'

interface SpecRow {
  id: string
  title: string
  source: string
  status: string
  pushed_to: string | null
  pushed_at: string | null
  external_id: string | null
  created_at: string
  href: string
}

function SourceBadge({ source }: { source: string }) {
  if (source === 'signal-driven') {
    return (
      <span className='inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'>
        Signal-Driven
      </span>
    )
  }
  if (source === 'freeform_enriched') {
    return (
      <span className='inline-block text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'>
        Freeform + Evidence
      </span>
    )
  }
  if (source === 'promoted') {
    return (
      <span className='inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'>
        Promoted
      </span>
    )
  }
  return (
    <span className='inline-block text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-medium'>
      Freeform
    </span>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'ready') return <CheckCircle className='w-3.5 h-3.5 text-emerald-500' />
  if (status === 'failed') return <AlertTriangle className='w-3.5 h-3.5 text-red-500' />
  return <Loader2 className='w-3.5 h-3.5 text-blue-500 animate-spin' />
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SpecsPage() {
  const [specs, setSpecs] = useState<SpecRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/specs')
      .then(r => r.json())
      .then(d => { setSpecs(d.specs ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(spec: SpecRow) {
    if (confirmDelete !== spec.id) {
      setConfirmDelete(spec.id)
      return
    }
    setDeleting(spec.id)
    setConfirmDelete(null)
    const url = spec.source === 'signal-driven'
      ? `/api/clusters/${spec.id}/spec`
      : `/api/freeform/${spec.id}`
    await fetch(url, { method: 'DELETE' })
    setSpecs(prev => prev.filter(s => s.id !== spec.id))
    setDeleting(null)
  }

  return (
    <div className='min-h-screen bg-[#F4F5F8] dark:bg-[#111318]'>
      <DashboardNav />

      <div className='max-w-5xl mx-auto px-6 py-10'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Specs</h1>
            <p className='text-sm text-gray-500 dark:text-white/40 mt-1'>
              All generated specs — signal-driven and freeform.
            </p>
          </div>
          <Link
            href='/freeform'
            className='flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm shadow-blue-600/20 hover:bg-blue-700 transition-colors'
          >
            <Plus className='w-4 h-4' />
            New Spec
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className='flex items-center justify-center py-20'>
            <Loader2 className='w-6 h-6 text-blue-600 animate-spin' />
          </div>
        )}

        {/* Empty */}
        {!loading && specs.length === 0 && (
          <div className='text-center py-20'>
            <p className='text-gray-400 dark:text-white/30 text-sm mb-4'>No specs generated yet.</p>
            <Link href='/freeform' className='text-sm text-blue-600 dark:text-blue-400 hover:underline'>
              Create your first freeform spec →
            </Link>
          </div>
        )}

        {/* Table */}
        {!loading && specs.length > 0 && (
          <div className='bg-white dark:bg-[#1A1D24] rounded-2xl border border-gray-100 dark:border-white/[0.07] overflow-hidden'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-100 dark:border-white/[0.07]'>
                  <th className='text-left text-xs font-medium text-gray-400 dark:text-white/30 px-6 py-3'>Title</th>
                  <th className='text-left text-xs font-medium text-gray-400 dark:text-white/30 px-4 py-3'>Source</th>
                  <th className='text-left text-xs font-medium text-gray-400 dark:text-white/30 px-4 py-3'>Status</th>
                  <th className='text-left text-xs font-medium text-gray-400 dark:text-white/30 px-4 py-3'>Pushed</th>
                  <th className='text-left text-xs font-medium text-gray-400 dark:text-white/30 px-4 py-3'>Date</th>
                  <th className='px-4 py-3' />
                </tr>
              </thead>
              <tbody>
                {specs.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${
                      i < specs.length - 1 ? 'border-b border-gray-50 dark:border-white/[0.04]' : ''
                    }`}
                  >
                    <td className='px-6 py-3.5 max-w-xs'>
                      <Link
                        href={s.href}
                        className='font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1'
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className='px-4 py-3.5'>
                      <SourceBadge source={s.source} />
                    </td>
                    <td className='px-4 py-3.5'>
                      <StatusIcon status={s.status} />
                    </td>
                    <td className='px-4 py-3.5 text-gray-500 dark:text-white/40'>
                      {s.pushed_to ? (
                        <span className='flex items-center gap-1'>
                          <ExternalLink className='w-3 h-3' />
                          {s.pushed_to} · {s.external_id}
                        </span>
                      ) : (
                        <span className='text-gray-300 dark:text-white/20'>—</span>
                      )}
                    </td>
                    <td className='px-4 py-3.5 text-gray-400 dark:text-white/30 whitespace-nowrap'>
                      {fmtDate(s.created_at)}
                    </td>
                    <td className='px-4 py-3.5 text-right'>
                      {deleting === s.id ? (
                        <Loader2 className='w-3.5 h-3.5 animate-spin text-gray-400 dark:text-white/30 ml-auto' />
                      ) : confirmDelete === s.id ? (
                        <span className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className='text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors'
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className='text-xs text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-300 transition-colors'
                          >
                            Delete
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDelete(s)}
                          className='opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400'
                          title='Delete spec'
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
