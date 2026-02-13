import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorScoreVerificationPage: React.FC = () => {
  return (
    <CertificationOverviewWorkspace
      title="Auditor Score Verification"
      subtitle="Review score-certification progress and judge completion by category"
      mode="all"
    />
  )
}

export default AuditorScoreVerificationPage
