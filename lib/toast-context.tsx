'use client'
import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timerRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timerRef.current.delete(id)
    }
  }, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { id, message, variant }])
    const timer = setTimeout(() => dismiss(id), 3500)
    timerRef.current.set(id, timer)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext).toast
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className='fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none'>
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const colors = {
    success: 'bg-gray-900 text-white',
    error:   'bg-red-600 text-white',
    info:    'bg-blue-600 text-white',
  }
  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  }
  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ${colors[t.variant]}`}
    >
      <span className='text-base leading-none'>{icons[t.variant]}</span>
      <span className='flex-1'>{t.message}</span>
      <button
        onClick={() => onDismiss(t.id)}
        className='opacity-60 hover:opacity-100 transition-opacity leading-none text-base'
        aria-label='Dismiss'
      >
        ✕
      </button>
    </div>
  )
}
