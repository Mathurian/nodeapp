import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import {
  GlobeAltIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { adminAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, PageHeader, Button, ResponsiveTable } from '../components/ui'
import { safeFormatDate } from '../utils/dateUtils'

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

type GeoPoint = [number, number]
type GeoPolygon = GeoPoint[]
type GeoMultiPolygon = GeoPolygon[]
interface WorldFeature {
  geometry?: {
    type?: string
    coordinates?: GeoPolygon[] | GeoMultiPolygon[]
  }
}

const fallbackContinents = [
  'M85 145 L125 95 L220 75 L300 95 L290 140 L240 165 L175 205 L125 210 L95 180 Z',
  'M235 245 L275 275 L285 340 L265 410 L235 470 L195 440 L190 380 L215 315 Z',
  'M430 105 L485 85 L565 90 L635 80 L730 95 L810 120 L875 150 L885 185 L840 205 L775 225 L710 215 L665 200 L625 170 L575 155 L525 145 L475 155 L440 130 Z',
  'M500 180 L555 195 L590 240 L600 305 L570 365 L530 395 L485 365 L470 305 L485 245 Z',
  'M770 350 L835 365 L870 405 L840 445 L780 450 L740 420 L745 380 Z',
  'M305 55 L345 35 L390 45 L375 75 L330 82 Z',
]

const worldGeoSources = [
  'https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson',
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson',
  'https://cdn.jsdelivr.net/gh/holtzy/D3-graph-gallery@master/DATA/world.geojson',
]

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
let leafletLoaderPromise: Promise<any> | null = null

const ringToPath = (ring: GeoPolygon): string => {
  if (!Array.isArray(ring) || ring.length === 0) return ''
  const points = ring
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map(([lon, lat]) => `${projectLon(lon)} ${projectLat(lat)}`)

  if (points.length < 3) return ''
  return `M ${points.join(' L ')} Z`
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const loadLeaflet = async (): Promise<any> => {
  if ((window as any).L) return (window as any).L
  if (leafletLoaderPromise) return leafletLoaderPromise

  leafletLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-map-lib="leaflet"]') as HTMLScriptElement | null
    const existingCss = document.querySelector('link[data-map-lib="leaflet"]') as HTMLLinkElement | null

    if (!existingCss) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS_URL
      link.setAttribute('data-map-lib', 'leaflet')
      document.head.appendChild(link)
    }

    const finish = () => {
      if ((window as any).L) {
        resolve((window as any).L)
      } else {
        reject(new Error('Leaflet failed to initialize'))
      }
    }

    if (existingScript) {
      if ((window as any).L) {
        finish()
      } else {
        existingScript.addEventListener('load', finish, { once: true })
        existingScript.addEventListener('error', () => reject(new Error('Leaflet script failed to load')), { once: true })
      }
      return
    }

    const script = document.createElement('script')
    script.src = LEAFLET_JS_URL
    script.async = true
    script.setAttribute('data-map-lib', 'leaflet')
    script.onload = finish
    script.onerror = () => reject(new Error('Leaflet script failed to load'))
    document.body.appendChild(script)
  })

  return leafletLoaderPromise
}

