import React from 'react'
import { Link } from 'react-router-dom'
import { tallyMasterAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const TallyDashboardPage: React.FC = () => {
  const certifyTotals = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await tallyMasterAPI.certifyTotals({
      categoryId,
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <div className="space-y-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex justify-end">
          <Link
            to="/certifications"
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700"
          >
            Open Full Certifications View
          </Link>
        </div>
      </div>
      <CertificationOverviewWorkspace
        title="Tally Dashboard"
        subtitle="Certification pipeline overview with tally-ready categories and judge drilldown"
        mode="all"
        allowCertify
        certifyLabel="Certify Totals"
        onCertifyCategory={certifyTotals}
        canCertifyCategory={(category) => category.judgeCertified && !category.tallyCertified}
      />
    </div>
  )
}

export default TallyDashboardPage
