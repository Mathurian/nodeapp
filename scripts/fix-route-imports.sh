#!/bin/bash
# Fix unused imports in route files

# advancedReportingRoutes.ts - remove unused imports
sed -i '/generateJudgePerformanceReport,/d' src/routes/advancedReportingRoutes.ts
sed -i '/generateSystemAnalyticsReport,/d' src/routes/advancedReportingRoutes.ts
sed -i '/generateContestResultsReport,/d' src/routes/advancedReportingRoutes.ts

# backupRoutes.ts - remove unused imports
sed -i '/downloadBackup,/d' src/routes/backupRoutes.ts
sed -i '/deleteBackup,/d' src/routes/backupRoutes.ts

echo "Fixed route imports"
