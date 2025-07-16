import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          name?: string | null
          age?: number | null
          gender?: string | null
          height?: number | null
          avatar_url?: string | null
          status?: 'active' | 'suspended' | 'pending'
          last_active?: string | null
          total_conversations?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          name?: string | null
          age?: number | null
          gender?: string | null
          height?: number | null
          avatar_url?: string | null
          status?: 'active' | 'suspended' | 'pending'
          last_active?: string | null
          total_conversations?: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      admin_users: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'super_admin'
          permissions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'admin' | 'super_admin'
          permissions?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'super_admin'
          permissions?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      admin_logs: {
        Row: {
          id: string
          admin_id: string
          action: string
          resource_type: string
          resource_id: string | null
          details: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          details?: Record<string, any> | null
          created_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          key: string
          value: Record<string, any>
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Record<string, any>
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Record<string, any>
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
      user_activities: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          data: Record<string, any> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_type: string
          data?: Record<string, any> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          data?: Record<string, any> | null
          created_at?: string
        }
      }
      user_habits: {
        Row: {
          id: string
          user_id: string
          habit: string
          category: 'health' | 'productivity' | 'learning' | 'social' | 'entertainment'
          confidence: number
          frequency: string | null
          source: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit: string
          category: 'health' | 'productivity' | 'learning' | 'social' | 'entertainment'
          confidence: number
          frequency?: string | null
          source: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit?: string
          category?: 'health' | 'productivity' | 'learning' | 'social' | 'entertainment'
          confidence?: number
          frequency?: string | null
          source?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}