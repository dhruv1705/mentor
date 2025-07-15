import { supabase } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  user_id: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface AuthState {
  user: User | null
  admin: AdminUser | null
  loading: boolean
}

export const adminAuth = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    if (data.user) {
      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (adminError || !adminData) {
        await supabase.auth.signOut()
        throw new Error('Access denied: Admin privileges required')
      }

      return { user: data.user, admin: adminData }
    }

    throw new Error('Authentication failed')
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Check if user is admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!adminData) return null

    return { user, admin: adminData }
  },

  onAuthStateChange(callback: (user: User | null, admin: AdminUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .single()

        callback(session.user, adminData || null)
      } else {
        callback(null, null)
      }
    })
  }
}

export const logAdminAction = async (
  adminId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, any>
) => {
  const { error } = await supabase
    .from('admin_logs')
    .insert({
      admin_id: adminId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
    })

  if (error) {
    console.error('Failed to log admin action:', error)
  }
}