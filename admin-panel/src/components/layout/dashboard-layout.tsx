'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { Sidebar } from '@/components/navigation/sidebar'
import { redirect } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, admin, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00ccff] mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!user || !admin) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Sidebar />
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}