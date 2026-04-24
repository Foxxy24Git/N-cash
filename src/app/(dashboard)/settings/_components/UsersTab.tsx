'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import AddUserDialog from './AddUserDialog'
import EditUserDialog from './EditUserDialog'
import ResetPasswordDialog from './ResetPasswordDialog'

interface User {
  id: string
  username: string
  fullName: string
  isActive: boolean
  createdAt: string
}

type DialogMode = 'add' | 'edit' | 'reset' | null

export default function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [pendingToggle, setPendingToggle] = useState<User | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) {
        toast.error('Gagal memuat daftar user')
        return
      }
      setUsers(await res.json())
    } catch {
      toast.error('Gagal memuat daftar user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function addLoadingId(id: string) {
    setLoadingIds(prev => new Set(prev).add(id))
  }

  function removeLoadingId(id: string) {
    setLoadingIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  async function handleToggleActive(user: User) {
    setPendingToggle(null)
    addLoadingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Terjadi kesalahan')
        return
      }
      toast.success(
        user.isActive ? `${user.fullName} dinonaktifkan` : `${user.fullName} diaktifkan`
      )
      await fetchUsers()
    } finally {
      removeLoadingId(user.id)
    }
  }

  async function handleDelete(user: User) {
    setPendingDelete(null)
    addLoadingId(user.id)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Terjadi kesalahan')
        return
      }
      toast.success('User berhasil dihapus')
      await fetchUsers()
    } finally {
      removeLoadingId(user.id)
    }
  }

  if (loading) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-gray-400">
        Memuat...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-gray-900">Manajemen User</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen('add')}>
          <Plus className="h-4 w-4" />
          Tambah User
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Belum ada user terdaftar. Klik Tambah User.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => {
              const isSelf = user.id === currentUserId
              const isRowLoading = loadingIds.has(user.id)
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.fullName}
                    {isSelf && (
                      <span className="ml-1.5 text-xs text-gray-400 font-normal">
                        (Anda)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">{user.username}</TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700">
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500">
                        Nonaktif
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {format(new Date(user.createdAt), 'd MMM yyyy', { locale: localeId })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRowLoading}
                        onClick={() => {
                          setSelectedUser(user)
                          setDialogOpen('edit')
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRowLoading}
                        onClick={() => {
                          setSelectedUser(user)
                          setDialogOpen('reset')
                        }}
                      >
                        Reset PW
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRowLoading || isSelf}
                        onClick={() => setPendingToggle(user)}
                      >
                        {isRowLoading ? '...' : user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRowLoading || isSelf}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setPendingDelete(user)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      {/* Dialog: Tambah User */}
      <AddUserDialog
        open={dialogOpen === 'add'}
        onOpenChange={v => { if (!v) setDialogOpen(null) }}
        onSuccess={fetchUsers}
      />

      {/* Dialog: Edit User */}
      {selectedUser && (
        <EditUserDialog
          open={dialogOpen === 'edit'}
          onOpenChange={v => { if (!v) setDialogOpen(null) }}
          user={selectedUser}
          currentUserId={currentUserId}
          onSuccess={fetchUsers}
        />
      )}

      {/* Dialog: Reset Password */}
      {selectedUser && (
        <ResetPasswordDialog
          open={dialogOpen === 'reset'}
          onOpenChange={v => { if (!v) setDialogOpen(null) }}
          user={selectedUser}
          onSuccess={fetchUsers}
        />
      )}

      {/* AlertDialog: Konfirmasi Toggle Aktif */}
      <AlertDialog
        open={!!pendingToggle}
        onOpenChange={v => { if (!v) setPendingToggle(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.isActive ? 'Nonaktifkan' : 'Aktifkan'}{' '}
              {pendingToggle?.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingToggle?.isActive
                ? 'User tidak bisa login sampai diaktifkan kembali.'
                : 'User bisa login kembali setelah diaktifkan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingToggle && handleToggleActive(pendingToggle)}
              className={pendingToggle?.isActive ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {pendingToggle?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Konfirmasi Hapus */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={v => { if (!v) setPendingDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {pendingDelete?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
