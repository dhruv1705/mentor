'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { Activity, UserPlus } from 'lucide-react'

interface RecentUser {
  id: string
  name: string | null
  email: string | null
  created_at: string
}

export function RecentActivity() {
  const { data: recentUsers, isLoading } = useQuery({
    queryKey: ['recent-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data as RecentUser[]
    },
  })

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-[#00ccff]" />
            <span>Recent Activity</span>
          </CardTitle>
          <CardDescription className="text-slate-400">Latest user registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-slate-600 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-slate-600 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 hover-lift">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Activity className="w-5 h-5 text-[#00ccff]" />
          <span>Recent Activity</span>
        </CardTitle>
        <CardDescription className="text-slate-400">Latest user registrations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentUsers?.map((user, index) => (
            <div key={user.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00ccff] to-[#0099cc] rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-medium">
                    {getInitials(user.name || user.email || 'U')}
                  </span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <UserPlus className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {user.name || 'Unnamed User'}
                </p>
                <p className="text-xs text-slate-400">
                  Joined {formatRelativeTime(user.created_at)}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                #{index + 1}
              </div>
            </div>
          ))}
          
          {recentUsers?.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <Activity className="w-12 h-12 mx-auto mb-2 text-slate-600" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}