# Phase 2: High Priority - Organize Log Files into Subfolders by Type

**Priority:** 🟠 HIGH
**Timeline:** Week 1-2 (after console replacement)
**Risk Level:** LOW-MEDIUM
**Dependencies:** 05-HIGH-CONSOLE-LOGGING.md (console replacement must be complete)
**Estimated Effort:** 4-6 hours

---

## Problem Summary

**Issue:** Log files are currently stored in a flat structure (`logs/app-{category}-{date}.log`)
**Impact:**
- **Difficult Navigation:** Hard to find logs by category/type
- **Poor Organization:** All log types mixed together
- **UI Limitations:** Log browser shows flat list without categorization
- **Maintenance Challenges:** Harder to manage, archive, or delete logs by type
- **Scalability:** As log volume grows, flat structure becomes unwieldy

**Current Structure:**
```
logs/
├── app-api-2025-11-22.log
├── app-database-2025-11-22.log
├── app-auth-2025-11-22.log
├── app-backup-2025-11-22.log
├── app-2025-11-22.log
└── ...
```

**Proposed Structure:**
```
logs/
├── api/
│   ├── app-api-2025-11-22.log
│   └── app-api-2025-11-23.log
├── database/
│   ├── app-database-2025-11-22.log
│   └── app-database-2025-11-23.log
├── auth/
│   ├── app-auth-2025-11-22.log
│   └── app-auth-2025-11-23.log
├── backup/
│   ├── app-backup-2025-11-22.log
│   └── app-backup-2025-11-23.log
├── error/
│   └── errors.json
└── general/
    ├── app-2025-11-22.log
    └── app-2025-11-23.log
```

---

## Implementation Plan

### Step 1: Update Logger to Write to Subfolders (1 hour)

**File:** `src/utils/logger.ts`

**Changes:**
1. Update `writeToFile()` function to create category subfolders
2. Map log categories to folder names:
   - `api` → `logs/api/`
   - `database` → `logs/database/`
   - `auth` → `logs/auth/`
   - `backup` → `logs/backup/`
   - `default` → `logs/general/`
   - `error` → `logs/error/`
3. Ensure backward compatibility during migration
4. Update `ensureLogDirectory()` to create subfolders

**Code Changes:**
```typescript
// In writeToFile function
const categoryFolderMap: Record<string, string> = {
  'api': 'api',
  'database': 'database',
  'auth': 'auth',
  'backup': 'backup',
  'error': 'error',
  'default': 'general'
};

const categoryFolder = categoryFolderMap[category] || 'general';
const categoryLogDir = path.join(LOG_DIRECTORY, categoryFolder);

// Ensure category directory exists
await fs.mkdir(categoryLogDir, { recursive: true });

const logFileName = `app-${category}-${logDate}.log`;
const logFilePath = path.join(categoryLogDir, logFileName);

// Also write to general log file
const generalLogFile = `app-${logDate}.log`;
const generalLogPath = path.join(LOG_DIRECTORY, 'general', generalLogFile);
```

**Testing:**
- Verify logs are written to correct subfolders
- Verify general log still receives all entries
- Test with all category types

---

### Step 2: Update LogFilesService for Subfolder Support (1.5 hours)

**File:** `src/services/LogFilesService.ts`

**Changes:**
1. Update `getLogFiles()` to recursively read subfolders
2. Return folder structure in response:
   ```typescript
   {
     files: [
       {
         name: 'app-api-2025-11-22.log',
         folder: 'api',
         path: 'api/app-api-2025-11-22.log',
         size: 12345,
         modifiedAt: '2025-11-22T10:30:00Z'
       },
       // ...
     ],
     folders: ['api', 'database', 'auth', 'backup', 'general', 'error'],
     directory: '/var/www/event-manager/logs'
   }
   ```
3. Update `getLogFileContents()` to handle subfolder paths
4. Update `deleteLogFile()` to handle subfolder paths
5. Update `cleanupOldLogs()` to work with subfolders
6. Add path sanitization to prevent directory traversal attacks

