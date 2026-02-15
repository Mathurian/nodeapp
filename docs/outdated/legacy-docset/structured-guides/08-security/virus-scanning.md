# Virus Scanning Guide

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage](#usage)
- [Quarantine Management](#quarantine-management)
- [Administration](#administration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Event Manager application uses ClamAV for real-time virus scanning of all uploaded files, providing comprehensive malware protection.

### Benefits

- **Security**: 100% malware protection on file uploads
- **Automatic**: All uploads scanned automatically
- **Quarantine**: Infected files isolated and tracked
- **Monitoring**: Admin visibility into threats
- **Configurable**: Flexible fallback strategies

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│   Backend    │────▶│   ClamAV    │
│  (Upload)   │     │  (Validate)  │     │   (Scan)    │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                           │ Infected?
                           ▼
                    ┌──────────────┐
                    │  Quarantine  │
                    │  Directory   │
                    └──────────────┘
```

---

## Quick Start

### 1. Start ClamAV with Docker

```bash
# Using Docker Compose
docker-compose up -d clamav

# Wait for initialization (2-3 minutes)
docker-compose logs -f clamav | grep "clamd is ready"

# Verify ClamAV is running
docker-compose ps clamav
```

### 2. Configure Environment

```bash
# .env
CLAMAV_ENABLED=true
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
CLAMAV_TIMEOUT=60000
CLAMAV_MAX_FILE_SIZE=52428800  # 50MB
QUARANTINE_PATH=./quarantine
SCAN_ON_UPLOAD=true
REMOVE_INFECTED=true
NOTIFY_ON_INFECTION=true
CLAMAV_FALLBACK_BEHAVIOR=allow
```

### 3. Create Quarantine Directory

```bash
mkdir -p ./quarantine
chmod 700 ./quarantine
```

### 4. Use in Your Code

```typescript
import { strictVirusScan } from './middleware/virusScanMiddleware';

// Add to file upload route
app.post('/api/upload',
  upload.single('file'),
  strictVirusScan,  // Blocks infected files
  uploadController.handleUpload
);
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAMAV_ENABLED` | `false` | Enable/disable virus scanning |
| `CLAMAV_HOST` | `localhost` | ClamAV server hostname |
| `CLAMAV_PORT` | `3310` | ClamAV server port |
| `CLAMAV_TIMEOUT` | `60000` | Scan timeout in milliseconds |
| `CLAMAV_MAX_FILE_SIZE` | `52428800` | Max file size to scan (50MB) |
| `QUARANTINE_PATH` | `./quarantine` | Path for quarantined files |
| `SCAN_ON_UPLOAD` | `true` | Scan files on upload |
| `REMOVE_INFECTED` | `true` | Delete infected files after quarantine |
| `NOTIFY_ON_INFECTION` | `true` | Send notifications on infection |
| `CLAMAV_FALLBACK_BEHAVIOR` | `allow` | Behavior when ClamAV unavailable: `allow` or `reject` |

### Scan Status Types

```typescript
export enum ScanStatus {
  CLEAN = 'clean',          // File is safe
  INFECTED = 'infected',    // Virus detected
  ERROR = 'error',          // Scan failed
  SKIPPED = 'skipped',      // Scan not performed
  TOO_LARGE = 'too_large',  // File exceeds size limit
}
```

---

## Usage

### Middleware Integration

#### Strict Scanning (Recommended for Production)

```typescript
import { strictVirusScan } from './middleware/virusScanMiddleware';

// Blocks on infection OR scan error
app.post('/api/upload',
  upload.single('file'),
  strictVirusScan,
  uploadController.handleUpload
);
```

#### Lenient Scanning

```typescript
import { lenientVirusScan } from './middleware/virusScanMiddleware';

// Only blocks on infection, continues on scan error
app.post('/api/upload',
  upload.single('file'),
  lenientVirusScan,
  uploadController.handleUpload
);
```

#### Custom Configuration

```typescript
import { virusScanMiddleware } from './middleware/virusScanMiddleware';

app.post('/api/upload',
  upload.single('file'),
  virusScanMiddleware({
    deleteOnInfection: true,  // Delete infected files
    blockOnError: false,      // Continue if scan fails
    scanBuffers: false,       // Scan from file path, not buffer
  }),
  uploadController.handleUpload
);
```

#### Multiple Files

```typescript
import { scanMultipleFiles } from './middleware/virusScanMiddleware';

app.post('/api/bulk-upload',
  upload.array('files', 10),
  scanMultipleFiles({ deleteOnInfection: true }),
  uploadController.handleBulkUpload
);
```

### Direct Service Usage

#### Scan File from Path

```typescript
import { getVirusScanService } from './services/VirusScanService';

const virusScanService = getVirusScanService();

// Scan file
const result = await virusScanService.scanFile('/path/to/file.pdf');

// Check result
if (result.status === ScanStatus.INFECTED) {
  console.error('Virus detected:', result.virus);
  // File automatically moved to quarantine
} else if (result.status === ScanStatus.CLEAN) {
  console.log('File is safe');
}

// Access scan details
console.log('Scan duration:', result.duration, 'ms');
console.log('File size:', result.size, 'bytes');
```

#### Scan Buffer

```typescript
const buffer = fs.readFileSync('/path/to/file');
const result = await virusScanService.scanBuffer(buffer, 'filename.pdf');

if (result.status === ScanStatus.INFECTED) {
  console.error('Virus detected in buffer:', result.virus);
}
```

#### Check ClamAV Availability

```typescript
const isAvailable = await virusScanService.isAvailable();

if (!isAvailable) {
  console.warn('ClamAV is not available');
  // Handle fallback behavior
}
```

### Scan Results

```typescript
interface ScanResult {
  status: ScanStatus;
  virus?: string;           // Virus name if infected
  file: string;             // File path or name
  size: number;             // File size in bytes
  scannedAt: Date;          // Scan timestamp
  duration: number;         // Scan duration in ms
  error?: string;           // Error message if failed
}
```

#### Example Scan Results

```typescript
// Clean file
{
  status: 'clean',
  file: '/uploads/document.pdf',
  size: 1024000,
  scannedAt: new Date(),
  duration: 234
}

// Infected file
{
  status: 'infected',
  virus: 'Win.Test.EICAR_HDB-1',
  file: '/uploads/malware.exe',
  size: 512,
  scannedAt: new Date(),
  duration: 156
}

// Error
{
  status: 'error',
  file: '/uploads/document.pdf',
  size: 0,
  scannedAt: new Date(),
  duration: 45,
  error: 'File not found'
}
```

---

## Quarantine Management

### Automatic Quarantine

When an infected file is detected:

1. File is copied to quarantine directory
2. Metadata is saved (original path, scan result, timestamp)
3. Original file is deleted (if `REMOVE_INFECTED=true`)
4. Admin notification is sent (if `NOTIFY_ON_INFECTION=true`)

### Quarantine Directory Structure

```
./quarantine/
├── 1731412800000_malware.exe
├── 1731412800000_malware.exe.json  # Metadata
├── 1731412850000_virus.pdf
└── 1731412850000_virus.pdf.json
```

### Metadata File Example

```json
{
  "originalPath": "/uploads/document.pdf",
  "scanResult": {
    "status": "infected",
    "virus": "Win.Test.EICAR_HDB-1",
    "file": "/uploads/document.pdf",
    "size": 512,
    "scannedAt": "2025-11-12T10:00:00.000Z",
    "duration": 156
  },
  "quarantinedAt": "2025-11-12T10:00:00.123Z"
}
```

### List Quarantined Files

```typescript
const virusScanService = getVirusScanService();
const quarantinedFiles = virusScanService.listQuarantinedFiles();

console.log('Quarantined files:', quarantinedFiles);
// ['1731412800000_malware.exe', '1731412850000_virus.pdf']
```

### Get Quarantine Metadata

```typescript
const metadata = virusScanService.getQuarantineMetadata('1731412800000_malware.exe');

console.log('Original path:', metadata.originalPath);
console.log('Virus name:', metadata.scanResult.virus);
console.log('Quarantined at:', metadata.quarantinedAt);
```

### Delete Quarantined File

```typescript
const success = virusScanService.deleteQuarantinedFile('1731412800000_malware.exe');

if (success) {
  console.log('Quarantined file deleted');
}
```

---

## Administration

### Health Check

```bash
# Check ClamAV availability
curl http://localhost:3000/api/admin/virus-scan/health

# Response:
{
  "success": true,
  "data": {
    "available": true,
    "status": "connected"
  }
}
```

### Scan Statistics

```bash
# Get scan statistics
curl http://localhost:3000/api/admin/virus-scan/statistics

# Response:
{
  "success": true,
  "data": {
    "cacheSize": 150,
    "config": {
      "enabled": true,
      "host": "localhost",
      "port": 3310,
      "timeout": 60000,
      "maxFileSize": 52428800,
      "scanOnUpload": true
    }
  }
}
```

### List Quarantined Files

```bash
# List all quarantined files
curl http://localhost:3000/api/admin/virus-scan/quarantine

# Response:
{
  "success": true,
  "data": [
    {
      "filename": "1731412800000_malware.exe",
      "originalPath": "/uploads/malware.exe",
      "scanResult": {
        "status": "infected",
        "virus": "Win.Test.EICAR_HDB-1",
        "size": 512
      },
      "quarantinedAt": "2025-11-12T10:00:00.123Z"
    }
  ]
}
```

### Get Quarantined File Details

```bash
# Get specific file details
curl http://localhost:3000/api/admin/virus-scan/quarantine/1731412800000_malware.exe

# Response:
{
  "success": true,
  "data": {
    "originalPath": "/uploads/malware.exe",
    "scanResult": { ... },
    "quarantinedAt": "2025-11-12T10:00:00.123Z"
  }
}
```

### Delete Quarantined File

```bash
# Delete specific quarantined file
curl -X DELETE http://localhost:3000/api/admin/virus-scan/quarantine/1731412800000_malware.exe

# Response:
{
  "success": true,
  "message": "Quarantined file deleted successfully"
}
```

### Manual File Scan

```bash
# Scan specific file
curl -X POST http://localhost:3000/api/admin/virus-scan/scan \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/file.pdf"}'

# Response:
{
  "success": true,
  "data": {
    "status": "clean",
    "file": "/path/to/file.pdf",
    "size": 1024000,
    "scannedAt": "2025-11-12T10:00:00.000Z",
    "duration": 234
  }
}
```

### Bulk Directory Scan

```bash
# Scan all files in directory
curl -X POST http://localhost:3000/api/admin/virus-scan/bulk-scan \
  -H "Content-Type: application/json" \
  -d '{"directoryPath": "/uploads"}'

# Response:
{
  "success": true,
  "data": {
    "totalFiles": 150,
    "results": [ ... ],
    "summary": {
      "clean": 148,
      "infected": 2,
      "errors": 0,
      "skipped": 0
    }
  }
}
```

### Clear Scan Cache

```bash
# Clear result cache
curl -X POST http://localhost:3000/api/admin/virus-scan/cache/clear

# Response:
{
  "success": true,
  "message": "Scan cache cleared successfully"
}
```

---

## Best Practices

### 1. Enable Strict Scanning for Production

```typescript
// Use strict scanning in production
if (process.env.NODE_ENV === 'production') {
  app.post('/api/upload',
    upload.single('file'),
    strictVirusScan,  // Blocks on error
    uploadController.handleUpload
  );
} else {
  app.post('/api/upload',
    upload.single('file'),
    lenientVirusScan,  // Continues on error
    uploadController.handleUpload
  );
}
```

### 2. Regular Quarantine Review

```typescript
// Schedule daily quarantine review
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  const virusScanService = getVirusScanService();
  const files = virusScanService.listQuarantinedFiles();

  // Delete files older than 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const filename of files) {
    const timestamp = parseInt(filename.split('_')[0]);
    if (timestamp < thirtyDaysAgo) {
      virusScanService.deleteQuarantinedFile(filename);
    }
  }
});
```

### 3. Monitor Scan Performance

```typescript
// Track slow scans
const result = await virusScanService.scanFile(filePath);

