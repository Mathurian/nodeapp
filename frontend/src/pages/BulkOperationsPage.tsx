import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI, emailAPI } from '../services/api'
import {
  UserPlusIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline'
import { Card, PageHeader } from '../components/ui'

const BulkOperationsPage: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  const desiredTab = useMemo<'import' | 'email'>(() => {
    const tabParam = new URLSearchParams(location.search).get('tab')?.toLowerCase()
    if (tabParam === 'email' || location.pathname.endsWith('/send-email')) {
      return 'email'
    }
    return 'import'
  }, [location.pathname, location.search])
  const [activeTab, setActiveTab] = useState<'import' | 'email'>(desiredTab)
  const [file, setFile] = useState<File | null>(null)
  const [userType, setUserType] = useState<'JUDGE' | 'CONTESTANT'>('CONTESTANT')
  const [emailData, setEmailData] = useState({
    roles: [] as string[],
    subject: '',
    content: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setActiveTab(desiredTab)
  }, [desiredTab])

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const reader = new FileReader()
      reader.onload = async (e) => {
        const text = e.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',')
        const csvData = lines.slice(1).map(line => {
          const values = line.split(',')
          return headers.reduce((obj: any, header, index) => {
            obj[header.trim()] = values[index]?.trim()
            return obj
          }, {})
        })

        await usersAPI.importCSV({ csvData, userType })
        setSuccess(`Successfully imported ${csvData.length} users`)
        setFile(null)
      }
      reader.readAsText(file)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to import users')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkEmail = async () => {
    if (!emailData.subject || !emailData.content) {
      setError('Subject and content are required')
      return
    }
    if (emailData.roles.length === 0) {
      setError('Select at least one role')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await emailAPI.sendByRole(emailData)
      setSuccess('Bulk email sent successfully')
      setEmailData({ roles: [], subject: '', content: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send bulk email')
    } finally {
      setLoading(false)
    }
  }

  const toggleRole = (role: string) => {
    setEmailData({
      ...emailData,
      roles: emailData.roles.includes(role)
        ? emailData.roles.filter(r => r !== role)
        : [...emailData.roles, role],
    })
  }

  const downloadTemplate = async () => {
    try {
      const response = await usersAPI.getCSVTemplate(userType)
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${userType.toLowerCase()}_import_template.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to download template')
    }
  }

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && user?.role !== 'ORGANIZER' && user?.role !== 'BOARD') {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 dark:text-gray-500">
            You don't have permission to perform bulk operations.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="cgr-page-container">
        <PageHeader
          title="Bulk Operations"
          subtitle="Import users, send bulk emails, and perform batch operations"
        />

        {error && (
          <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {success && (
          <Card className="mb-6 p-4 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </Card>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'import'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <UserPlusIcon className="h-5 w-5 inline mr-2" />
            User Import
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'email'
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <EnvelopeIcon className="h-5 w-5 inline mr-2" />
            Bulk Email
          </button>
        </div>

        {/* User Import Tab */}
        {activeTab === 'import' && (
          <Card className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Import Users from CSV
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  User Type
                </label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                >
                  <option value="CONTESTANT">Contestants</option>
                  <option value="JUDGE">Judges</option>
                </select>
              </div>

              <div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  Download CSV Template
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <CloudArrowUpIcon className="h-5 w-5" />
                {loading ? 'Importing...' : 'Import Users'}
              </button>

              <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> CSV file must include headers. Download the template to see the required format.
                  Duplicate emails will be skipped.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Bulk Email Tab */}
        {activeTab === 'email' && (
          <Card className="rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white dark:text-white mb-4">
              Send Bulk Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                  Select Recipient Roles
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {['ADMIN', 'ORGANIZER', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'].map((role) => (
                    <label key={role} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={emailData.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                  Email Content
                </label>
                <textarea
                  value={emailData.content}
                  onChange={(e) => setEmailData({ ...emailData, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:bg-gray-700 text-gray-900 dark:text-white dark:text-white"
                />
              </div>

              <button
                onClick={handleBulkEmail}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <EnvelopeIcon className="h-5 w-5" />
                {loading ? 'Sending...' : 'Send Bulk Email'}
              </button>
            </div>
          </Card>
        )}
    </div>
  )
}

export default BulkOperationsPage
