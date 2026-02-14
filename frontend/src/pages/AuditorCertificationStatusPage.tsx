import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { PageHeader } from '../components/ui'

const AuditorCertificationStatusPage: React.FC = () => {
  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title="Auditor Certification Status"
        subtitle="End-to-end status across judge, tally, auditor, and board stages"
      />
      <CertificationOverviewWorkspace
        title=""
        subtitle=""
        mode="all"
      />
    </div>
  )
}

export default AuditorCertificationStatusPage
