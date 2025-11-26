# CDN Setup Guide

**Last Updated:** November 25, 2025
**Status:** Ready for Implementation
**Provider:** Cloudflare (Free Tier)

---

## Overview

This guide covers setting up Cloudflare CDN for static asset delivery to improve performance and reduce server load.

---

## Benefits

- **50%+ reduction in TTFB** for static assets
- **90%+ cache hit rate** after warmup
- **Reduced server load** by offloading static files
- **Global edge network** - faster delivery worldwide
- **Free SSL/TLS** included
- **DDoS protection** included
- **Web Application Firewall (WAF)** available

---

## Prerequisites

- Domain name (e.g., `eventmanager.com`)
- Cloudflare account (free tier)
- Access to DNS settings

---

## Step 1: Cloudflare Account Setup

### 1.1 Create Account

1. Go to https://www.cloudflare.com
2. Click "Sign Up" (free tier)
3. Enter email and create password
4. Verify email address

### 1.2 Add Site

1. Click "Add a Site"
2. Enter your domain: `eventmanager.com`
3. Select "Free" plan
4. Click "Continue"

### 1.3 DNS Configuration

Cloudflare will scan your existing DNS records.

1. Verify all DNS records are correct
2. Add any missing records
3. Note the Cloudflare nameservers provided

### 1.4 Update Nameservers

At your domain registrar:
1. Replace existing nameservers with Cloudflare nameservers
2. Save changes
3. Wait for propagation (up to 24 hours, usually faster)

---

## Step 2: Cloudflare Configuration

### 2.1 SSL/TLS Settings

**Path:** SSL/TLS > Overview

1. Set encryption mode to **"Full (strict)"**
2. Enable **"Always Use HTTPS"**
3. Enable **"Automatic HTTPS Rewrites"**

**Edge Certificates:**
- Enable **"Always Use HTTPS"**
- Enable **"HTTP Strict Transport Security (HSTS)"**

### 2.2 Caching Configuration

**Path:** Caching > Configuration

**Cache Level:** Standard

**Browser Cache TTL:** 4 hours

**Always Online™:** ON

**Development Mode:** OFF (use only when testing)

### 2.3 Page Rules

**Path:** Rules > Page Rules

Create the following page rules:

#### Rule 1: Static Assets (Aggressive Caching)
**URL:** `*eventmanager.com/assets/*`

**Settings:**
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month
- Origin Cache Control: ON

#### Rule 2: API Bypass
**URL:** `*eventmanager.com/api/*`

**Settings:**
- Cache Level: Bypass
- Disable Security
- Disable Performance

#### Rule 3: Frontend Build Assets
**URL:** `*eventmanager.com/dist/*`

**Settings:**
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 month

### 2.4 Speed Optimization

**Path:** Speed > Optimization

Enable:
- ✅ **Auto Minify:** HTML, CSS, JavaScript
- ✅ **Brotli:** ON
- ✅ **Early Hints:** ON
- ✅ **Rocket Loader:** OFF (can break React apps)

---

## Step 3: Application Configuration

### 3.1 Environment Variables

Add to `.env`:

```bash
# CDN Configuration
CDN_ENABLED=true
CDN_URL=https://cdn.eventmanager.com
CDN_ASSET_PATH=/assets

# Asset URLs will use CDN when enabled
# Local: http://localhost:3000/assets/logo.png
# Production with CDN: https://cdn.eventmanager.com/assets/logo.png
```

### 3.2 Backend Configuration

**File:** `src/config/cdn.ts` (create new file)

```typescript
export const cdnConfig = {
  enabled: process.env.CDN_ENABLED === 'true',
  url: process.env.CDN_URL || '',
  assetPath: process.env.CDN_ASSET_PATH || '/assets',

  /**
   * Get full asset URL (with CDN if enabled)
   */
  getAssetUrl(path: string): string {
    if (!this.enabled) {
      return path;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    return `${this.url}/${cleanPath}`;
  },

  /**
   * Get cache headers for static assets
   */
  getCacheHeaders(immutable = false): Record<string, string> {
    if (immutable) {
      // For hashed assets (e.g., main.abc123.js)
      return {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
      };
    } else {
      // For non-hashed assets
      return {
        'Cache-Control': 'public, max-age=3600',
        'CDN-Cache-Control': 'public, max-age=86400',
      };
    }
  },
};
```

