'use client'

import { useUserStats } from '@/hooks/useUsers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, UserPlus, TrendingUp } from 'lucide-react'

export function StatsCards() {
  const { data: stats, isLoading } = useUserStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-600 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-600 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      title: 'Total Users',
      value: stats?.total || 0,
      description: 'All registered users',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-500/20 to-blue-600/20',
      iconColor: 'text-blue-400'
    },
    {
      title: 'Active Users',
      value: stats?.active || 0,
      description: 'Currently active users',
      icon: UserCheck,
      gradient: 'from-green-500 to-green-600',
      bgGradient: 'from-green-500/20 to-green-600/20',
      iconColor: 'text-green-400'
    },
    {
      title: 'Suspended Users',
      value: stats?.suspended || 0,
      description: 'Temporarily suspended',
      icon: UserX,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-500/20 to-red-600/20',
      iconColor: 'text-red-400'
    },
    {
      title: 'New This Month',
      value: stats?.newThisMonth || 0,
      description: 'New registrations',
      icon: UserPlus,
      gradient: 'from-purple-500 to-purple-600',
      bgGradient: 'from-purple-500/20 to-purple-600/20',
      iconColor: 'text-purple-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item) => {
        const Icon = item.icon
        return (
          <Card 
            key={item.title} 
            className="bg-slate-800 border-slate-700 hover-lift card-hover overflow-hidden group"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${item.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-medium text-slate-200">
                {item.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient} shadow-lg`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-white">{item.value}</div>
                <div className="flex items-center text-green-400 text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12%
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {item.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}