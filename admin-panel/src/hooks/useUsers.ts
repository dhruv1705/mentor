import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/auth'
import { useAuthStore } from '@/store/auth'

export interface User {
  id: string
  user_id: string
  email: string | null
  name: string | null
  age: number | null
  gender: string | null
  height: number | null
  avatar_url: string | null
  status: 'active' | 'suspended' | 'pending'
  last_active: string | null
  total_conversations: number
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface UserFilters {
  search?: string
  status?: string
  sortBy?: 'created_at' | 'last_active' | 'name'
  sortOrder?: 'asc' | 'desc'
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      let query = supabase.from('profiles').select('*')

      // Apply search filter
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at'
      const sortOrder = filters.sortOrder || 'desc'
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data, error } = await query

      if (error) throw error
      return data as User[]
    },
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as User
    },
    enabled: !!userId,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const { admin } = useAuthStore()

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error) throw error

      // Log admin action
      if (admin) {
        await logAdminAction(
          admin.id,
          'update_user',
          'user',
          userId,
          { updates }
        )
      }

      return data as User
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, created_at')

      if (error) throw error

      const total = data.length
      const active = data.filter(user => user.status === 'active').length
      const suspended = data.filter(user => user.status === 'suspended').length
      const pending = data.filter(user => user.status === 'pending').length

      // Calculate new users this month
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const newThisMonth = data.filter(user => 
        new Date(user.created_at) >= thisMonth
      ).length

      return {
        total,
        active,
        suspended,
        pending,
        newThisMonth
      }
    },
  })
}