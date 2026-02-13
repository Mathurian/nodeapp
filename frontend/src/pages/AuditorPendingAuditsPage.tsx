import React from 'react'
import { auditorAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorPendingAuditsPage: React.FC = () => {
  const certifyCategory = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await auditorAPI.finalCertification(categoryId, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <CertificationOverviewWorkspace
      title="Pending Auditor Certifications"
      subtitle="Audit-ready categories where tally is complete and auditor certification is pending"
      mode="auditor-queue"
      allowCertify
      certifyLabel="Certify Audit"
      onCertifyCategory={certifyCategory}
    />
  )
}

export default AuditorPendingAuditsPage
