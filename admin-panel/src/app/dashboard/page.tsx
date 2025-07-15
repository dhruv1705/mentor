'use client'

import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { UserGrowthChart } from '@/components/dashboard/user-growth-chart'
import { Calendar, Clock } from 'lucide-react'

export default function DashboardPage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400 text-lg">Welcome to the admin panel</p>
        </div>
        <div className="flex items-center space-x-6 mt-4 sm:mt-0">
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">{currentDate}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <Clock className="w-5 h-5" />
            <span className="text-sm">{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards />

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserGrowthChart />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}