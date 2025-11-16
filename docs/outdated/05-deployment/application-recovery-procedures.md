# Application Recovery Procedures

## Scenario 1: Application Server Failure

### Quick Recovery
```bash
# Restart application
sudo systemctl restart event-manager

# Check status
sudo systemctl status event-manager
curl http://localhost:5000/api/health

# If restart fails, check logs
sudo journalctl -u event-manager -n 50
```

### Full Recovery
```bash
# Rebuild from source
cd /var/www/event-manager
git pull origin main
npm install
npm run build
sudo systemctl restart event-manager
```

**Time**: 5-15 minutes | **Data Loss**: None

---

## Scenario 2: Corrupted Application Files

### Recovery Steps
```bash
# Stop application
sudo systemctl stop event-manager

# Restore from git
cd /var/www/event-manager
git reset --hard HEAD
git clean -fd

# Or restore from backup
tar -xzf /var/backups/event-manager/full/latest.tar.gz configs.tar
tar -xf configs.tar -C /

# Reinstall dependencies
npm install

# Restart
npm run build
sudo systemctl start event-manager
```

**Time**: 15-30 minutes | **Data Loss**: None

---

## Scenario 3: Configuration Issues

### Recovery Steps
```bash
# Restore .env from backup
sudo tar -xzf /var/backups/event-manager/full/latest.tar.gz configs.tar
sudo tar -xf configs.tar .env -C /var/www/event-manager/

# Or use backup .env
sudo cp /var/www/event-manager/.env.backup /var/www/event-manager/.env

# Restart application
sudo systemctl restart event-manager
```

**Time**: 5 minutes | **Data Loss**: None

---

## Verification Checklist

- [ ] Application running
- [ ] Health endpoint responds
- [ ] Users can authenticate
- [ ] Database queries work
- [ ] File uploads functional
- [ ] No error logs
