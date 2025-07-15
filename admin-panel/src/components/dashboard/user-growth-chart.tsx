'use client'

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface ChartData {
  date: string
  users: number
}

export function UserGrowthChart() {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['user-growth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Group by date and count users
      const usersByDate = data.reduce((acc: Record<string, number>, user) => {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {})

      // Convert to chart data format
      const chartData: ChartData[] = Object.entries(usersByDate).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: count
      }))

      return chartData.slice(-30) // Last 30 days
    },
  })

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#00ccff]" />
            <span>User Growth</span>
          </CardTitle>
          <CardDescription className="text-slate-400">Daily user registrations over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ccff]"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800 border-slate-700 hover-lift">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-[#00ccff]" />
          <span>User Growth</span>
        </CardTitle>
        <CardDescription className="text-slate-400">Daily user registrations over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                fontSize={12}
              />
              <YAxis 
                stroke="#94a3b8"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#f8fafc'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#00ccff" 
                strokeWidth={3}
                dot={{ fill: '#00ccff', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#00ccff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}