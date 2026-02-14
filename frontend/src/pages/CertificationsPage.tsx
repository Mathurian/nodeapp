import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { PageHeader } from '../components/ui'

const CertificationsPage: React.FC = () => {
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
      />
    </div>
  )
}

export default CertificationsPage
