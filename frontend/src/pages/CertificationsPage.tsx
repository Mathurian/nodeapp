import React from 'react'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'

const CertificationsPage: React.FC = () => {
  return (
    <CertificationOverviewWorkspace
      title="Certification Overview"
      subtitle="Contest and category certification progress with judge drilldown"
      mode="all"
    />
  )
}

export default CertificationsPage
