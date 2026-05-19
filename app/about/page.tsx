import type { Metadata } from 'next'
import { AboutPage } from '@/components/landing/AboutPage'

export const metadata: Metadata = {
  title: 'About — SignalPath',
  description: 'We built SignalPath because PM work was drowning in noise. Learn the story behind the product.',
}

export default function About() {
  return <AboutPage />
}
