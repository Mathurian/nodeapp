import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { PageHeader } from '../components/ui'
import { api } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const CertificationsPage: React.FC = () => {
  const { user } = useAuth()
  const canFinalize = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD'].includes(user?.role || '')

  const finalizeCategory = async (
    categoryId: string,
    signature: { typedSignature?: string; drawnSignatureData?: string }
  ) => {
    await api.post(`/board/category/${categoryId}/certification/submit`, {
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData
    })
  }

  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title="Certification Overview"
        subtitle="Contest and category certification progress with judge drilldown"
      />
      <CertificationOverviewWorkspace
        title=""
        subtitle=""
        mode="all"
        allowCertify={canFinalize}
        certifyLabel="Final Approve"
        onCertifyCategory={finalizeCategory}
        canCertifyCategory={(category) => category.auditorCertified && !category.boardApproved}
      />
    </div>
  )
}

export default CertificationsPage
