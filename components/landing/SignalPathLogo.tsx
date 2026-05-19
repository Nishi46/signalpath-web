export function SignalPathLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 38"
      fill="none"
      className={`w-7 h-8 ${className}`}
      aria-label="SignalPath"
    >
      {/* Top chevron — white on dark, near-black on light */}
      <polyline
        points="2,12 16,26 30,12"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-gray-900 dark:stroke-white"
      />
      {/* Bottom chevron — muted gray */}
      <polyline
        points="7,20 16,29 25,20"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-gray-400 dark:stroke-gray-500"
      />
      {/* Blue dot */}
      <circle cx="16" cy="34.5" r="3" fill="#3B82F6" />
    </svg>
  )
}
