'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Footer from './Footer'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Pages that don't need sidebar
  const publicPages = ['/', '/auth/login', '/auth/register']
  const isPublicPage = publicPages.includes(pathname)

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(!!token)
    setIsLoading(false)
  }, [pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  // Public pages without sidebar
  if (isPublicPage || !isAuthenticated) {
    return <>{children}</>
  }

  // Authenticated pages with sidebar
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <Sidebar />
      {/* Main content area */}
      <div className="lg:pl-64 transition-all duration-300">
        {/* Mobile header spacer */}
        <div className="h-16 lg:h-0" />
        {/* Page content */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
