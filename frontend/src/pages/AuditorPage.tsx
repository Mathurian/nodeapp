import React from 'react'
import { Link } from 'react-router-dom'
import { auditorAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorPage: React.FC = () => {
  const certifyCategory = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await auditorAPI.finalCertification(categoryId, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <div className="space-y-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex flex-wrap gap-2 justify-end">
          <Link to="/auditor/pending-audits" className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            Pending Audits
          </Link>
          <Link to="/auditor/certification-status" className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            Certification Status
          </Link>
          <Link to="/certifications" className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Full Certifications View
          </Link>
        </div>
      </div>
      <CertificationOverviewWorkspace
        title="Auditor Dashboard"
        subtitle="Certification pipeline overview with auditor-ready categories and judge drilldown"
        mode="all"
        allowCertify
        certifyLabel="Certify Audit"
        onCertifyCategory={certifyCategory}
        canCertifyCategory={(category) => category.tallyCertified && !category.auditorCertified}
      />
    </div>
  )
}

export default AuditorPage