const LoginLocationsPage: React.FC = () => {
  const { user } = useAuth()
  const [days, setDays] = useState<number>(30)
  const [queryText, setQueryText] = useState('')
  const [worldPaths, setWorldPaths] = useState<string[]>([])
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<{ point: MapPoint; x: number; y: number } | null>(null)
  const mapWrapperRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const leafletMapContainerRef = useRef<HTMLDivElement | null>(null)
  const leafletMapRef = useRef<any>(null)
  const leafletLayerRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [leafletError, setLeafletError] = useState<string | null>(null)

  const canView = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'].includes(user?.role || '')

  const { data, isLoading, isError, refetch, isFetching } = useQuery(
    ['login-locations', days],
    async () => {
      const response = await adminAPI.getLoginLocations({ days, limit: 400 })
      return response.data.data as LoginLocationsResponse
    },
    {
      enabled: canView,
      keepPreviousData: true,
    }
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

  useEffect(() => {
    let active = true

    const loadWorldMap = async () => {
      for (const url of worldGeoSources) {
        try {
          const response = await fetch(url, { cache: 'force-cache' })
          if (!response.ok) continue
          const data = await response.json()
          const features = Array.isArray(data?.features) ? (data.features as WorldFeature[]) : []
          const nextPaths: string[] = []

          for (const feature of features) {
            const geometry = feature.geometry
            if (!geometry || !Array.isArray(geometry.coordinates)) continue

            if (geometry.type === 'Polygon') {
              for (const ring of geometry.coordinates as GeoPolygon[]) {
                const path = ringToPath(ring)
                if (path) nextPaths.push(path)
              }
            } else if (geometry.type === 'MultiPolygon') {
              for (const polygon of geometry.coordinates as GeoMultiPolygon[]) {
                for (const ring of polygon) {
                  const path = ringToPath(ring)
                  if (path) nextPaths.push(path)
                }
              }
            }
          }

          if (active && nextPaths.length > 0) {
            setWorldPaths(nextPaths)
            return
          }
        } catch {
          // Try next source.
        }
      }

      if (active) {
        setWorldPaths([])
      }
    }

    void loadWorldMap()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!canView || leafletError || leafletMapRef.current) return

    let cancelled = false

    const initLeaflet = async () => {
      try {
        const L = await loadLeaflet()
        if (cancelled || leafletMapRef.current) return

        const container = leafletMapContainerRef.current
        if (!container) {
          window.requestAnimationFrame(() => {
            if (!cancelled) {
              void initLeaflet()
            }
          })
          return
        }

        const map = L.map(container, {
          worldCopyJump: true,
          zoomControl: true,
          attributionControl: true,
        }).setView([20, 0], 2)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const layer = L.layerGroup().addTo(map)
        leafletMapRef.current = map
        leafletLayerRef.current = layer
        setLeafletReady(true)
        setLeafletError(null)
      } catch (error) {
        if (cancelled) return
        setLeafletError(error instanceof Error ? error.message : 'Failed to load map')
        setLeafletReady(false)
      }
    }

    void initLeaflet()
    return () => {
      cancelled = true
    }
  }, [canView, leafletError])

  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
        leafletLayerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current || !leafletLayerRef.current) return
    const L = (window as any).L
    if (!L) return

    leafletMapRef.current.invalidateSize()

    const layer = leafletLayerRef.current
    layer.clearLayers()

    const latLngs: Array<[number, number]> = []

    for (const point of mapPoints) {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) continue
      latLngs.push([point.latitude, point.longitude])

      const radius = Math.max(4, Math.min(16, 3 + Math.sqrt(point.totalEvents)))
      const color = point.failedLogins > 0 ? '#f43f5e' : '#2563eb'
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius,
        color: '#111827',
        weight: 1,
        fillColor: color,
        fillOpacity: 0.75,
      })

      marker.bindTooltip(
        `<div><strong>${escapeHtml(point.displayLocation)}</strong><br/>${escapeHtml(point.ipAddress)}<br/>Successful: ${point.successfulLogins}<br/>Failed: ${point.failedLogins}<br/>Events: ${point.totalEvents}</div>`,
        { sticky: true, direction: 'top', opacity: 0.95 }
      )

      marker.addTo(layer)
    }

    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs)
      leafletMapRef.current.fitBounds(bounds.pad(0.25), { maxZoom: 5 })
    } else if (latLngs.length === 1) {
      leafletMapRef.current.setView(latLngs[0], 5)
    } else {
      leafletMapRef.current.setView([20, 0], 2)
    }
  }, [leafletReady, mapPoints])

  useEffect(() => {
    if (!leafletReady || !leafletMapRef.current) return
    window.requestAnimationFrame(() => {
      leafletMapRef.current?.invalidateSize()
    })
  }, [leafletReady, days])

  const applyZoomAtPoint = (targetZoom: number, centerX: number, centerY: number) => {
    const nextZoom = clamp(targetZoom, 1, 8)
    const nextPanX = centerX - ((centerX - pan.x) / zoom) * nextZoom
    const nextPanY = centerY - ((centerY - pan.y) / zoom) * nextZoom
    setZoom(nextZoom)
    setPan({ x: nextPanX, y: nextPanY })
  }

  const zoomStep = (direction: 'in' | 'out') => {
    const factor = direction === 'in' ? 1.2 : 0.83
    applyZoomAtPoint(zoom * factor, MAP_WIDTH / 2, MAP_HEIGHT / 2)
  }

  const updateTooltipPosition = (event: React.MouseEvent<SVGCircleElement>, point: MapPoint) => {
    const wrapper = mapWrapperRef.current
    if (!wrapper) return
    const rect = wrapper.getBoundingClientRect()
    setHoveredPoint({
      point,
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
    })
  }

  const handleMapWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const centerX = ((event.clientX - rect.left) / rect.width) * MAP_WIDTH
    const centerY = ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT
    const zoomFactor = event.deltaY < 0 ? 1.15 : 0.87
    applyZoomAtPoint(zoom * zoomFactor, centerX, centerY)
  }

  const handleMapMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y })
  }

  const handleMapMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!dragStart) return
    const svg = svgRef.current
    if (!svg) return

    const rect = svg.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const dx = (event.clientX - dragStart.x) * (MAP_WIDTH / rect.width)
    const dy = (event.clientY - dragStart.y) * (MAP_HEIGHT / rect.height)
    setPan({ x: dragStart.panX + dx, y: dragStart.panY + dy })
  }

  const stopMapDrag = () => {
    setDragStart(null)
  }

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

          {isError && !data ? (
            <div className="flex h-[420px] items-center justify-center text-rose-600 dark:text-rose-300">Failed to load login locations.</div>
          ) : leafletError ? (
            <div ref={mapWrapperRef} className="relative h-[500px] w-full overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-b from-slate-100 via-sky-100 to-slate-200 p-2 dark:border-gray-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
              <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md border border-gray-300 bg-white/90 p-1 shadow dark:border-gray-600 dark:bg-gray-800/90">
                <button
                  type="button"
                  onClick={() => zoomStep('in')}
                  className="rounded px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => zoomStep('out')}
                  className="rounded px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label="Zoom out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1)
                    setPan({ x: 0, y: 0 })
                  }}
                  className="rounded px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label="Reset map view"
                >
                  Reset
                </button>
              </div>

              {hoveredPoint && (
                <div
                  className="pointer-events-none absolute z-30 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900"
                  style={{ left: hoveredPoint.x, top: hoveredPoint.y }}
                >
                  <p className="font-semibold text-gray-900 dark:text-white">{hoveredPoint.point.displayLocation}</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">{hoveredPoint.point.ipAddress}</p>
                  <p className="mt-1 text-emerald-700 dark:text-emerald-300">Successful: {hoveredPoint.point.successfulLogins}</p>
                  <p className="text-rose-700 dark:text-rose-300">Failed: {hoveredPoint.point.failedLogins}</p>
                  <p className="text-gray-700 dark:text-gray-300">Events: {hoveredPoint.point.totalEvents}</p>
                </div>
              )}

              <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className={`h-full w-full select-none ${dragStart ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleMapWheel}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={stopMapDrag}
                onMouseLeave={() => {
                  stopMapDrag()
                  setHoveredPoint(null)
                }}
              >
                <defs>
                  <pattern id="graticulePattern" width="83.33" height="86.66" patternUnits="userSpaceOnUse">
                    <path d="M 83.33 0 L 0 0 0 86.66" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                  </pattern>
                </defs>

                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  <rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#graticulePattern)" className="text-slate-500 dark:text-slate-400" />
                  {(worldPaths.length > 0 ? worldPaths : fallbackContinents).map((pathData, index) => (
                    <path
                      key={`${index}-${pathData.slice(0, 24)}`}
                      d={pathData}
                      className="fill-slate-300 stroke-slate-500 dark:fill-slate-700 dark:stroke-slate-500"
                      strokeWidth={worldPaths.length > 0 ? '0.7' : '1.25'}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {mapPoints.map((point) => {
                    const x = projectLon(point.longitude)
                    const y = projectLat(point.latitude)
                    const radius = Math.max(4, Math.min(20, 4 + Math.sqrt(point.totalEvents)))
                    const fill = point.failedLogins > 0 ? '#f43f5e' : '#2563eb'

                    return (
                      <g key={point.ipAddress}>
                        <circle
                          cx={x}
                          cy={y}
                          r={radius}
                          fill={fill}
                          fillOpacity="0.68"
                          stroke="#0f172a"
                          strokeOpacity="0.45"
                          strokeWidth="1.2"
                          vectorEffect="non-scaling-stroke"
                          onMouseEnter={(event) => updateTooltipPosition(event, point)}
                          onMouseMove={(event) => updateTooltipPosition(event, point)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    )
                  })}
                </g>
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
                <span>Mouse wheel zoom, drag to pan</span>
                {leafletError && <span className="text-rose-600 dark:text-rose-300">Tile map unavailable, showing fallback map.</span>}
              </div>
            </div>
          ) : (
            <div className="login-locations-map relative isolate h-[500px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-md border border-gray-300 bg-white/90 p-1 shadow dark:border-gray-600 dark:bg-gray-800/90">
                <button
                  type="button"
                  onClick={() => {
                    const map = leafletMapRef.current
                    if (map) map.setView([20, 0], 2)
                  }}
                  className="rounded px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  aria-label="Reset map view"
                >
                  Reset
                </button>
              </div>
              {!leafletReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 text-sm text-gray-700 dark:bg-gray-900/80 dark:text-gray-200">
                  Loading interactive map...
                </div>
              )}
              {isFetching && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                  Refreshing map data...
                </div>
              )}
              <div ref={leafletMapContainerRef} className="h-full w-full" />
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <ResponsiveTable>
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
                        {safeFormatDate(item.lastSeenAt, 'PPpp')}
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
          </ResponsiveTable>
        </Card>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Generated: {data ? safeFormatDate(data.generatedAt, 'PPpp', 'n/a') : 'n/a'}
        </p>
      </div>
    </div>
  )
}

export default LoginLocationsPage
