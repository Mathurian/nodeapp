import React from 'react'
import { auditorAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorFinalCertificationPage: React.FC = () => {
  const certifyCategory = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await auditorAPI.finalCertification(categoryId, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <CertificationOverviewWorkspace
      title="Final Auditor Certification"
      subtitle="Submit auditor certification for categories that completed tally review"
      mode="auditor-queue"
      allowCertify
      certifyLabel="Finalize Certification"
      onCertifyCategory={certifyCategory}
    />
  )
}

export default AuditorFinalCertificationPage
