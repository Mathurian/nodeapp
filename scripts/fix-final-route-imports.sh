#!/bin/bash
# Final comprehensive fix for ALL remaining unused route imports

# Routes with unused imports
sed -i '/generateContestResultsReport,/d' src/routes/advancedReportingRoutes.ts 2>/dev/null || true
sed -i '/deleteCategoryType,/d' src/routes/categoryTypeRoutes.ts 2>/dev/null || true
sed -i '/certifyContest,/d' src/routes/contestCertificationRoutes.ts 2>/dev/null || true
sed -i 's/, certifyContest//g' src/routes/contestCertificationRoutes.ts 2>/dev/null || true
sed -i '/getArchivedContests,/d' src/routes/contestsRoutes.ts 2>/dev/null || true
sed -i 's/, getArchivedContests//g' src/routes/contestsRoutes.ts 2>/dev/null || true
sed -i '/exportErrorLogs,/d' src/routes/errorHandlingRoutes.ts 2>/dev/null || true
sed -i '/createEventFromTemplate,/d' src/routes/eventTemplateRoutes.ts 2>/dev/null || true
sed -i 's/, createEventFromTemplate//g' src/routes/eventTemplateRoutes.ts 2>/dev/null || true
sed -i '/downloadBackup,/d' src/routes/fileBackupRoutes.ts 2>/dev/null || true
sed -i '/requireRole,/d' src/routes/fileRoutes.ts 2>/dev/null || true
sed -i 's/, requireRole//g' src/routes/fileRoutes.ts 2>/dev/null || true
sed -i "/^import { logActivity } from.*errorHandler';$/d" src/routes/fileRoutes.ts 2>/dev/null || true
sed -i '/updateAssignmentStatus,/d' src/routes/judgeRoutes.ts 2>/dev/null || true
sed -i '/getJudgeHistory,/d' src/routes/judgeRoutes.ts 2>/dev/null || true
sed -i '/getPerformanceLogs,/d' src/routes/performanceRoutes.ts 2>/dev/null || true
sed -i '/clearPerformanceLogs,/d' src/routes/performanceRoutes.ts 2>/dev/null || true
sed -i '/getHealthCheck,/d' src/routes/performanceRoutes.ts 2>/dev/null || true
sed -i "/^import { logActivity } from/d" src/routes/performanceRoutes.ts 2>/dev/null || true
sed -i '/updatePrintTemplate,/d' src/routes/printRoutes.ts 2>/dev/null || true
sed -i '/deletePrintTemplate,/d' src/routes/printRoutes.ts 2>/dev/null || true
sed -i '/updateTemplate,/d' src/routes/reportsRoutes.ts 2>/dev/null || true
sed -i '/deleteTemplate,/d' src/routes/reportsRoutes.ts 2>/dev/null || true
sed -i '/generateContestantReports,/d' src/routes/reportsRoutes.ts 2>/dev/null || true
sed -i 's/getScores, //g' src/routes/scoringRoutes.ts 2>/dev/null || true
sed -i 's/, certifyJudgeContestScores//g' src/routes/scoringRoutes.ts 2>/dev/null || true
sed -i 's/sendBulkSMS, //g' src/routes/smsRoutes.ts 2>/dev/null || true
sed -i 's/sendNotificationSMS, //g' src/routes/smsRoutes.ts 2>/dev/null || true
sed -i 's/, getSMSHistory//g' src/routes/smsRoutes.ts 2>/dev/null || true
sed -i 's/updateTemplate, //g' src/routes/templatesRoutes.ts 2>/dev/null || true
sed -i 's/deleteTemplate, //g' src/routes/templatesRoutes.ts 2>/dev/null || true
sed -i '/getJudgeScoringProgress,/d' src/routes/trackerRoutes.ts 2>/dev/null || true
sed -i 's/deleteFile, //g' src/routes/uploadRoutes.ts 2>/dev/null || true

echo "Fixed all remaining route imports"
