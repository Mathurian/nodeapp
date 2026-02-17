import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { scoreGovernanceAPI, tallyMasterAPI } from '../services/api'
import CertificationOverviewWorkspace from '../components/certifications/CertificationOverviewWorkspace'
import { Button } from '../components/ui'

const TallyDashboardPage: React.FC = () => {
  const { data: governancePending = 0 } = useQuery<number>(
    'tally-governance-pending',
    async () => {
      const response = await scoreGovernanceAPI.getRequests({ status: 'PENDING' })
      const rows = response.data?.data || response.data || []
      return Array.isArray(rows) ? rows.length : 0
    },
    { retry: 1, refetchInterval: 30000 }
  )

  const certifyTotals = async (categoryId: string, signature: { typedSignature?: string; drawnSignatureData?: string }) => {
    await tallyMasterAPI.certifyTotals({
      categoryId,
      typedSignature: signature.typedSignature,
      drawnSignatureData: signature.drawnSignatureData,
    })
  }

  return (
    <div className="space-y-0">
      <div className="cgr-page-container pt-6">
        <div className="flex justify-end gap-2">
          <Link to="/score-governance">
            <Button variant="secondary">Governance Queue ({governancePending})</Button>
          </Link>
          <Link to="/certifications">
            <Button>Open Full Certifications View</Button>
          </Link>
        </div>
      </div>
      <CertificationOverviewWorkspace
        title="Tally Dashboard"
        subtitle="Certification pipeline overview with tally-ready categories and judge drilldown"
        mode="all"
        allowCertify
        certifyLabel="Certify Totals"
        onCertifyCategory={certifyTotals}
        canCertifyCategory={(category) => {
          const judgeReady = category.judgeCertified || (category.judgeProgress.total > 0 && category.judgeProgress.certified >= category.judgeProgress.total)
          return judgeReady && !category.tallyCertified
        }}
      />
    </div>
  )
}

export default TallyDashboardPage
