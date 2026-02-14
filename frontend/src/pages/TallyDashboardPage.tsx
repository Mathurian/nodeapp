import React from 'react'
import { Link } from 'react-router-dom'
import { tallyMasterAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { Button } from '../components/ui'

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
      <div className="cgr-page-container pt-6">
        <div className="flex justify-end">
          <Link to="/certifications">
            <Button>Open Full Certifications View</Button>
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
