import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import toast from 'react-hot-toast'
import { roleAssignmentsAPI, usersAPI } from '../services/api'

type ScopedRole = 'BOARD' | 'TALLY_MASTER' | 'AUDITOR'

interface ScopedRoleAssignmentsPanelProps {
  eventId?: string
  contestId?: string
  categoryId?: string
  title?: string
  compact?: boolean
}

interface RoleAssignmentRecord {
  id: string
  userId: string
  role: ScopedRole
  notes?: string | null
  user?: {
    id: string
    name: string
    email: string
  }
}

interface UserOption {
  id: string
  name: string
  email: string
}

const ROLE_OPTIONS: ScopedRole[] = ['BOARD', 'TALLY_MASTER', 'AUDITOR']

const ScopedRoleAssignmentsPanel: React.FC<ScopedRoleAssignmentsPanelProps> = ({
  eventId,
  contestId,
  categoryId,
  title = 'Scoped Role Assignments',
  compact = false,
}) => {
  const queryClient = useQueryClient()
  const [role, setRole] = useState<ScopedRole>('BOARD')
  const [userId, setUserId] = useState('')
  const [notes, setNotes] = useState('')

  const queryKey = useMemo(
    () => ['scoped-role-assignments', eventId || '', contestId || '', categoryId || ''],
    [eventId, contestId, categoryId]
  )

  const { data: assignments = [], isLoading } = useQuery<RoleAssignmentRecord[]>(
    queryKey,
    async () => {
      const response = await roleAssignmentsAPI.getAll({ eventId, contestId, categoryId })
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    },
    {
      enabled: Boolean(eventId || contestId || categoryId),
    }
  )

  const { data: users = [] } = useQuery<UserOption[]>(
    ['scoped-role-users'],
    async () => {
      const response = await usersAPI.getAll({ includeInactive: false } as any)
      const payload = response.data?.data || response.data
      return Array.isArray(payload) ? payload : []
    }
  )

  const createMutation = useMutation(
    async () => {
      if (!userId) {
        throw new Error('Please select a user')
      }

      return roleAssignmentsAPI.create({
        userId,
        role,
        eventId,
        contestId,
        categoryId,
        notes: notes.trim() || undefined,
      })
    },
    {
      onSuccess: () => {
        toast.success('Scoped role assignment created')
        setUserId('')
        setNotes('')
        queryClient.invalidateQueries(queryKey)
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || error.message || 'Failed to create scoped role assignment'
        toast.error(message)
      },
    }
  )

  const deleteMutation = useMutation(
    async (id: string) => roleAssignmentsAPI.delete(id),
    {
      onSuccess: () => {
        toast.success('Scoped role assignment removed')
        queryClient.invalidateQueries(queryKey)
      },
      onError: (error: any) => {
        const message = error.response?.data?.message || error.message || 'Failed to remove scoped role assignment'
        toast.error(message)
      },
    }
  )

  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Assign scoped `BOARD`, `TALLY_MASTER`, or `AUDITOR` roles to this clone without copying source-side operational state.
        </p>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-4'}`}>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as ScopedRole)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={`${compact ? '' : 'md:col-span-2'} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
        >
          <option value="">Select a user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.email})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isLoading}
          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-70"
        >
          {createMutation.isLoading ? 'Assigning...' : 'Assign Role'}
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Optional notes"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      />

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading scoped role assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No scoped role assignments yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {assignment.role.replace('_', ' ')}: {assignment.user?.name || assignment.userId}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {assignment.user?.email || assignment.userId}
                  {assignment.notes ? ` · ${assignment.notes}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(assignment.id)}
                className="px-3 py-2 bg-red-600 dark:bg-red-500 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export default ScopedRoleAssignmentsPanel
