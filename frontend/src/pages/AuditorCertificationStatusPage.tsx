import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorCertificationStatusPage: React.FC = () => {
  return (
    <CertificationOverviewWorkspace
      title="Auditor Certification Status"
      subtitle="End-to-end status across judge, tally, auditor, and board stages"
      mode="all"
    />
  )
}

export default AuditorCertificationStatusPage