**Code Changes:**
```typescript
async getLogFiles(): Promise<{ files: LogFileInfo[]; folders: string[]; directory: string }> {
  await this.ensureLogDirectory();
  
  const files: LogFileInfo[] = [];
  const folders: string[] = [];
  
  // Read main directory
  const entries = await fs.readdir(this.LOG_DIRECTORY, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      folders.push(entry.name);
      // Read files in subdirectory
      const subFiles = await fs.readdir(path.join(this.LOG_DIRECTORY, entry.name));
      for (const file of subFiles) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.LOG_DIRECTORY, entry.name, file);
          const stats = await fs.stat(filePath);
          files.push({
            name: file,
            folder: entry.name,
            path: `${entry.name}/${file}`,
            size: stats.size,
            sizeFormatted: this.formatFileSize(stats.size),
            modifiedAt: stats.mtime.toISOString()
          });
        }
      }
    } else if (entry.isFile() && entry.name.endsWith('.log')) {
      // Handle legacy files in root (migration period)
      const filePath = path.join(this.LOG_DIRECTORY, entry.name);
      const stats = await fs.stat(filePath);
      files.push({
        name: entry.name,
        folder: 'root',
        path: entry.name,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        modifiedAt: stats.mtime.toISOString()
      });
    }
  }
  
  files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  return { files, folders, directory: this.LOG_DIRECTORY };
}

async getLogFileContents(filename: string, lines: number = 500): Promise<any> {
  this.validateFilename(filename);
  
  // Handle subfolder paths (e.g., "api/app-api-2025-11-22.log")
  const filePath = filename.includes('/') 
    ? path.join(this.LOG_DIRECTORY, filename)
    : path.join(this.LOG_DIRECTORY, filename);
  
  // Additional path validation to prevent directory traversal
  const resolvedPath = path.resolve(this.LOG_DIRECTORY, filename);
  if (!resolvedPath.startsWith(path.resolve(this.LOG_DIRECTORY))) {
    throw this.badRequestError('Invalid file path');
  }
  
  // ... rest of implementation
}
```

**Testing:**
- Verify files are read from all subfolders
- Verify folder structure is returned correctly
- Test path sanitization prevents directory traversal
- Test file operations work with subfolder paths

---

### Step 3: Update LogFilesController (30 minutes)

**File:** `src/controllers/logFilesController.ts`

**Changes:**
1. Update filename validation to allow subfolder paths (e.g., `api/app-api-2025-11-22.log`)
2. Ensure path sanitization prevents directory traversal
3. Update error messages to reflect folder structure

**Code Changes:**
```typescript
// Update validation to handle subfolder paths
private validateFilename(filename: string): void {
  // Allow forward slashes for subfolder paths
  if (filename.includes('..') || filename.includes('\\')) {
    throw this.badRequestError('Invalid filename');
  }
  
  // Additional validation: ensure path is within logs directory
  const resolvedPath = path.resolve(this.LOG_DIRECTORY, filename);
  const logsDir = path.resolve(this.LOG_DIRECTORY);
  if (!resolvedPath.startsWith(logsDir)) {
    throw this.badRequestError('Invalid file path');
  }
}
```

**Testing:**
- Verify path validation works correctly
- Test directory traversal prevention
- Verify error handling

---

### Step 4: Update Frontend Log Browser UI (2 hours)

**File:** `frontend/src/pages/LogViewerPage.tsx`

**Changes:**
1. Add folder tree/grouping UI component
2. Group files by folder/category
3. Add folder expand/collapse functionality
4. Update file selection to include folder path
5. Add folder filter/search
6. Update file list display to show folder structure

