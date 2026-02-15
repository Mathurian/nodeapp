# Running Grafana and Prometheus Without Docker

This guide explains how to install and run Grafana and Prometheus natively (without Docker) on Ubuntu/Debian systems.

## Prerequisites

- Ubuntu/Debian Linux system
- Root or sudo access
- Systemd (standard on most modern Linux distributions)

## Installation Methods

### Method 1: Using Official APT Repositories (Recommended)

#### Install Prometheus

```bash
# Add Prometheus repository
sudo apt-get update
sudo apt-get install -y apt-transport-https software-properties-common

# Add Prometheus GPG key
wget -q -O - https://prometheus.io/download/prometheus-release.gpg | sudo apt-key add -

# Add Prometheus repository (for Ubuntu 22.04)
echo "deb https://prometheus.io/download/prometheus-release focal main" | sudo tee /etc/apt/sources.list.d/prometheus.list

# Update and install Prometheus
sudo apt-get update
sudo apt-get install -y prometheus prometheus-node-exporter
```

**Alternative: Direct Download**
```bash
# Download latest Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-amd64.tar.gz
tar xvfz prometheus-2.48.0.linux-amd64.tar.gz
sudo mv prometheus-2.48.0.linux-amd64 /opt/prometheus
sudo useradd --no-create-home --shell /bin/false prometheus
sudo chown -R prometheus:prometheus /opt/prometheus
```

#### Install Grafana

```bash
# Add Grafana repository
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"

# Add Grafana GPG key
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -

# Update and install Grafana
sudo apt-get update
sudo apt-get install -y grafana
```

**Alternative: Direct Download**
```bash
# Download latest Grafana
cd /tmp
wget https://dl.grafana.com/oss/release/grafana_10.2.0_amd64.deb
sudo dpkg -i grafana_10.2.0_amd64.deb
```

## Configuration

### 1. Prometheus Configuration

Create/edit `/etc/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'event-manager'

scrape_configs:
  - job_name: 'event-manager-api'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3000']
        labels:
          service: 'event-manager-api'
          environment: 'production'

  - job_name: 'prometheus'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9090']
```

**Or copy from project:**
```bash
sudo cp /var/www/event-manager/prometheus/prometheus.yml /etc/prometheus/prometheus.yml
sudo chown prometheus:prometheus /etc/prometheus/prometheus.yml
```

### 2. Grafana Configuration

Edit `/etc/grafana/grafana.ini`:

```ini
[server]
# Protocol (http, https, h2, socket)
protocol = http

# The ip address to bind to, empty will bind to all interfaces
http_addr = 127.0.0.1

# The http port to use
http_port = 3001

# The public facing domain name used to access grafana from a browser
domain = conmgr.com

# The full public facing url
root_url = http://conmgr.com/monitoring/grafana/

# Serve Grafana from subpath specified in `root_url` setting. By default it is set to `false`.
serve_from_sub_path = true

[security]
# disable creation of admin user on first start of grafana
admin_user = admin
admin_password = admin

# disable user signup / registration
disable_signup_menu = true
allow_sign_up = false
```

**Key settings for reverse proxy:**
- `root_url`: Must match your nginx location path
- `serve_from_sub_path`: Set to `true` for subpath proxying
- `http_port`: Set to `3001` (or your preferred port)
- `http_addr`: Set to `127.0.0.1` to only listen on localhost

### 3. Create Systemd Service Files

#### Prometheus Service

Create `/etc/systemd/system/prometheus.service`:

```ini
[Unit]
Description=Prometheus Monitoring System
Documentation=https://prometheus.io/docs/introduction/overview/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=prometheus
Group=prometheus
Restart=always
RestartSec=5
ExecStart=/usr/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus \
    --web.console.libraries=/usr/share/prometheus/console_libraries \
    --web.console.templates=/usr/share/prometheus/consoles \
    --web.external-url=http://conmgr.com/monitoring/prometheus/ \
    --web.route-prefix=/ \
    --web.listen-address=127.0.0.1:9090

[Install]
WantedBy=multi-user.target
```

**If installed manually:**
```ini
[Unit]
Description=Prometheus Monitoring System
After=network-online.target

[Service]
Type=simple
User=prometheus
Group=prometheus
Restart=always
ExecStart=/opt/prometheus/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus \
    --web.external-url=http://conmgr.com/monitoring/prometheus/ \
    --web.route-prefix=/ \
    --web.listen-address=127.0.0.1:9090

[Install]
WantedBy=multi-user.target
```

#### Grafana Service

Grafana typically installs its own systemd service. Verify it exists:

```bash
sudo systemctl status grafana-server
```

If it doesn't exist, create `/etc/systemd/system/grafana-server.service`:

