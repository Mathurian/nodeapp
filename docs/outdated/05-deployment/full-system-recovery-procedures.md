# Full System Recovery Procedures

## Complete Infrastructure Loss Scenario

### Prerequisites
- Remote backup access
- New server/infrastructure
- Backup files available

### Recovery Steps

#### Phase 1: Infrastructure Setup (30-60 minutes)

```bash
# 1. Provision new server (Ubuntu 22.04 LTS)
# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install dependencies
sudo apt install -y nodejs npm postgresql nginx git curl

# 4. Create application user
sudo useradd -m -s /bin/bash eventmanager
```

#### Phase 2: Restore Database (60-90 minutes)

```bash
# 1. Initialize PostgreSQL
sudo systemctl start postgresql

# 2. Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE event_manager;
CREATE USER eventmanager WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE event_manager TO eventmanager;
EOF

# 3. Download backup from remote
aws s3 cp s3://your-bucket/backups/latest.tar.gz /tmp/

# 4. Extract and restore
cd /tmp
tar -xzf latest.tar.gz
sudo -u postgres pg_restore -d event_manager database.sql
```

#### Phase 3: Restore Application (30-45 minutes)

```bash
# 1. Clone repository or restore from backup
sudo git clone https://github.com/your-org/event-manager.git /var/www/event-manager

# 2. Restore uploads from backup
tar -xzf uploads.tar -C /var/www/event-manager/

# 3. Restore configuration
tar -xzf configs.tar -C /var/www/event-manager/

# 4. Install dependencies
cd /var/www/event-manager
npm install
npm run build

# 5. Set permissions
sudo chown -R eventmanager:eventmanager /var/www/event-manager
```

#### Phase 4: Configure Services (15-30 minutes)

```bash
# 1. Create systemd service
sudo cat > /etc/systemd/system/event-manager.service << EOF
[Unit]
Description=Event Manager Application
After=network.target postgresql.service

[Service]
Type=simple
User=eventmanager
WorkingDirectory=/var/www/event-manager
ExecStart=/usr/bin/node dist/server.js
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 2. Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable event-manager
sudo systemctl start event-manager

# 3. Configure nginx
sudo cp /var/www/event-manager/nginx.conf /etc/nginx/sites-available/event-manager
sudo ln -s /etc/nginx/sites-available/event-manager /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

#### Phase 5: Verification (15 minutes)

```bash
# Test database
sudo -u postgres psql -d event_manager -c "SELECT count(*) FROM \"User\";"

# Test application
curl http://localhost:5000/api/health

# Test through nginx
curl http://your-domain.com/api/health
```

#### Phase 6: Restore Backups System (15 minutes)

```bash
# Setup PITR
sudo /var/www/event-manager/scripts/setup-pitr.sh

# Setup cron jobs
sudo /var/www/event-manager/scripts/setup-cron.sh

# Run test backup
sudo /var/www/event-manager/scripts/backup-full.sh
```

### Total Recovery Time: 3-4 hours

---

## Natural Disaster / Data Center Loss

### Additional Steps

1. **Update DNS records** to point to new infrastructure
2. **Update SSL certificates**
3. **Notify users** of temporary service URL if DNS not propagated
4. **Monitor closely** for 48 hours after recovery

### Recovery Priority

1. Database restoration (highest priority)
2. Application restoration
3. File uploads
4. Monitoring and logging
5. Backup system

---

## Post-Recovery Checklist

- [ ] Database restored and accessible
- [ ] Application running
- [ ] All services started
- [ ] SSL/TLS configured
- [ ] DNS updated
- [ ] Backups running
- [ ] Monitoring active
- [ ] Users notified
- [ ] Performance acceptable
- [ ] Documentation updated