**UI Design:**
```
Log Viewer
├── [Filter: All Folders ▼]
├── 📁 api (5 files)
│   ├── app-api-2025-11-22.log (1.2 MB)
│   └── app-api-2025-11-23.log (890 KB)
├── 📁 database (3 files)
│   └── app-database-2025-11-22.log (456 KB)
├── 📁 auth (4 files)
│   └── app-auth-2025-11-22.log (234 KB)
└── 📁 general (2 files)
    └── app-2025-11-22.log (2.1 MB)
```

**Code Changes:**
```typescript
interface LogFile {
  name: string
  folder: string
  path: string
  size: number
  modified: string
}

interface LogFilesResponse {
  files: LogFile[]
  folders: string[]
  totalSize: number
}

// Group files by folder
const groupedFiles = logFiles.reduce((acc, file) => {
  const folder = file.folder || 'root';
  if (!acc[folder]) {
    acc[folder] = [];
  }
  acc[folder].push(file);
  return acc;
}, {} as Record<string, LogFile[]>);

// Render folder tree
{Object.entries(groupedFiles).map(([folder, files]) => (
  <div key={folder} className="folder-group">
    <div className="folder-header" onClick={() => toggleFolder(folder)}>
      <FolderIcon />
      <span>{folder}</span>
      <span>({files.length} files)</span>
    </div>
    {expandedFolders[folder] && (
      <div className="folder-files">
        {files.map(file => (
          <div 
            key={file.path}
            className={`file-item ${selectedFile === file.path ? 'selected' : ''}`}
            onClick={() => selectFile(file.path)}
          >
            {file.name}
            <span className="file-size">{formatFileSize(file.size)}</span>
          </div>
        ))}
      </div>
    )}
  </div>
))}
```

**Testing:**
- Verify folder grouping works correctly
- Test expand/collapse functionality
- Verify file selection includes folder path
- Test folder filtering/search
- Verify UI is responsive and accessible

---

### Step 5: Migration Script (30 minutes)

**File:** `scripts/migrate-logs-to-folders.ts`

**Purpose:** Migrate existing flat log files to new folder structure

**Script Logic:**
1. Read all log files from `logs/` directory
2. Parse category from filename (e.g., `app-api-2025-11-22.log` → category: `api`)
3. Create appropriate subfolder if it doesn't exist
4. Move file to subfolder
5. Handle general log files (no category) → move to `general/` folder
6. Create backup of original structure before migration
7. Log migration progress

**Code:**
```typescript
import fs from 'fs/promises';
import path from 'path';

const LOG_DIR = path.join(__dirname, '../logs');
const BACKUP_DIR = path.join(__dirname, '../logs-backup');

const categoryFolderMap: Record<string, string> = {
  'api': 'api',
  'database': 'database',
  'auth': 'auth',
  'backup': 'backup',
  'error': 'error',
};

async function migrateLogs() {
  // Create backup
  await fs.cp(LOG_DIR, BACKUP_DIR, { recursive: true });
  console.log('Backup created at:', BACKUP_DIR);
  
  const files = await fs.readdir(LOG_DIR);
  let moved = 0;
  
  for (const file of files) {
    if (!file.endsWith('.log')) continue;
    
    const match = file.match(/^app-(.+?)-(\d{4}-\d{2}-\d{2})\.log$/);
    if (match) {
      const [, category, date] = match;
      const folder = categoryFolderMap[category] || 'general';
      const folderPath = path.join(LOG_DIR, folder);
      
      await fs.mkdir(folderPath, { recursive: true });
      await fs.rename(
        path.join(LOG_DIR, file),
        path.join(folderPath, file)
      );
      moved++;
    } else if (file.match(/^app-\d{4}-\d{2}-\d{2}\.log$/)) {
      // General log file
      const generalPath = path.join(LOG_DIR, 'general');
      await fs.mkdir(generalPath, { recursive: true });
      await fs.rename(
        path.join(LOG_DIR, file),
        path.join(generalPath, file)
      );
      moved++;
    }
  }
  
  console.log(`Migration complete: ${moved} files moved`);
}

migrateLogs().catch(console.error);
```

