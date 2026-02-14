import React from 'react'
import { auditorAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { PageHeader } from '../components/ui'

const AuditorPendingAuditsPage: React.FC = () => {
  const certifyCategory = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await auditorAPI.finalCertification(categoryId, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title="Pending Auditor Certifications"
        subtitle="Audit-ready categories where tally is complete and auditor certification is pending"
      />
      <CertificationOverviewWorkspace
        title=""
        subtitle=""
        mode="auditor-queue"
        allowCertify
        certifyLabel="Certify Audit"
        onCertifyCategory={certifyCategory}
      />
    </div>
  )
}

export default AuditorPendingAuditsPage
