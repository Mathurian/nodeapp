# CDN Configuration Guide

## Overview

This document provides instructions for configuring a Content Delivery Network (CDN) to serve static assets for the Event Manager application. A CDN improves performance by caching static content closer to users geographically.

## Supported CDN Providers

- **AWS CloudFront** (Recommended for AWS deployments)
- **Cloudflare** (Recommended for general use)
- **Azure CDN** (For Azure deployments)
- **Google Cloud CDN** (For GCP deployments)

---

## Static Asset Configuration

The application is pre-configured to serve static assets with appropriate caching headers:

### Backend Configuration

**File:** `src/server.ts`

```typescript
// Static assets (production only)
if (process.env.NODE_ENV === 'production') {
  const frontendDistPath = path.join(__dirname, '../frontend/dist');

  // Serve static assets with 1-year cache
  app.use(express.static(frontendDistPath, {
    maxAge: '1y',  // Cache for 1 year
    immutable: true,
    etag: true,
    lastModified: true,
  }));
}

// Uploads with 7-day cache
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
}));
```

### Asset Types & Cache Duration

| Asset Type | Path Pattern | Cache Duration | Reasoning |
|------------|-------------|----------------|-----------|
| JavaScript bundles | `/assets/*.js` | 1 year | Versioned via hash |
| CSS files | `/assets/*.css` | 1 year | Versioned via hash |
| Images (static) | `/assets/images/*` | 1 year | Rarely change |
| Fonts | `/assets/fonts/*` | 1 year | Rarely change |
| Uploaded files | `/uploads/*` | 7 days | May be updated |
| API responses | `/api/*` | 0 (no cache) | Dynamic content |
| Index.html | `/index.html` | 0 (no cache) | Entry point |

---

## AWS CloudFront Configuration

### Prerequisites

- AWS Account with CloudFront permissions
- Origin server (EC2, ECS, or ALB)
- SSL certificate (via ACM)

### CloudFormation Template

**File:** `infrastructure/cloudfront.yml`

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: CloudFront distribution for Event Manager System

Parameters:
  OriginDomain:
    Type: String
    Description: Origin domain (e.g., api.eventmanager.com)

  CertificateArn:
    Type: String
    Description: ACM certificate ARN for CloudFront