### 3.3 Frontend Configuration

**File:** `frontend/vite.config.ts`

Update the build configuration:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    // Enable asset hashing for cache busting
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },

  // CDN base URL for production
  base: process.env.VITE_CDN_ENABLED === 'true'
    ? process.env.VITE_CDN_URL
    : '/',
});
```

**File:** `frontend/.env.production`

```bash
VITE_CDN_ENABLED=true
VITE_CDN_URL=https://cdn.eventmanager.com
```

### 3.4 Static Asset Middleware

**File:** `src/middleware/staticAssets.ts` (create new file)

```typescript
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { cdnConfig } from '../config/cdn';

export const staticAssetsMiddleware = (app: express.Application): void => {
  // Serve static files with proper cache headers
  app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
    // Check if file has hash (immutable)
    const hasHash = /\.[a-f0-9]{8,}\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/i.test(req.url);

    // Set cache headers
    const headers = cdnConfig.getCacheHeaders(hasHash);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  }, express.static(path.join(__dirname, '../../public/assets')));

  // Serve frontend build
  app.use('/dist', (req: Request, res: Response, next: NextFunction) => {
    const hasHash = /\.[a-f0-9]{8,}\.(js|css)$/i.test(req.url);
    const headers = cdnConfig.getCacheHeaders(hasHash);

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    next();
  }, express.static(path.join(__dirname, '../../frontend/dist')));
};
```

**File:** `src/app.ts`

Add the middleware:

```typescript
import { staticAssetsMiddleware } from './middleware/staticAssets';

// ... other middleware

// Serve static assets with CDN-friendly headers
staticAssetsMiddleware(app);
```

---

## Step 4: Cache Purging

### 4.1 Manual Purge (Cloudflare Dashboard)

**Path:** Caching > Configuration

**Options:**
- **Purge Everything:** Clears entire cache (use carefully)
- **Purge by URL:** Clear specific files
- **Purge by Tag:** Clear tagged resources (requires Enterprise plan)

### 4.2 Automated Purge on Deploy

**File:** `.github/workflows/deploy.yml`

Add cache purge step:

```yaml
- name: Purge Cloudflare Cache
  run: |
    curl -X POST "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

**Required Secrets:**
- `CLOUDFLARE_ZONE_ID`: Get from Cloudflare dashboard (Overview tab)
- `CLOUDFLARE_API_TOKEN`: Create at My Profile > API Tokens

### 4.3 Programmatic Cache Purge

**File:** `src/utils/cdn.ts`

```typescript
import axios from 'axios';

export async function purgeCDNCache(urls?: string[]): Promise<void> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!zoneId || !apiToken) {
    console.warn('Cloudflare credentials not configured');
    return;
  }

  const payload = urls
    ? { files: urls }
    : { purge_everything: true };

  await axios.post(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
    payload,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('CDN cache purged successfully');
}
```

---

## Step 5: Testing

### 5.1 Test CDN Delivery

1. **Check HTTP Headers:**
   ```bash
   curl -I https://cdn.eventmanager.com/assets/logo.png
   ```

   Expected headers:
   - `cf-cache-status: HIT` (after first request)
   - `cache-control: public, max-age=31536000, immutable`
   - `cf-ray: ...` (Cloudflare served it)

2. **Test Cache HIT/MISS:**
   ```bash
   # First request (MISS - fetches from origin)
   curl -I https://cdn.eventmanager.com/assets/logo.png | grep cf-cache-status
   # Output: cf-cache-status: MISS

   # Second request (HIT - served from cache)
   curl -I https://cdn.eventmanager.com/assets/logo.png | grep cf-cache-status
   # Output: cf-cache-status: HIT
   ```

3. **Test Different Locations:**
   Use tools like:
   - https://tools.pingdom.com/ (test from multiple locations)
   - https://www.webpagetest.org/ (detailed performance analysis)

