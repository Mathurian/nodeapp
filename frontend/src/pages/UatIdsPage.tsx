import React from 'react'
import { useQuery } from 'react-query'
import { BeakerIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { Card, PageHeader } from '../components/ui'
import { testRunnerAPI } from '../services/api'

interface UatContestant {
  id: string
  name: string
  contestantNumber?: number | null
}

interface UatCategory {
  id: string
  name: string
  contestantCount: number
  contestantIds: string[]
  contestants: UatContestant[]
}

interface UatContest {
  id: string
  name: string
  categoryCount: number
  categoriesWithContestants: number
  categories: UatCategory[]
}

interface UatEvent {
  id: string
  name: string
  contests: UatContest[]
}

interface UatScenario {
  eventId: string
  eventName: string
  contestId: string
  contestName: string
  categoryId?: string
  categoryName?: string
  categoryIds?: string[]
  contestantIds: string[]
}

interface UatIdsPayload {
  generatedAt: string
  tenant: {
    id: string
    slug: string
    name: string
  }
  singleCategoryScenario?: UatScenario | null
  multiCategoryScenario?: UatScenario | null
  events: UatEvent[]
}

const UatIdsPage: React.FC = () => {
  const { data, isLoading, error } = useQuery<UatIdsPayload>(
    'uat-ids',
    async () => {
      const response = await testRunnerAPI.getUatIds()
      return response.data?.data || response.data
    },
    {
      retry: 1,
    }
  )

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  const renderIdList = (values: string[]) => {
    if (values.length === 0) {
      return <p className="text-sm text-gray-500 dark:text-gray-400">None available.</p>
    }

    return (
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => copyValue(value)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span className="font-mono text-xs">{value}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="cgr-page-container space-y-6">
      <PageHeader
        title="UAT IDs"
        subtitle="Tenant-scoped scenario identifiers for manual validation without host-level test execution access"
        icon={BeakerIcon}
      />

      <Card className="p-6">
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p>This page exposes safe, tenant-scoped identifiers for manual UAT and guided walkthroughs.</p>
          <p>It does not provide access to host-level test execution, file discovery, or test run management.</p>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading tenant UAT identifiers...
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/40">
          <p className="text-sm text-red-700 dark:text-red-300">Failed to load UAT identifiers.</p>
        </Card>
      )}

      {data && (
        <>
          <Card className="p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tenant</p>
                <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{data.tenant.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Slug</p>
                <p className="mt-1 font-mono text-sm text-gray-900 dark:text-white">{data.tenant.slug}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Generated</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{new Date(data.generatedAt).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Single-category scenario</h2>
              {data.singleCategoryScenario ? (
                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-semibold">Event:</span> {data.singleCategoryScenario.eventName}</p>
                  <p><span className="font-semibold">Contest:</span> {data.singleCategoryScenario.contestName}</p>
                  <p><span className="font-semibold">Category:</span> {data.singleCategoryScenario.categoryName}</p>
                  <div>
                    <p className="mb-2 font-semibold">Contestant IDs</p>
                    {renderIdList(data.singleCategoryScenario.contestantIds)}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No single-category UAT scenario is currently available for this tenant.</p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Multi-category scenario</h2>
              {data.multiCategoryScenario ? (
                <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <p><span className="font-semibold">Event:</span> {data.multiCategoryScenario.eventName}</p>
                  <p><span className="font-semibold">Contest:</span> {data.multiCategoryScenario.contestName}</p>
                  <div>
                    <p className="mb-2 font-semibold">Category IDs</p>
                    {renderIdList(data.multiCategoryScenario.categoryIds || [])}
                  </div>
                  <div>
                    <p className="mb-2 font-semibold">Contestant IDs</p>
                    {renderIdList(data.multiCategoryScenario.contestantIds)}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No multi-category UAT scenario is currently available for this tenant.</p>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Event inventory</h2>
            <div className="mt-4 space-y-6">
              {data.events.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No event data is available for this tenant.</p>
              ) : (
                data.events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{event.name}</h3>
                      <button
                        type="button"
                        onClick={() => copyValue(event.id)}
                        className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        Copy event ID
                      </button>
                    </div>

                    <div className="space-y-4">
                      {event.contests.map((contest) => (
                        <div key={contest.id} className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900/60">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">{contest.name}</h4>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {contest.categoryCount} categories, {contest.categoriesWithContestants} with contestants
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyValue(contest.id)}
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" />
                              Copy contest ID
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            {contest.categories.map((category) => (
                              <div key={category.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/50">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white">{category.name}</h5>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {category.contestantCount} contestants
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => copyValue(category.id)}
                                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  >
                                    <ClipboardDocumentIcon className="h-4 w-4" />
                                    Copy
                                  </button>
                                </div>

                                <div className="mt-3">
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Contestants
                                  </p>
                                  {category.contestants.length === 0 ? (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">None assigned.</p>
                                  ) : (
                                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                      {category.contestants.map((contestant) => (
                                        <li key={contestant.id} className="flex items-center justify-between gap-3">
                                          <span>
                                            {contestant.name}
                                            {typeof contestant.contestantNumber === 'number'
                                              ? ` (#${contestant.contestantNumber})`
                                              : ''}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => copyValue(contestant.id)}
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                          >
                                            <ClipboardDocumentIcon className="h-3 w-3" />
                                            Copy ID
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

export default UatIdsPage