Resources:
  # CloudFront Distribution
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        Comment: Event Manager CDN

        # Aliases (custom domains)
        Aliases:
          - cdn.eventmanager.com

        # SSL Configuration
        ViewerCertificate:
          AcmCertificateArn: !Ref CertificateArn
          SslSupportMethod: sni-only
          MinimumProtocolVersion: TLSv1.2_2021

        # Default cache behavior (for HTML/index)
        DefaultCacheBehavior:
          TargetOriginId: EventManagerOrigin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
            - PUT
            - POST
            - PATCH
            - DELETE
          CachedMethods:
            - GET
            - HEAD
          Compress: true
          CachePolicyId: !Ref DefaultCachePolicy
          OriginRequestPolicyId: !Ref DefaultOriginRequestPolicy

        # Cache behaviors for different asset types
        CacheBehaviors:
          # Static assets - long cache (1 year)
          - PathPattern: '/assets/*'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            Compress: true
            CachePolicyId: !Ref LongCachePolicy

          # Uploads - medium cache (7 days)
          - PathPattern: '/uploads/*'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            Compress: true
            CachePolicyId: !Ref MediumCachePolicy

          # API requests - no cache
          - PathPattern: '/api/*'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            AllowedMethods:
              - GET
              - HEAD
              - OPTIONS
              - PUT
              - POST
              - PATCH
              - DELETE
            CachePolicyId: !Ref NoCachePolicy
            OriginRequestPolicyId: !Ref DefaultOriginRequestPolicy

          # Metrics endpoint - no cache
          - PathPattern: '/metrics'
            TargetOriginId: EventManagerOrigin
            ViewerProtocolPolicy: https-only
            CachePolicyId: !Ref NoCachePolicy

        # Origins
        Origins:
          - Id: EventManagerOrigin
            DomainName: !Ref OriginDomain
            CustomOriginConfig:
              HTTPPort: 80
              HTTPSPort: 443
              OriginProtocolPolicy: https-only
              OriginSSLProtocols:
                - TLSv1.2

        # Price class (use all edge locations)
        PriceClass: PriceClass_All

        # HTTP version
        HttpVersion: http2and3

  # Long cache policy (1 year)
  LongCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-LongCache
        Comment: Long cache for versioned static assets
        DefaultTTL: 31536000 # 1 year
        MaxTTL: 31536000
        MinTTL: 31536000
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: none
          HeadersConfig:
            HeaderBehavior: none
          CookiesConfig:
            CookieBehavior: none

  # Medium cache policy (7 days)
  MediumCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-MediumCache
        Comment: Medium cache for uploads
        DefaultTTL: 604800 # 7 days
        MaxTTL: 604800
        MinTTL: 0
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: none
          HeadersConfig:
            HeaderBehavior: none
          CookiesConfig:
            CookieBehavior: none

  # No cache policy (for API/dynamic content)
  NoCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-NoCache
        Comment: No cache for dynamic content
        DefaultTTL: 0
        MaxTTL: 0
        MinTTL: 0
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: all
          HeadersConfig:
            HeaderBehavior: whitelist
            Headers:
              - Authorization
              - Accept
              - Content-Type
              - Origin
          CookiesConfig:
            CookieBehavior: all

  # Default cache policy (for HTML)
  DefaultCachePolicy:
    Type: AWS::CloudFront::CachePolicy
    Properties:
      CachePolicyConfig:
        Name: EventManager-DefaultCache
        Comment: Default cache for HTML files
        DefaultTTL: 3600 # 1 hour
        MaxTTL: 86400 # 1 day
        MinTTL: 0
        ParametersInCacheKeyAndForwardedToOrigin:
          EnableAcceptEncodingGzip: true
          EnableAcceptEncodingBrotli: true
          QueryStringsConfig:
            QueryStringBehavior: none
          HeadersConfig:
            HeaderBehavior: none
          CookiesConfig:
            CookieBehavior: none

  # Default origin request policy
  DefaultOriginRequestPolicy:
    Type: AWS::CloudFront::OriginRequestPolicy
    Properties:
      OriginRequestPolicyConfig:
        Name: EventManager-DefaultOriginRequest
        Comment: Forward necessary headers and cookies
        QueryStringsConfig:
          QueryStringBehavior: all
        HeadersConfig:
          HeaderBehavior: whitelist
          Headers:
            - Authorization
            - Accept
            - Content-Type
            - Origin
            - Referer
            - User-Agent
        CookiesConfig:
          CookieBehavior: all

Outputs:
  DistributionId:
    Description: CloudFront Distribution ID
    Value: !Ref CloudFrontDistribution

  DistributionDomain:
    Description: CloudFront Distribution Domain
    Value: !GetAtt CloudFrontDistribution.DomainName

  DistributionURL:
    Description: CloudFront Distribution URL
    Value: !Sub 'https://${CloudFrontDistribution.DomainName}'
```

### Deploy CloudFront

```bash
aws cloudformation create-stack \
  --stack-name event-manager-cdn \
  --template-body file://infrastructure/cloudfront.yml \
  --parameters \
    ParameterKey=OriginDomain,ParameterValue=api.eventmanager.com \
    ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:us-east-1:123456789012:certificate/abc123
