'use client'

import { useState } from 'react'
import { UserTable } from '@/components/users/user-table'
import { UserEditDialog } from '@/components/users/user-edit-dialog'
import { User } from '@/hooks/useUsers'

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
  }

  const handleCloseDialog = () => {
    setSelectedUser(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600">Manage user accounts and profiles</p>
      </div>

      <UserTable onEditUser={handleEditUser} />

      <UserEditDialog user={selectedUser} onClose={handleCloseDialog} />
    </div>
  )
}