if (result.duration > 5000) {
  console.warn('Slow virus scan:', {
    file: result.file,
    duration: result.duration,
    size: result.size
  });
}
```

### 4. Handle Scan Errors Gracefully

```typescript
async function uploadFile(file: Express.Multer.File): Promise<void> {
  try {
    const result = await virusScanService.scanFile(file.path);

    if (result.status === ScanStatus.INFECTED) {
      throw new Error(`Infected file: ${result.virus}`);
    }

    if (result.status === ScanStatus.ERROR) {
      // Log error but continue if configured
      console.error('Scan error:', result.error);

      if (process.env.CLAMAV_FALLBACK_BEHAVIOR === 'reject') {
        throw new Error('File could not be scanned');
      }
    }

    // Proceed with upload
    await saveFile(file);
  } catch (error) {
    // Clean up file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
}
```

### 5. Test with EICAR File

```typescript
// Create EICAR test file for testing
const eicarString = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
fs.writeFileSync('/tmp/eicar.txt', eicarString);

// Scan test file
const result = await virusScanService.scanFile('/tmp/eicar.txt');

console.log('EICAR test result:', result);
// Should detect: Win.Test.EICAR_HDB-1
```

---

## Troubleshooting

### Problem: ClamAV Not Starting

**Symptoms:**
- Health check fails
- "ClamAV unavailable" errors
- Container keeps restarting

**Solutions:**

1. **Check Docker logs:**
```bash
docker-compose logs clamav
```

2. **Wait for initialization:**
ClamAV takes 2-3 minutes to download virus definitions and start.

```bash
# Wait for ready message
docker-compose logs -f clamav | grep "clamd is ready"
```

3. **Increase memory:**
ClamAV requires at least 2GB RAM.

```yaml
# docker-compose.yml
clamav:
  mem_limit: 2g
  memswap_limit: 2g
```

4. **Disable freshclam temporarily:**
```yaml
clamav:
  environment:
    - CLAMAV_NO_FRESHCLAM=true
```

### Problem: Scan Timeouts

**Symptoms:**
- Scan timeout errors
- Large files fail to scan

**Solutions:**

1. **Increase timeout:**
```bash
CLAMAV_TIMEOUT=120000  # 2 minutes
```

2. **Increase max file size:**
```bash
CLAMAV_MAX_FILE_SIZE=104857600  # 100MB
```

3. **Configure ClamAV limits:**
```bash
# Inside ClamAV container
echo "MaxFileSize 100M" >> /etc/clamav/clamd.conf
echo "MaxScanSize 100M" >> /etc/clamav/clamd.conf
```

### Problem: High False Positive Rate

**Symptoms:**
- Clean files flagged as infected
- Legitimate software detected as malware

**Solutions:**

1. **Update virus definitions:**
```bash
docker-compose exec clamav freshclam
```

2. **Check signature database date:**
```bash
docker-compose exec clamav sigtool --info /var/lib/clamav/main.cvd
```

3. **Whitelist false positives:**
Create signature exclusion file if needed.

### Problem: Performance Issues

**Symptoms:**
- Slow file uploads
- High CPU usage
- Scan delays

**Solutions:**

1. **Enable result caching:**
The service already caches results by file hash for 1 hour.

2. **Scan in background:**
```typescript
// Scan asynchronously
app.post('/api/upload',
  upload.single('file'),
  async (req, res, next) => {
    // Save file first
    await saveFile(req.file);

    // Scan in background
    virusScanService.scanFile(req.file.path)
      .then(result => {
        if (result.status === ScanStatus.INFECTED) {
          // Handle infected file
          handleInfectedFile(req.file.path, result);
        }
      })
      .catch(console.error);

    next();
  },
  uploadController.handleUpload
);
```

3. **Limit file size:**
```typescript
// Multer file size limit
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024  // 10MB max
  }
});
```

### Problem: Quarantine Directory Full

**Symptoms:**
- Disk space warnings
- Cannot quarantine new files

**Solutions:**

1. **Clean old files:**
```bash
# Delete files older than 30 days
find ./quarantine -type f -mtime +30 -delete
```

2. **Automated cleanup:**
```typescript
// Daily cleanup cron job
cron.schedule('0 3 * * *', async () => {
  const files = virusScanService.listQuarantinedFiles();
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  for (const filename of files) {
    const timestamp = parseInt(filename.split('_')[0]);
    if (timestamp < thirtyDaysAgo) {
      virusScanService.deleteQuarantinedFile(filename);
    }
  }
});
```

3. **Configure retention policy:**
```bash
QUARANTINE_RETENTION_DAYS=30
```

---

## Additional Resources

- [ClamAV Documentation](https://docs.clamav.net/)
- [EICAR Test File](https://www.eicar.org/?page_id=3950)
- [Event Manager Health Check](http://localhost:3000/health)
- [Virus Scan Admin API](http://localhost:3000/api/admin/virus-scan/health)

---

**Last Updated:** November 12, 2025
**Version:** 1.0.0
