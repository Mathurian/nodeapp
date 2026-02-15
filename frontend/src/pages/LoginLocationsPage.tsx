import React, { useMemo, useState } from 'react'
import { useQuery } from 'react-query'
import { format } from 'date-fns'
import {
  GlobeAltIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { adminAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, PageHeader, Button } from '../components/ui'

interface LoginLocationTenantSummary {
  tenantId: string;
  tenantName: string;
  eventCount: number;
}

interface LoginLocationItem {
  ipAddress: string;
  successfulLogins: number;
  failedLogins: number;
  visitEvents: number;
  totalEvents: number;
  firstSeenAt: string;
  lastSeenAt: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  geoSource: 'provider' | 'private' | 'invalid' | 'unavailable';
  tenantCount: number;
  tenants: LoginLocationTenantSummary[];
}

interface LoginLocationsResponse {
  scope: 'global' | 'tenant';
  generatedAt: string;
  days: number;
  summary: {
    totalDistinctIps: number;
    totalSuccessfulLogins: number;
    totalFailedLogins: number;
    totalVisitEvents: number;
    totalEvents: number;
  };
  locations: LoginLocationItem[];
}

interface MapPoint {
  ipAddress: string;
  longitude: number;
  latitude: number;
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  displayLocation: string;
}

const timeWindowOptions = [1, 7, 30, 90];
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 520;

const projectLon = (longitude: number): number => ((longitude + 180) / 360) * MAP_WIDTH;
const projectLat = (latitude: number): number => ((90 - latitude) / 180) * MAP_HEIGHT;

const continents = [
  // North America
  'M85 145 L125 95 L220 75 L300 95 L290 140 L240 165 L175 205 L125 210 L95 180 Z',
  // South America
  'M235 245 L275 275 L285 340 L265 410 L235 470 L195 440 L190 380 L215 315 Z',
  // Europe + Asia
  'M430 105 L485 85 L565 90 L635 80 L730 95 L810 120 L875 150 L885 185 L840 205 L775 225 L710 215 L665 200 L625 170 L575 155 L525 145 L475 155 L440 130 Z',
  // Africa
  'M500 180 L555 195 L590 240 L600 305 L570 365 L530 395 L485 365 L470 305 L485 245 Z',
  // Australia
  'M770 350 L835 365 L870 405 L840 445 L780 450 L740 420 L745 380 Z',
  // Greenland
  'M305 55 L345 35 L390 45 L375 75 L330 82 Z',
]

const LoginLocationsPage: React.FC = () => {
  const { user } = useAuth()
  const [days, setDays] = useState<number>(30)
  const [queryText, setQueryText] = useState('')

  const canView = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')

  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    ['login-locations', days],
    async () => {
      const response = await adminAPI.getLoginLocations({ days, limit: 400 })
      return response.data.data as LoginLocationsResponse
    },
    { enabled: canView }
  )

  const filteredLocations = useMemo(() => {
    const locations = data?.locations || []
    const search = queryText.trim().toLowerCase()
    if (!search) return locations
    return locations.filter((item) => {
      const haystack = [
        item.ipAddress,
        item.country || '',
        item.region || '',
        item.city || '',
        ...item.tenants.map((tenant) => tenant.tenantName),
      ].join(' ').toLowerCase()
      return haystack.includes(search)
    })
  }, [data?.locations, queryText])

  const mapPoints = useMemo<MapPoint[]>(() => {
    return filteredLocations
      .filter((item) => typeof item.latitude === 'number' && typeof item.longitude === 'number')
      .map((item) => ({
        ipAddress: item.ipAddress,
        latitude: item.latitude as number,
        longitude: item.longitude as number,
        totalEvents: item.totalEvents,
        successfulLogins: item.successfulLogins,
        failedLogins: item.failedLogins,
        displayLocation: [item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown location',
      }))
  }, [filteredLocations])

  if (!canView) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="cgr-page-container">
          <Card className="p-6">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p>You do not have permission to view login locations.</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="cgr-page-container space-y-6">
        <PageHeader
          title="Login Locations"
          subtitle="Interactive view of where users are logging in and generating activity."
          icon={GlobeAltIcon}
          actions={(
            <div className="flex items-center gap-2">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                {timeWindowOptions.map((value) => (
                  <option key={value} value={value}>
                    Last {value} day{value > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <Button onClick={() => refetch()} disabled={isFetching}>
                <ArrowPathIcon className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Card className="p-4 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Distinct IPs</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{data?.summary.totalDistinctIps ?? 0}</p>
          </Card>
          <Card className="p-4 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Successful Logins</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{data?.summary.totalSuccessfulLogins ?? 0}</p>
          </Card>
          <Card className="p-4 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Failed Logins</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700 dark:text-rose-300">{data?.summary.totalFailedLogins ?? 0}</p>
          </Card>
          <Card className="p-4 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Visit Events</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{data?.summary.totalVisitEvents ?? 0}</p>
          </Card>
          <Card className="p-4 md:col-span-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Window</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{days}d</p>
          </Card>
        </div>

        <Card className="p-4">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Interactive Map</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bubble size reflects total events. Hover points for IP and login detail.
              </p>
            </div>
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Filter by IP, city, region, country, tenant..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 md:w-96 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {isLoading ? (
            <div className="flex h-[420px] items-center justify-center text-gray-500 dark:text-gray-400">Loading login locations...</div>
          ) : isError ? (
            <div className="flex h-[420px] items-center justify-center text-rose-600 dark:text-rose-300">Failed to load login locations.</div>
          ) : (
            <div className="h-[500px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-b from-slate-100 via-sky-100 to-slate-200 p-2 dark:border-gray-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
              <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full">
                <defs>
                  <pattern id="graticulePattern" width="83.33" height="86.66" patternUnits="userSpaceOnUse">
                    <path d="M 83.33 0 L 0 0 0 86.66" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                  </pattern>
                </defs>

                <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#graticulePattern)" className="text-slate-500 dark:text-slate-400" />

                <g>
                  {continents.map((pathData) => (
                    <path
                      key={pathData}
                      d={pathData}
                      className="fill-slate-300 stroke-slate-500 dark:fill-slate-700 dark:stroke-slate-500"
                      strokeWidth="1.25"
                    />
                  ))}
                </g>

                {mapPoints.map((point) => {
                  const x = projectLon(point.longitude)
                  const y = projectLat(point.latitude)
                  const radius = Math.max(4, Math.min(20, 4 + Math.sqrt(point.totalEvents)))
                  const fill = point.failedLogins > 0 ? '#f43f5e' : '#2563eb'

                  return (
                    <g key={point.ipAddress}>
                      <circle cx={x} cy={y} r={radius} fill={fill} fillOpacity="0.68" stroke="#0f172a" strokeOpacity="0.45" strokeWidth="1.2">
                        <title>
                          {`${point.displayLocation} (${point.ipAddress}) | Successful: ${point.successfulLogins} | Failed: ${point.failedLogins} | Events: ${point.totalEvents}`}
                        </title>
                      </circle>
                    </g>
                  )
                })}
              </svg>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                  Successful only
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Includes failed logins
                </span>
                <span>Bubble size = total events from IP</span>
              </div>
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Location / IP</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Logins</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Visit Events</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Last Seen</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Tenant Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-800 dark:bg-gray-900">
                {filteredLocations.map((item) => {
                  const locationLabel = [item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown location'
                  const tenantLabel = item.tenants.slice(0, 2).map((tenant) => tenant.tenantName).join(', ')
                  return (
                    <tr key={item.ipAddress} className="align-top">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{locationLabel}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{item.ipAddress}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        <span className="text-emerald-700 dark:text-emerald-300">{item.successfulLogins}</span>
                        {' / '}
                        <span className="text-rose-700 dark:text-rose-300">{item.failedLogins}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">{item.visitEvents}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {format(new Date(item.lastSeenAt), 'PPpp')}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {item.tenantCount > 0 ? tenantLabel : data?.scope === 'tenant' ? (user?.tenant?.name || 'Current tenant') : 'Unknown'}
                        {item.tenantCount > 2 ? ` +${item.tenantCount - 2} more` : ''}
                      </td>
                    </tr>
                  )
                })}
                {filteredLocations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No location data found for this filter window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generated: {data ? format(new Date(data.generatedAt), 'PPpp') : 'n/a'}
        </p>
      </div>
    </div>
  )
}

export default LoginLocationsPage
