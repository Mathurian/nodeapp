import axios from 'axios';

export interface GeoLocationResult {
  ip: string;
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  source: 'provider' | 'private' | 'invalid' | 'unavailable';
}

interface CachedGeoLocationResult {
  data: GeoLocationResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, CachedGeoLocationResult>();

const DEFAULT_PROVIDER_TEMPLATE = 'https://ipapi.co/{ip}/json/';
const REQUEST_TIMEOUT_MS = 1500;

const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
};

const isPrivateIp = (ip: string): boolean => {
  if (isPrivateIpv4(ip)) return true;
  const normalized = ip.toLowerCase();
  return (
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80:')
  );
};

const stripQuotes = (value: string): string => value.replace(/^"(.*)"$/, '$1');

const normalizeForwardedIpToken = (value: string): string => {
  let ip = stripQuotes(value.trim());
  if (!ip) return '';

  if (ip.toLowerCase().startsWith('for=')) {
    ip = stripQuotes(ip.slice(4).trim());
  }

  if (ip.startsWith('[')) {
    const endIdx = ip.indexOf(']');
    if (endIdx > 0) {
      ip = ip.slice(1, endIdx);
    }
  }

  if (ip.toLowerCase().startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(ip)) {
    ip = ip.replace(/:\d+$/, '');
  }

  if (ip.includes('%')) {
    ip = ip.split('%')[0] || ip;
  }

  if (ip.toLowerCase() === 'unknown') {
    return '';
  }

  return ip.trim();
};

export const normalizeIpAddress = (rawIp?: string | null): string => {
  if (!rawIp) return '';
  const trimmed = rawIp.trim();
  if (!trimmed) return '';
  const firstToken = trimmed.split(',')[0] || '';
  return normalizeForwardedIpToken(firstToken);
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export const getGeoLocationForIp = async (rawIp?: string | null): Promise<GeoLocationResult> => {
  const ip = normalizeIpAddress(rawIp);
  if (!ip) {
    return { ip: '', source: 'invalid' };
  }

  if (isPrivateIp(ip)) {
    return { ip, source: 'private' };
  }

  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const providerTemplate = process.env['IP_GEOLOCATION_PROVIDER_URL'] || DEFAULT_PROVIDER_TEMPLATE;
  const providerUrl = providerTemplate.includes('{ip}')
    ? providerTemplate.replace('{ip}', encodeURIComponent(ip))
    : `${providerTemplate}${encodeURIComponent(ip)}`;

  try {
    const response = await axios.get(providerUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        Accept: 'application/json',
      },
      params: process.env['IP_GEOLOCATION_API_KEY']
        ? { apiKey: process.env['IP_GEOLOCATION_API_KEY'] }
        : undefined,
    });

    const body = response.data || {};
    const result: GeoLocationResult = {
      ip,
      country: body.country_name || body.country || body.countryName,
      countryCode: body.country_code || body.countryCode,
      region: body.region || body.region_name || body.regionName,
      city: body.city,
      latitude: parseNumber(body.latitude ?? body.lat),
      longitude: parseNumber(body.longitude ?? body.lon),
      source: 'provider',
    };

    cache.set(ip, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch {
    const fallback: GeoLocationResult = { ip, source: 'unavailable' };
    cache.set(ip, { data: fallback, expiresAt: Date.now() + 5 * 60 * 1000 });
    return fallback;
  }
};
