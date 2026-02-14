import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const AuditorScoreVerificationPage: React.FC = () => {
  return (
    <div className="cgr-page-container">
      <CertificationOverviewWorkspace
        title="Auditor Score Verification"
        subtitle="Review score-certification progress and judge completion by category"
        mode="all"
      />
    </div>
  )
}

export default AuditorScoreVerificationPage