```ini
[Unit]
Description=Grafana Server
Documentation=http://docs.grafana.org
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
User=grafana
Group=grafana
RuntimeDirectory=grafana
RuntimeDirectoryMode=0750
WorkingDirectory=/usr/share/grafana
ExecStart=/usr/sbin/grafana-server \
    --config=/etc/grafana/grafana.ini \
    --pidfile=/var/run/grafana-server.pid \
    --packaging=deb

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 4. Set Up Data Directories

```bash
# Prometheus data directory
sudo mkdir -p /var/lib/prometheus
sudo chown prometheus:prometheus /var/lib/prometheus

# Grafana data directory (usually created automatically)
sudo mkdir -p /var/lib/grafana
sudo chown grafana:grafana /var/lib/grafana
```

## Starting the Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services to start on boot
sudo systemctl enable prometheus
sudo systemctl enable grafana-server

# Start services
sudo systemctl start prometheus
sudo systemctl start grafana-server

# Check status
sudo systemctl status prometheus
sudo systemctl status grafana-server
```

## Verification

```bash
# Check Prometheus is running
curl http://localhost:9090/api/v1/status/config

# Check Grafana is running
curl http://localhost:3001/api/health

# View logs
sudo journalctl -u prometheus -f
sudo journalctl -u grafana-server -f
```

## Grafana Initial Setup

1. Access Grafana: `http://conmgr.com/monitoring/grafana/`
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin`
3. Change the password when prompted
4. Add Prometheus datasource:
   - Go to Configuration → Data Sources → Add data source
   - Select Prometheus
   - URL: `http://localhost:9090`
   - Click "Save & Test"

## Configuration Files Location

- **Prometheus config**: `/etc/prometheus/prometheus.yml`
- **Prometheus data**: `/var/lib/prometheus`
- **Grafana config**: `/etc/grafana/grafana.ini`
- **Grafana data**: `/var/lib/grafana`
- **Grafana provisioning**: `/etc/grafana/provisioning/`

## Copy Provisioning Files (Optional)

If you want to use the same provisioning as Docker setup:

```bash
# Copy Grafana provisioning
sudo cp -r /var/www/event-manager/grafana/provisioning/* /etc/grafana/provisioning/
sudo chown -R grafana:grafana /etc/grafana/provisioning/

# Restart Grafana
sudo systemctl restart grafana-server
```

## Troubleshooting

### Prometheus won't start
- Check logs: `sudo journalctl -u prometheus -n 50`
- Verify config: `promtool check config /etc/prometheus/prometheus.yml`
- Check permissions: `sudo chown -R prometheus:prometheus /var/lib/prometheus`

### Grafana won't start
- Check logs: `sudo journalctl -u grafana-server -n 50`
- Verify config: `sudo grafana-server --config=/etc/grafana/grafana.ini --pidfile=/tmp/grafana.pid --packaging=deb cfg:default.paths.logs=/var/log/grafana`
- Check permissions: `sudo chown -R grafana:grafana /var/lib/grafana`

### Can't access via nginx
- Verify services are listening: `sudo netstat -tlnp | grep -E "9090|3001"`
- Check nginx config: `sudo nginx -t`
- Check nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Port conflicts
- If port 3001 is in use, change Grafana port in `/etc/grafana/grafana.ini`
- If port 9090 is in use, change Prometheus port in systemd service file

## Advantages of Native Installation

1. **No Docker dependency** - Works on systems without Docker
2. **Better integration** - Native systemd services
3. **Easier updates** - Use standard package managers
4. **Better performance** - No container overhead
5. **Simpler debugging** - Direct access to logs and processes

## Migration from Docker

If you're currently using Docker and want to migrate:

1. **Stop Docker containers:**
   ```bash
   cd /var/www/event-manager
   docker-compose -f docker-compose.monitoring.yml down
   ```

2. **Backup data (optional):**
   ```bash
   # Backup Prometheus data
   docker cp event-manager-prometheus:/prometheus /tmp/prometheus-backup
   
   # Backup Grafana data
   docker cp event-manager-grafana:/var/lib/grafana /tmp/grafana-backup
   ```

3. **Install native versions** (follow installation steps above)

4. **Restore data (if backed up):**
   ```bash
   sudo cp -r /tmp/prometheus-backup/* /var/lib/prometheus/
   sudo cp -r /tmp/grafana-backup/* /var/lib/grafana/
   sudo chown -R prometheus:prometheus /var/lib/prometheus
   sudo chown -R grafana:grafana /var/lib/grafana
   ```

5. **Start services:**
   ```bash
   sudo systemctl start prometheus grafana-server
   ```

## Maintenance

### Update Prometheus
```bash
sudo apt-get update
sudo apt-get upgrade prometheus
sudo systemctl restart prometheus
```

### Update Grafana
```bash
sudo apt-get update
sudo apt-get upgrade grafana
sudo systemctl restart grafana-server
```

### Backup Data
```bash
# Backup Prometheus
sudo tar -czf /backup/prometheus-$(date +%Y%m%d).tar.gz /var/lib/prometheus

# Backup Grafana
sudo tar -czf /backup/grafana-$(date +%Y%m%d).tar.gz /var/lib/grafana
```


