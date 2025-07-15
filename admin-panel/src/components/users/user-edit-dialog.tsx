'use client'

import { useState, useEffect } from 'react'
import { User, useUpdateUser } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Save } from 'lucide-react'

interface UserEditDialogProps {
  user: User | null
  onClose: () => void
}

export function UserEditDialog({ user, onClose }: UserEditDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    height: '',
    status: 'active' as 'active' | 'suspended' | 'pending',
    admin_notes: ''
  })

  const updateUser = useUpdateUser()

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        age: user.age?.toString() || '',
        gender: user.gender || '',
        height: user.height?.toString() || '',
        status: user.status,
        admin_notes: user.admin_notes || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      await updateUser.mutateAsync({
        userId: user.id,
        updates: {
          name: formData.name || null,
          email: formData.email || null,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          height: formData.height ? parseInt(formData.height) : null,
          status: formData.status,
          admin_notes: formData.admin_notes || null
        }
      })
      onClose()
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Edit User</CardTitle>
              <CardDescription>
                Update user information and settings
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={handleChange('name')}
                placeholder="Enter user name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                placeholder="Enter email address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={handleChange('age')}
                  placeholder="Age"
                  min="1"
                  max="120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <Input
                  type="number"
                  value={formData.height}
                  onChange={handleChange('height')}
                  placeholder="Height"
                  min="50"
                  max="250"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={handleChange('gender')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={formData.status}
                onChange={handleChange('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Admin Notes</label>
              <textarea
                value={formData.admin_notes}
                onChange={handleChange('admin_notes')}
                placeholder="Add admin notes about this user..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}