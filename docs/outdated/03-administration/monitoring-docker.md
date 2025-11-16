# Monitoring Setup Guide - Grafana and Prometheus

## Overview
This guide explains how to configure Grafana and Prometheus to be accessible via the web (not just localhost) through nginx reverse proxy.

## Changes Required

### 1. Grafana Configuration

Grafana needs to be configured to work behind a reverse proxy with a subpath. The following environment variables must be set in `docker-compose.monitoring.yml`:

```yaml
environment:
  - GF_SERVER_ROOT_URL=http://localhost:3001/monitoring/grafana/
  - GF_SERVER_SERVE_FROM_SUB_PATH=true
  - GF_SERVER_DOMAIN=localhost
  - GF_SERVER_ALLOW_EMBEDDING=true
```

**Key Settings:**
- `GF_SERVER_ROOT_URL`: The full URL where Grafana will be accessible (including subpath)
- `GF_SERVER_SERVE_FROM_SUB_PATH`: Enables subpath serving (required for `/monitoring/grafana/`)
- `GF_SERVER_DOMAIN`: Domain name for Grafana (set to your actual domain in production)
- `GF_SERVER_ALLOW_EMBEDDING`: Allows Grafana to be embedded in iframes (optional)

**For Production:**
Replace `localhost` with your actual domain:
```yaml
- GF_SERVER_ROOT_URL=https://conmgr.com/monitoring/grafana/
- GF_SERVER_DOMAIN=conmgr.com
```

### 2. Prometheus Configuration

Prometheus needs the `--web.external-url` flag to be set. Add this to the command section:

```yaml
command:
  - '--config.file=/etc/prometheus/prometheus.yml'
  - '--storage.tsdb.path=/prometheus'
  - '--web.console.libraries=/usr/share/prometheus/console_libraries'
  - '--web.console.templates=/usr/share/prometheus/consoles'
  - '--web.external-url=http://localhost:9090'
  - '--web.route-prefix=/'
```

**Key Settings:**
- `--web.external-url`: The external URL where Prometheus will be accessible
- `--web.route-prefix`: Route prefix (usually `/` for subpath proxying)

**For Production:**
Replace `localhost` with your actual domain:
```yaml
- '--web.external-url=https://conmgr.com/monitoring/prometheus/'
```

### 3. Nginx Configuration

The nginx configuration has already been set up with reverse proxy locations:

- **Grafana**: `/monitoring/grafana/` → `http://127.0.0.1:3001/`
- **Prometheus**: `/monitoring/prometheus/` → `http://127.0.0.1:9090/`

The nginx config includes:
- Proper proxy headers
- WebSocket support (for Grafana live updates)
- Path rewriting
- Extended timeouts

### 4. Grafana Datasource Configuration

The Grafana datasource configuration (`grafana/provisioning/datasources/prometheus.yml`) uses the internal Docker network URL:

```yaml
url: http://prometheus:9090
```

This is correct for internal communication within Docker. Grafana will use this URL to query Prometheus.

## Deployment Steps

1. **Update docker-compose.monitoring.yml** with the configuration above

2. **Restart the monitoring containers:**
   ```bash
   cd /var/www/event-manager
   docker-compose -f docker-compose.monitoring.yml down
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

3. **Verify nginx configuration:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Access the services:**
   - Grafana: `https://conmgr.com/monitoring/grafana/` (or `http://localhost:3001` directly)
   - Prometheus: `https://conmgr.com/monitoring/prometheus/` (or `http://localhost:9090` directly)

## Troubleshooting

### Grafana shows blank page or 404 errors
- Check that `GF_SERVER_SERVE_FROM_SUB_PATH=true` is set
- Verify `GF_SERVER_ROOT_URL` matches the nginx location path
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Prometheus redirects incorrectly
- Verify `--web.external-url` matches the nginx location
- Check that nginx rewrite rules are correct

### WebSocket connections fail (Grafana live updates)
- Ensure nginx has `proxy_set_header Upgrade $http_upgrade` and `proxy_set_header Connection "upgrade"`
- Check that nginx proxy_read_timeout is sufficient (300s recommended)

### CORS errors
- Grafana and Prometheus should handle CORS automatically when behind nginx
- If issues persist, check nginx CORS headers configuration

## Security Considerations

1. **Authentication**: Grafana has built-in authentication (admin/admin by default). Change the default password!
2. **HTTPS**: In production, ensure SSL/TLS is configured in nginx
3. **Access Control**: Consider restricting access to monitoring endpoints via nginx location blocks with IP whitelisting or authentication
4. **Firewall**: Ensure ports 3001 and 9090 are not exposed publicly (only accessible via nginx)

## Example Production Configuration

```yaml
# docker-compose.monitoring.yml (production)
grafana:
  environment:
    - GF_SERVER_ROOT_URL=https://conmgr.com/monitoring/grafana/
    - GF_SERVER_SERVE_FROM_SUB_PATH=true
    - GF_SERVER_DOMAIN=conmgr.com
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=<strong-password>
    - GF_USERS_ALLOW_SIGN_UP=false

prometheus:
  command:
    - '--web.external-url=https://conmgr.com/monitoring/prometheus/'
```

## Additional Resources

- [Grafana Reverse Proxy Documentation](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#serve-from-sub-path)
- [Prometheus Reverse Proxy Documentation](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#web)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)