### 5.2 Verify Asset Loading

1. Open browser DevTools (Network tab)
2. Load your application
3. Check static assets:
   - Should load from `cdn.eventmanager.com`
   - Should have `cf-cache-status: HIT`
   - Should have long cache headers

### 5.3 Test Cache Purge

1. Make a change to an asset
2. Deploy new version
3. Purge cache
4. Verify new asset loads

---

## Step 6: Monitoring

### 6.1 Cloudflare Analytics

**Path:** Analytics & Logs > Traffic

Monitor:
- **Requests:** Total requests served
- **Bandwidth:** Data transferred
- **Cache Hit Rate:** Percentage served from cache
- **Threats Blocked:** Security events

**Target Metrics:**
- Cache hit rate: >90%
- Bandwidth saved: >60%
- TTFB improvement: >50%

### 6.2 Application Monitoring

Add CDN metrics to monitoring dashboard:

```typescript
// In MetricsService
private cdnCacheHitRate: Gauge;

constructor() {
  this.cdnCacheHitRate = new Gauge({
    name: 'cdn_cache_hit_rate',
    help: 'CDN cache hit rate percentage',
  });
}

async updateCDNMetrics(): Promise<void> {
  // Fetch from Cloudflare API
  const stats = await this.fetchCloudflareStats();
  this.cdnCacheHitRate.set(stats.cacheHitRate);
}
```

---

## Troubleshooting

### Issue: Assets not loading from CDN

**Symptoms:** Assets still load from origin server

**Solutions:**
1. Check DNS propagation: `dig cdn.eventmanager.com`
2. Verify page rules are active
3. Clear browser cache
4. Check Cloudflare development mode is OFF

### Issue: Stale content after deploy

**Symptoms:** Old version of assets served

**Solutions:**
1. Purge Cloudflare cache
2. Check cache headers are correct
3. Use versioned assets (e.g., `logo.v2.png`)
4. Implement proper cache busting

### Issue: Low cache hit rate

**Symptoms:** cf-cache-status shows MISS frequently

**Solutions:**
1. Check cache headers allow caching
2. Verify page rules are configured
3. Check if query strings are preventing caching
4. Increase cache TTL

---

## Cost Optimization

### Free Tier Limits
- Bandwidth: Unlimited
- Requests: Unlimited
- Cache purge: 1,000 per day
- Page rules: 3 rules

**Recommendation:** Free tier is sufficient for most applications

### When to Upgrade
Consider paid plans ($20-200/month) if you need:
- More than 3 page rules
- Image optimization
- Advanced DDoS protection
- Load balancing
- Custom SSL certificates

---

## Security Considerations

### 1. CORS Configuration
If serving fonts or assets cross-origin:

**File:** `src/middleware/cors.ts`

```typescript
app.use('/assets', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
});
```

### 2. Content Security Policy

Update CSP headers to allow CDN:

```typescript
res.setHeader(
  'Content-Security-Policy',
  `default-src 'self'; img-src 'self' https://cdn.eventmanager.com; script-src 'self' https://cdn.eventmanager.com`
);
```

### 3. Subresource Integrity (SRI)

For critical assets, use SRI hashes:

```html
<script
  src="https://cdn.eventmanager.com/assets/main.abc123.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous">
</script>
```

---

## Rollback Plan

If CDN causes issues:

1. **Immediate:** Set `CDN_ENABLED=false` in environment
2. **Redeploy:** Application will serve assets directly
3. **DNS:** Change CNAME to point directly to origin
4. **Investigate:** Check Cloudflare logs and metrics

---

## Next Steps

After CDN is stable:

1. **Implement Image Optimization** (resize, WebP conversion)
2. **Set up Workers** for edge computing
3. **Enable Argo Smart Routing** for faster origin connections
4. **Implement rate limiting** at CDN edge
5. **Set up WAF rules** for enhanced security

---

## Related Documentation

- **Performance Optimization:** `docs/PERFORMANCE.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`
- **Security Policy:** `docs/SECURITY.md`

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-25 | Initial documentation | Claude Code |

---

*Next Review: 2026-02-25*
