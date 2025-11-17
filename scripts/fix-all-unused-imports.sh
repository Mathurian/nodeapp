#!/bin/bash
# Comprehensive fix for all unused route imports

# advancedReportingRoutes
sed -i '/generateContestResultsReport,/d' src/routes/advancedReportingRoutes.ts

# categoriesRoutes
sed -i 's/bulkDeleteCategories, //g' src/routes/categoriesRoutes.ts
sed -i 's/bulkUpdateCategories, //g' src/routes/categoriesRoutes.ts

# categoryTypeRoutes
sed -i '/updateCategoryType,/d' src/routes/categoryTypeRoutes.ts
sed -i '/deleteCategoryType,/d' src/routes/categoryTypeRoutes.ts

# commentaryRoutes
sed -i '/getScoreComments,/d' src/routes/commentaryRoutes.ts
sed -i '/updateScoreComment,/d' src/routes/commentaryRoutes.ts
sed -i '/deleteScoreComment,/d' src/routes/commentaryRoutes.ts

# contestCertificationRoutes
sed -i 's/certifyContest, //g' src/routes/contestCertificationRoutes.ts

# contestsRoutes
sed -i 's/getArchivedContests, //g' src/routes/contestsRoutes.ts

# emailRoutes
sed -i 's/updateTemplate, //g; s/deleteTemplate, //g; s/sendCampaign, //g' src/routes/emailRoutes.ts

# emceeRoutes
sed -i '/getEmceeHistory,/d' src/routes/emceeRoutes.ts

# errorHandlingRoutes
sed -i '/getErrorDetails,/d; /markErrorResolved,/d; /getErrorTrends,/d; /cleanupErrorLogs,/d; /exportErrorLogs,/d' src/routes/errorHandlingRoutes.ts
sed -i "/^import { logActivity } from/d" src/routes/errorHandlingRoutes.ts

# eventTemplateRoutes
sed -i 's/updateTemplate, //g; s/deleteTemplate, //g; s/createEventFromTemplate, //g' src/routes/eventTemplateRoutes.ts

# exportRoutes
sed -i '/exportContestResultsToCSV,/d; /exportJudgePerformanceToXML,/d; /exportSystemAnalyticsToPDF,/d' src/routes/exportRoutes.ts

# fileBackupRoutes
sed -i '/restoreFileBackup,/d; /deleteFileBackup,/d; /getBackupDetails,/d; /downloadBackup,/d' src/routes/fileBackupRoutes.ts

# fileManagementRoutes
sed -i '/bulkFileOperations,/d' src/routes/fileManagementRoutes.ts

# fileRoutes
sed -i '/uploadFiles,/d; /getFileById,/d; /downloadFile,/d; /updateFile,/d; /deleteFile,/d' src/routes/fileRoutes.ts
sed -i 's/requireRole, //g' src/routes/fileRoutes.ts

echo "Fixed all unused route imports"
