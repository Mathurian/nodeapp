import React from 'react'
import { Link } from 'react-router-dom'
import { auditorAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { Button } from '../components/ui'

const AuditorPage: React.FC = () => {
  const certifyCategory = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await auditorAPI.finalCertification(categoryId, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <div className="space-y-0">
      <div className="cgr-page-container pt-6">
        <div className="flex flex-wrap gap-2 justify-end">
          <Link to="/auditor/pending-audits"><Button variant="secondary">Pending Audits</Button></Link>
          <Link to="/auditor/certification-status"><Button variant="secondary">Certification Status</Button></Link>
          <Link to="/certifications"><Button>Full Certifications View</Button></Link>
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
