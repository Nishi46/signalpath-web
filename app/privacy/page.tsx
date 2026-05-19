import type { Metadata } from 'next'
import { PrivacyPage } from '@/components/landing/PrivacyPage'

export const metadata: Metadata = {
  title: 'Privacy Policy — SignalPath',
  description: 'How SignalPath collects, uses, and protects your data.',
}

export default function Privacy() {
  return <PrivacyPage />
}
