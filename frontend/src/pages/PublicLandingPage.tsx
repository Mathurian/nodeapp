import React, { useEffect, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const getRoleHomePath = (role?: string): string => {
  switch (role) {
    case 'AUDITOR':
      return '/auditor'
    case 'TALLY_MASTER':
      return '/tally-master'
    case 'EMCEE':
      return '/emcee'
    case 'BOARD':
      return '/board'
    default:
      return '/dashboard'
  }
}

const PublicLandingPage: React.FC = () => {
  const { user } = useAuth()
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()

  const basePath = useMemo(() => (slug ? `/${slug}` : ''), [slug])

  useEffect(() => {
    if (user) {
      navigate(`${basePath}${getRoleHomePath(user.role)}`, { replace: true })
    }
  }, [basePath, navigate, user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900">ConMGR</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage events, scoring, certifications, and reporting from one secure platform.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          New accounts are created by invitation from an organizer or admin.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link to={`${basePath}/login`} className="px-4 py-3 text-center rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Log In
          </Link>
          <Link to={`${basePath}/forgot-password`} className="px-4 py-3 text-center rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">
            Recover Password
          </Link>
          <Link to={`${basePath}/register`} className="px-4 py-3 text-center rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">
            Register
          </Link>
        </div>
      </div>
    </div>
  )
}

export default PublicLandingPage
