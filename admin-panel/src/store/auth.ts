import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { AdminUser, adminAuth } from '@/lib/auth'

interface AuthStore {
  user: User | null
  admin: AdminUser | null
  loading: boolean
  setUser: (user: User | null) => void
  setAdmin: (admin: AdminUser | null) => void
  setLoading: (loading: boolean) => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  admin: null,
  loading: true,

  setUser: (user) => set({ user }),
  setAdmin: (admin) => set({ admin }),
  setLoading: (loading) => set({ loading }),

  signIn: async (email, password) => {
    try {
      set({ loading: true })
      const { user, admin } = await adminAuth.signIn(email, password)
      set({ user, admin, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  signOut: async () => {
    try {
      set({ loading: true })
      await adminAuth.signOut()
      set({ user: null, admin: null, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  initialize: async () => {
    try {
      set({ loading: true })
      const authData = await adminAuth.getCurrentUser()
      
      if (authData) {
        set({ user: authData.user, admin: authData.admin })
      }
      
      set({ loading: false })
    } catch (error) {
      set({ user: null, admin: null, loading: false })
    }
  },
}))

// Set up auth state change listener
adminAuth.onAuthStateChange((user, admin) => {
  useAuthStore.getState().setUser(user)
  useAuthStore.getState().setAdmin(admin)
})