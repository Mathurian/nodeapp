import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const CertificationsPage: React.FC = () => {
  const { user } = useAuth()
  const canCertifyInOverview = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'TALLY_MASTER', 'AUDITOR'].includes(user?.role || '')

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
        allowCertify={canCertifyInOverview}
      />
    </div>
  )
}

export default CertificationsPage