**Testing:**
- Test migration script on development environment
- Verify all files are moved correctly
- Verify backup is created
- Test rollback procedure

---

### Step 6: Testing (1 hour)

**Test Cases:**

1. **Logger Tests:**
   - [ ] Logs written to correct subfolders
   - [ ] General log receives all entries
   - [ ] All categories create correct folders
   - [ ] Directory creation handles errors gracefully

2. **Service Tests:**
   - [ ] `getLogFiles()` returns folder structure
   - [ ] Files read from all subfolders
   - [ ] Path sanitization prevents directory traversal
   - [ ] File operations work with subfolder paths
   - [ ] Cleanup works with subfolders

3. **Controller Tests:**
   - [ ] Path validation works correctly
   - [ ] Directory traversal prevented
   - [ ] Error handling works

4. **Frontend Tests:**
   - [ ] Folder grouping displays correctly
   - [ ] Expand/collapse works
   - [ ] File selection includes folder path
   - [ ] Filtering/search works
   - [ ] UI is responsive

5. **Migration Tests:**
   - [ ] Migration script runs successfully
   - [ ] All files moved correctly
   - [ ] Backup created
   - [ ] Rollback works

6. **Integration Tests:**
   - [ ] End-to-end log viewing works
   - [ ] Log download works with subfolder paths
   - [ ] Log deletion works
   - [ ] Cleanup works

---

## Risk Assessment

### Low Risk
- **Logger Changes:** Well-contained, easy to test
- **Service Updates:** Straightforward file system operations
- **Controller Updates:** Minimal changes, mostly validation

### Medium Risk
- **Frontend UI Changes:** Requires careful UX design
- **Migration Script:** Must be tested thoroughly before production
- **Path Sanitization:** Critical for security, must be bulletproof

### Mitigation Strategies
1. **Staged Rollout:** Deploy logger changes first, then UI
2. **Backup Before Migration:** Always backup logs before migration
3. **Rollback Plan:** Keep migration script reversible
4. **Testing:** Comprehensive testing in development/staging
5. **Monitoring:** Monitor log file creation after deployment

---

## Rollback Plan

If issues arise:

1. **Logger Issues:**
   - Revert logger.ts changes
   - Logs will continue in flat structure
   - No data loss

2. **Service Issues:**
   - Revert LogFilesService.ts changes
   - Service will read from flat structure
   - Backward compatible

3. **Migration Issues:**
   - Restore from backup directory
   - Run rollback script if created
   - No data loss if backup exists

4. **UI Issues:**
   - Revert frontend changes
   - UI will show flat list
   - Backend still functional

---

## Success Criteria

- ✅ All logs organized into category subfolders
- ✅ Log browser UI shows folder structure
- ✅ File operations work with subfolder paths
- ✅ Path sanitization prevents directory traversal
- ✅ Migration completed without data loss
- ✅ No performance degradation
- ✅ Backward compatibility maintained during transition

---

## Timeline

- **Step 1 (Logger):** 1 hour
- **Step 2 (Service):** 1.5 hours
- **Step 3 (Controller):** 30 minutes
- **Step 4 (Frontend):** 2 hours
- **Step 5 (Migration):** 30 minutes
- **Step 6 (Testing):** 1 hour
- **Total:** 4-6 hours

---

## Dependencies

- ✅ Console replacement (05-HIGH-CONSOLE-LOGGING.md) must be complete
- ✅ Logger utility (`src/utils/logger.ts`) must be stable
- ✅ LogFilesService must be functional

---

## Post-Implementation

### Monitoring
- Monitor log file creation in subfolders
- Verify log browser UI performance
- Check for any path-related errors

### Documentation Updates
- Update log management documentation
- Update developer guide for log categories
- Update operations runbook

### Future Enhancements
- Add log retention policies per folder
- Add folder-level log rotation
- Add folder-level search/filtering
- Add folder-level statistics

---

**Status:** PLANNED
**Last Updated:** November 22, 2025
**Assigned To:** TBD

