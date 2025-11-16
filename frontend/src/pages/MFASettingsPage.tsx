import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import {
  ShieldCheckIcon,
  QrCodeIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

interface MFASettings {
  enabled: boolean
  method: 'TOTP' | 'SMS' | 'EMAIL'
  backupCodes: string[]
  lastVerified?: string
}

const MFASettingsPage: React.FC = () => {
  const { user } = useAuth()
  const [settings, setSettings] = useState<MFASettings>({
    enabled: false,
    method: 'TOTP',
    backupCodes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  useEffect(() => {
    fetchMFASettings()
  }, [])

  const fetchMFASettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/mfa/settings')
      setSettings(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load MFA settings')
    } finally {
      setLoading(false)
    }
  }

  const enableMFA = async () => {
    try {
      setError(null)
      const response = await api.post('/mfa/enable')
      setQrCode(response.data.qrCode)
      setSecret(response.data.secret)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to enable MFA')
    }
  }

  const verifyAndActivate = async () => {
    try {
      setError(null)
      const response = await api.post('/mfa/verify', {
        code: verificationCode,
        secret,
      })
      setSettings(response.data.settings)
      setShowBackupCodes(true)
      setQrCode(null)
      setSecret(null)
      setVerificationCode('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code')
    }
  }

  const disableMFA = async () => {
    if (!confirm('Are you sure you want to disable MFA? This will make your account less secure.')) {
      return
    }
    try {
      setError(null)
      await api.post('/mfa/disable')
      await fetchMFASettings()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable MFA')
    }
  }

  const regenerateBackupCodes = async () => {
    try {
      setError(null)
      const response = await api.post('/mfa/regenerate-backup-codes')
      setSettings({ ...settings, backupCodes: response.data.backupCodes })
      setShowBackupCodes(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to regenerate backup codes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading MFA settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Multi-Factor Authentication
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Add an extra layer of security to your account
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Current Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ShieldCheckIcon className={`h-12 w-12 ${
                settings.enabled
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400'
              }`} />
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  MFA Status
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {settings.enabled ? (
                    <>
                      <CheckCircleIcon className="h-4 w-4 inline text-green-600 mr-1" />
                      Enabled ({settings.method})
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="h-4 w-4 inline text-red-600 mr-1" />
                      Disabled
                    </>
                  )}
                </p>
              </div>
            </div>
            {settings.enabled ? (
              <button
                onClick={disableMFA}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Disable MFA
              </button>
            ) : (
              <button
                onClick={enableMFA}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Enable MFA
              </button>
            )}
          </div>
        </div>

        {/* Setup MFA */}
        {qrCode && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Set Up Authenticator App
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Step 1: Scan QR Code
                </h3>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Step 2: Or Enter Secret Key
                </h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">
                  <code className="text-sm text-gray-900 dark:text-white break-all">
                    {secret}
                  </code>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Step 3: Verify Code
                </h3>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-3"
                />
                <button
                  onClick={verifyAndActivate}
                  disabled={verificationCode.length !== 6}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Verify and Activate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Backup Codes */}
        {settings.enabled && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Backup Codes
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Save these codes in a secure place. Each can be used once if you lose access to your authenticator.
                </p>
              </div>
              <button
                onClick={regenerateBackupCodes}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Regenerate Codes
              </button>
            </div>
            {showBackupCodes && settings.backupCodes.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {settings.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600"
                    >
                      <code className="text-sm text-gray-900 dark:text-white">
                        {code}
                      </code>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded">
                  <KeyIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Save these codes now! Each code can only be used once. If you regenerate codes, the old ones will no longer work.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MFASettingsPage
