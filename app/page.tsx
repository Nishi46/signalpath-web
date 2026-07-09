import { MissionControlPage } from '@/components/landing/MissionControlPage'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <MissionControlPage />
      </div>
      <footer className="bg-gray-50 border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <a 
              href="mailto:nishigoldy@gmail.com" 
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
              aria-label="Send email to nishigoldy@gmail.com"
            >
              nishigoldy@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
