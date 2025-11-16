#!/bin/bash
# Install Prometheus and Grafana natively (without Docker)
# Run with sudo

set -e

echo "Installing Prometheus and Grafana natively..."

# Update system
apt-get update
apt-get install -y apt-transport-https software-properties-common wget

# Install Prometheus
echo "Installing Prometheus..."
if ! command -v prometheus &> /dev/null; then
    # Try to add Prometheus repository
    if [ ! -f /etc/apt/sources.list.d/prometheus.list ]; then
        wget -q -O - https://prometheus.io/download/prometheus-release.gpg | apt-key add - || true
        echo "deb https://prometheus.io/download/prometheus-release focal main" > /etc/apt/sources.list.d/prometheus.list || true
    fi
    
    # If repository method fails, use direct download
    if ! apt-get update 2>/dev/null || ! apt-get install -y prometheus 2>/dev/null; then
        echo "Repository method failed, using direct download..."
        cd /tmp
        PROM_VERSION="2.48.0"
        wget -q https://github.com/prometheus/prometheus/releases/download/v${PROM_VERSION}/prometheus-${PROM_VERSION}.linux-amd64.tar.gz
        tar xfz prometheus-${PROM_VERSION}.linux-amd64.tar.gz
        mv prometheus-${PROM_VERSION}.linux-amd64 /opt/prometheus
        useradd --no-create-home --shell /bin/false prometheus || true
        chown -R prometheus:prometheus /opt/prometheus
        ln -sf /opt/prometheus/prometheus /usr/local/bin/prometheus
        ln -sf /opt/prometheus/promtool /usr/local/bin/promtool
    fi
fi

# Install Grafana
echo "Installing Grafana..."
if ! command -v grafana-server &> /dev/null; then
    # Add Grafana repository
    wget -q -O - https://packages.grafana.com/gpg.key | apt-key add - || true
    echo "deb https://packages.grafana.com/oss/deb stable main" > /etc/apt/sources.list.d/grafana.list || true
    
    if ! apt-get update 2>/dev/null || ! apt-get install -y grafana 2>/dev/null; then
        echo "Repository method failed, using direct download..."
        cd /tmp
        GRAFANA_VERSION="10.2.0"
        wget -q https://dl.grafana.com/oss/release/grafana_${GRAFANA_VERSION}_amd64.deb
        dpkg -i grafana_${GRAFANA_VERSION}_amd64.deb || apt-get install -f -y
    fi
fi

# Create directories
echo "Creating directories..."
mkdir -p /var/lib/prometheus
mkdir -p /etc/prometheus
mkdir -p /var/lib/grafana
chown -R prometheus:prometheus /var/lib/prometheus /etc/prometheus || true
chown -R grafana:grafana /var/lib/grafana || true

# Copy Prometheus config
if [ -f /var/www/event-manager/prometheus/prometheus.yml ]; then
    echo "Copying Prometheus configuration..."
    cp /var/www/event-manager/prometheus/prometheus.yml /etc/prometheus/prometheus.yml
    chown prometheus:prometheus /etc/prometheus/prometheus.yml
fi

# Configure Grafana
echo "Configuring Grafana..."
GRAFANA_INI="/etc/grafana/grafana.ini"
if [ -f "$GRAFANA_INI" ]; then
    # Backup original
    cp "$GRAFANA_INI" "${GRAFANA_INI}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update key settings
    sed -i 's|^http_port = .*|http_port = 3001|' "$GRAFANA_INI"
    sed -i 's|^domain = .*|domain = conmgr.com|' "$GRAFANA_INI"
    sed -i 's|^root_url = .*|root_url = http://conmgr.com/monitoring/grafana/|' "$GRAFANA_INI"
    sed -i 's|^serve_from_sub_path = .*|serve_from_sub_path = true|' "$GRAFANA_INI"
    sed -i 's|^http_addr = .*|http_addr = 127.0.0.1|' "$GRAFANA_INI"
    
    # Add settings if they don't exist
    if ! grep -q "^serve_from_sub_path" "$GRAFANA_INI"; then
        echo "serve_from_sub_path = true" >> "$GRAFANA_INI"
    fi
fi

# Copy Grafana provisioning if it exists
if [ -d /var/www/event-manager/grafana/provisioning ]; then
    echo "Copying Grafana provisioning files..."
    cp -r /var/www/event-manager/grafana/provisioning/* /etc/grafana/provisioning/ 2>/dev/null || true
    chown -R grafana:grafana /etc/grafana/provisioning/ || true
fi

# Setup Prometheus systemd service
echo "Setting up Prometheus systemd service..."
if [ -f /var/www/event-manager/scripts/prometheus.service ]; then
    cp /var/www/event-manager/scripts/prometheus.service /etc/systemd/system/prometheus.service
    # Adjust paths if using manual installation
    if [ -f /opt/prometheus/prometheus ]; then
        sed -i 's|/usr/bin/prometheus|/opt/prometheus/prometheus|' /etc/systemd/system/prometheus.service
    fi
fi

# Enable and start services
echo "Enabling and starting services..."
systemctl daemon-reload
systemctl enable prometheus || true
systemctl enable grafana-server || true
systemctl restart prometheus || true
systemctl restart grafana-server || true

echo ""
echo "Installation complete!"
echo ""
echo "Services status:"
systemctl status prometheus --no-pager | head -3 || true
systemctl status grafana-server --no-pager | head -3 || true
echo ""
echo "Access Grafana at: http://conmgr.com/monitoring/grafana/"
echo "Access Prometheus at: http://conmgr.com/monitoring/prometheus/"
echo ""
echo "Default Grafana credentials: admin/admin (change on first login)"


