'use client'
import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): State {
    // Log the actual error for debugging but don't expose internals to users
    console.error('ErrorBoundary caught:', error)
    return { hasError: true, message: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-[#F4F5F8] dark:bg-[#111318]'>
          <div className='bg-white dark:bg-[#1A1D24] border border-red-500/20 rounded-2xl p-10 max-w-md text-center'>
            <div className='text-red-400 text-4xl mb-4'>!</div>
            <h2 className='font-bold text-gray-900 dark:text-white mb-2'>Something went wrong</h2>
            <p className='text-gray-500 dark:text-white/40 text-sm mb-6'>An unexpected error occurred. Please try again or contact support if the problem persists.</p>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              className='bg-blue-600 text-gray-900 dark:text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-500 transition-colors'
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