```

---

## Cloudflare Configuration

### Prerequisites

- Cloudflare account
- Domain managed by Cloudflare DNS

### Setup Steps

1. **Add Origin Server**
   - Go to Cloudflare Dashboard
   - Navigate to DNS settings
   - Add A/CNAME record pointing to your origin server

2. **Configure Page Rules**

```
Rule 1: Static Assets (Long Cache)
  URL Pattern: *eventmanager.com/assets/*
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 1 year
    - Browser Cache TTL: 1 year

Rule 2: Uploads (Medium Cache)
  URL Pattern: *eventmanager.com/uploads/*
  Settings:
    - Cache Level: Cache Everything
    - Edge Cache TTL: 7 days
    - Browser Cache TTL: 7 days

Rule 3: API Requests (No Cache)
  URL Pattern: *eventmanager.com/api/*
  Settings:
    - Cache Level: Bypass
    - Disable Apps
    - Disable Performance

Rule 4: Metrics (No Cache)
  URL Pattern: *eventmanager.com/metrics
  Settings:
    - Cache Level: Bypass
```

3. **Enable HTTP/3**
   - Go to Network settings
   - Enable HTTP/3 (with QUIC)
   - Enable 0-RTT Connection Resumption

4. **Enable Brotli Compression**
   - Go to Speed > Optimization
   - Enable Brotli

5. **Configure SSL**
   - Go to SSL/TLS settings
   - Set encryption mode to "Full (strict)"
   - Enable Always Use HTTPS

### Cloudflare Workers (Optional Enhancement)

For advanced caching logic:

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)

  // Bypass cache for API requests
  if (url.pathname.startsWith('/api/')) {
    return fetch(request)
  }

  // Long cache for static assets
  if (url.pathname.startsWith('/assets/')) {
    const cache = caches.default
    let response = await cache.match(request)

    if (!response) {
      response = await fetch(request)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      })
      event.waitUntil(cache.put(request, response.clone()))
    }

    return response
  }

  // Default behavior
  return fetch(request)
}
```

---

## Azure CDN Configuration

### Prerequisites

- Azure subscription
- Azure Storage Account or App Service

### Setup via Azure CLI

```bash
# Create CDN profile
az cdn profile create \
  --resource-group event-manager-rg \
  --name event-manager-cdn \
  --sku Standard_Microsoft

# Create CDN endpoint
az cdn endpoint create \
  --resource-group event-manager-rg \
  --profile-name event-manager-cdn \
  --name event-manager \
  --origin api.eventmanager.com \
  --origin-host-header api.eventmanager.com \
  --enable-compression true \
  --content-types-to-compress \
    text/html \
    text/css \
    application/javascript \
    application/json

# Add caching rules
az cdn endpoint rule add \
  --resource-group event-manager-rg \
  --profile-name event-manager-cdn \
  --endpoint-name event-manager \
  --order 1 \
  --rule-name "StaticAssets" \
  --match-variable UrlPath \
  --operator BeginsWith \
  --match-values "/assets/" \
  --action-name CacheExpiration \
  --cache-behavior Override \
  --cache-duration "365.00:00:00"
```

---

## Performance Verification

### 1. Test Cache Headers

```bash
# Check static asset headers
curl -I https://cdn.eventmanager.com/assets/main.js

# Expected headers:
# Cache-Control: public, max-age=31536000, immutable
# CF-Cache-Status: HIT (for Cloudflare)
# X-Cache: Hit from cloudfront (for AWS)
```

### 2. Monitor Cache Hit Ratio

**CloudFront:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E123ABC456DEF \
  --statistics Average \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600
```

**Cloudflare:**
- Go to Analytics > Traffic
- View "Cached Requests" metric
- Target: >85% cache hit ratio

### 3. Performance Testing

```bash
# Test from multiple locations
curl -w "@curl-format.txt" -o /dev/null -s https://cdn.eventmanager.com/assets/main.js

# curl-format.txt:
#   time_namelookup:  %{time_namelookup}\n
#   time_connect:     %{time_connect}\n
#   time_starttransfer: %{time_starttransfer}\n
#   time_total:       %{time_total}\n
```

---

## Cache Invalidation

### CloudFront Invalidation

```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E123ABC456DEF \
  --paths "/index.html" "/assets/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id E123ABC456DEF \
  --id I1234ABCD5678
```

### Cloudflare Purge

```bash
# Purge everything
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://eventmanager.com/assets/main.js"]}'
```

---

## Frontend Asset Versioning

The Vite build system automatically versions assets with content hashes:

```
dist/assets/main-abc123.js
dist/assets/main-abc123.css
dist/assets/logo-def456.png
```

This ensures:
- Old cached versions don't conflict with new deploys
- Aggressive caching (1 year) is safe
- Automatic cache busting on content changes

---

## Environment Variables

Add to `.env`:

```bash
# CDN Configuration
CDN_ENABLED=true
CDN_URL=https://cdn.eventmanager.com
CDN_ASSETS_PATH=/assets

# CloudFront specific
CLOUDFRONT_DISTRIBUTION_ID=E123ABC456DEF
AWS_REGION=us-east-1

# Cloudflare specific
CLOUDFLARE_ZONE_ID=abc123def456
CLOUDFLARE_API_TOKEN=your_token_here
```

Update frontend config to use CDN URLs:

**File:** `frontend/vite.config.ts`

```typescript
export default defineConfig({
  base: process.env.CDN_URL || '/',
  build: {
    // ...
  }
});
```

---

## Monitoring & Alerts

### CloudWatch Alarms (for CloudFront)

```yaml
CacheHitRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: CDN-Low-Cache-Hit-Rate
    MetricName: CacheHitRate
    Namespace: AWS/CloudFront
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 70
    ComparisonOperator: LessThanThreshold
    AlarmActions:
      - !Ref AlertTopic

4xxErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: CDN-High-4xx-Error-Rate
    MetricName: 4xxErrorRate
    Namespace: AWS/CloudFront
    Statistic: Average
    Period: 300
    EvaluationPeriods: 2
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref AlertTopic
```

---

## Best Practices

1. **Always version static assets** - Use content hashing
2. **Set appropriate cache durations** - Balance freshness vs. performance
3. **Enable compression** - Brotli > Gzip > None
4. **Use HTTP/2 or HTTP/3** - Multiplexing and better performance
5. **Monitor cache hit ratios** - Target >85% for static assets
6. **Implement cache warming** - Pre-populate CDN after deploys
7. **Use separate domains** - Avoid cookie overhead on static assets
8. **Enable CORS properly** - For cross-origin requests
9. **Implement invalidation strategies** - Clear cache on deploys
10. **Test from multiple regions** - Ensure global performance

---

## Troubleshooting

### Low Cache Hit Ratio

**Possible causes:**
- Query parameters in URLs
- Cookies being forwarded
- Vary headers on origin
- Cache duration too short

**Solutions:**
- Strip unnecessary query params
- Don't forward cookies for static assets
- Review origin headers
- Increase cache TTL

### CORS Errors

**Solution:**
Add to origin server (Express):

```typescript
app.use('/assets', cors({
  origin: process.env.CDN_URL,
  credentials: false
}));
```

### Stale Content After Deploy

**Solution:**
Implement automated invalidation in CI/CD:

```bash
# In deploy script
if [ "$CDN_PROVIDER" = "cloudfront" ]; then
  aws cloudfront create-invalidation \
    --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
    --paths "/*"
fi
```

---

## Cost Optimization

### CloudFront

- Use Regional Edge Caches
- Select appropriate price class
- Monitor data transfer costs
- Implement origin shield for high-traffic origins

### Cloudflare

- Free tier includes unlimited bandwidth for most sites
- Paid tiers add performance features
- Workers have free tier (100k requests/day)

---

## Additional Resources

- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [Cloudflare CDN Documentation](https://developers.cloudflare.com/cache/)
- [Azure CDN Documentation](https://docs.microsoft.com/en-us/azure/cdn/)
- [HTTP Caching Best Practices](https://web.dev/http-cache/)
- [Cache-Control Header Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
