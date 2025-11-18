/**
 * Quick Action Commands
 * Fast shortcuts for common operations
 */

import { Command } from '../CommandRegistry';
import {
  ClockIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  TableCellsIcon,
  ChartBarIcon,
  UserPlusIcon,
  UserMinusIcon,
  FlagIcon,
  StarIcon,
  BookmarkIcon,
  ShareIcon,
  PaperAirplaneIcon,
  BellAlertIcon,
  ClipboardDocumentIcon,
  QueueListIcon
} from '@heroicons/react/24/outline';

export const createQuickActionCommands = (options: {
  navigate?: (path: string) => void;
}): Command[] => {
  const commands: Command[] = [];

  if (!options.navigate) return commands;

  // Scoring Quick Actions
  commands.push(
    {
      id: 'quick-score-entry',
      name: 'Quick Score Entry',
      description: 'Start scoring mode immediately',
      icon: BoltIcon,
      action: () => options.navigate!('/scoring?mode=quick'),
      keywords: ['score', 'quick', 'fast', 'judge'],
      category: 'quick',
      group: 'Scoring',
      priority: 100,
      roles: ['JUDGE', 'ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-view-scores',
      name: 'View All Scores',
      description: 'See all scores for current event',
      icon: ChartBarIcon,
      action: () => options.navigate!('/scoring?view=all'),
      keywords: ['score', 'view', 'all', 'list'],
      category: 'quick',
      group: 'Scoring',
      priority: 95,
      roles: ['ADMIN', 'ORGANIZER', 'AUDITOR', 'TALLY_MASTER']
    },
    {
      id: 'quick-certify-scores',
      name: 'Certify Scores',
      description: 'Mark scores as certified',
      icon: CheckCircleIcon,
      action: () => options.navigate!('/scoring?action=certify'),
      keywords: ['certify', 'approve', 'verify', 'confirm'],
      category: 'quick',
      group: 'Scoring',
      priority: 90,
      roles: ['ADMIN', 'TALLY_MASTER', 'AUDITOR']
    },
    {
      id: 'quick-score-stats',
      name: 'Score Statistics',
      description: 'View scoring statistics',
      icon: ChartBarIcon,
      action: () => options.navigate!('/scoring?view=stats'),
      keywords: ['statistics', 'stats', 'analytics', 'score'],
      category: 'quick',
      group: 'Scoring',
      priority: 85
    }
  );

  // Event Management Quick Actions
  commands.push(
    {
      id: 'quick-activate-event',
      name: 'Activate Event',
      description: 'Set event as active',
      icon: LockOpenIcon,
      action: () => alert('Event activation dialog would open'),
      keywords: ['activate', 'enable', 'start', 'event'],
      category: 'quick',
      group: 'Events',
      priority: 80,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-archive-event',
      name: 'Archive Event',
      description: 'Archive completed event',
      icon: LockClosedIcon,
      action: () => alert('Archive event dialog would open'),
      keywords: ['archive', 'close', 'end', 'finish'],
      category: 'quick',
      group: 'Events',
      priority: 75,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-clone-event',
      name: 'Clone Event',
      description: 'Duplicate an event',
      icon: DocumentDuplicateIcon,
      action: () => alert('Clone event dialog would open'),
      keywords: ['clone', 'duplicate', 'copy', 'event'],
      category: 'quick',
      group: 'Events',
      priority: 70,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-publish-results',
      name: 'Publish Results',
      description: 'Make results public',
      icon: PaperAirplaneIcon,
      action: () => alert('Publish results dialog would open'),
      keywords: ['publish', 'release', 'results', 'public'],
      category: 'quick',
      group: 'Events',
      priority: 65,
      roles: ['ADMIN', 'ORGANIZER']
    }
  );

  // User Management Quick Actions
  commands.push(
    {
      id: 'quick-add-judge',
      name: 'Add Judge',
      description: 'Quickly add a new judge',
      icon: UserPlusIcon,
      action: () => options.navigate!('/users?action=create&role=JUDGE'),
      keywords: ['add', 'create', 'judge', 'user'],
      category: 'quick',
      group: 'Users',
      priority: 60,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-add-contestant',
      name: 'Add Contestant',
      description: 'Quickly add a new contestant',
      icon: UserPlusIcon,
      action: () => options.navigate!('/users?action=create&role=CONTESTANT'),
      keywords: ['add', 'create', 'contestant', 'competitor'],
      category: 'quick',
      group: 'Users',
      priority: 55,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-bulk-import-users',
      name: 'Bulk Import Users',
      description: 'Import users from CSV',
      icon: ArrowUpTrayIcon,
      action: () => options.navigate!('/users?action=import'),
      keywords: ['import', 'bulk', 'csv', 'upload', 'users'],
      category: 'quick',
      group: 'Users',
      priority: 50,
      roles: ['ADMIN', 'ORGANIZER']
    },
    {
      id: 'quick-export-users',
      name: 'Export Users',
      description: 'Export users to CSV',
      icon: ArrowDownTrayIcon,
      action: () => alert('Export users dialog would open'),
      keywords: ['export', 'download', 'csv', 'users'],
      category: 'quick',
      group: 'Users',
      priority: 45,
      roles: ['ADMIN', 'ORGANIZER']
    }
  );

  // Reporting Quick Actions
  commands.push(
    {
      id: 'quick-generate-scoresheets',
      name: 'Generate Scoresheets',
      description: 'Create printable scoresheets',
      icon: ClipboardDocumentIcon,
      action: () => options.navigate!('/reports?type=scoresheets'),
      keywords: ['scoresheet', 'generate', 'print', 'judge'],
      category: 'quick',
      group: 'Reports',
      priority: 40
    },
    {
      id: 'quick-generate-placements',
      name: 'Generate Placement Report',
      description: 'Create placement report',
      icon: TrophyIcon,
      action: () => options.navigate!('/reports?type=placements'),
      keywords: ['placement', 'winner', 'report', 'standings'],
      category: 'quick',
      group: 'Reports',
      priority: 35
    },
    {
      id: 'quick-generate-certificates',
      name: 'Generate Certificates',
      description: 'Create winner certificates',
      icon: StarIcon,
      action: () => options.navigate!('/reports?type=certificates'),
      keywords: ['certificate', 'award', 'winner', 'print'],
      category: 'quick',
      group: 'Reports',
      priority: 30
    },
    {
      id: 'quick-judge-assignments',
      name: 'View Judge Assignments',
      description: 'See judge assignment report',
      icon: QueueListIcon,
      action: () => options.navigate!('/reports?type=assignments'),
      keywords: ['assignment', 'judge', 'schedule'],
      category: 'quick',
      group: 'Reports',
      priority: 25
    }
  );

  // System Quick Actions
  commands.push(
    {
      id: 'quick-clear-cache',
      name: 'Clear Cache',
      description: 'Clear application cache',
      icon: TrashIcon,
      action: () => {
        if (confirm('Clear all cached data?')) {
          localStorage.clear();
          sessionStorage.clear();
          alert('Cache cleared successfully');
        }
      },
      keywords: ['cache', 'clear', 'reset', 'refresh'],
      category: 'quick',
      group: 'System',
      priority: 20,
      roles: ['ADMIN']
    },
    {
      id: 'quick-view-recent-activity',
      name: 'View Recent Activity',
      description: 'See recent system activity',
      icon: ClockIcon,
      action: () => options.navigate!('/logs?filter=recent'),
      keywords: ['activity', 'recent', 'history', 'log'],
      category: 'quick',
      group: 'System',
      priority: 15,
      roles: ['ADMIN']
    },
    {
      id: 'quick-system-health',
      name: 'System Health Check',
      description: 'View system health status',
      icon: CheckCircleIcon,
      action: () => options.navigate!('/admin?view=health'),
      keywords: ['health', 'status', 'system', 'check'],
      category: 'quick',
      group: 'System',
      priority: 10,
      roles: ['ADMIN']
    },
    {
      id: 'quick-backup-now',
      name: 'Backup Now',
      description: 'Create immediate backup',
      icon: ArrowDownTrayIcon,
      action: () => alert('Backup creation would start'),
      keywords: ['backup', 'save', 'snapshot', 'now'],
      category: 'quick',
      group: 'System',
      priority: 5,
      roles: ['ADMIN']
    }
  );

  // Filter & View Quick Actions
  commands.push(
    {
      id: 'quick-filter-active',
      name: 'Show Only Active Items',
      description: 'Filter to show active items only',
      icon: FunnelIcon,
      action: () => alert('Filter applied'),
      keywords: ['filter', 'active', 'show'],
      category: 'quick',
      group: 'Filters',
      priority: 0
    },
    {
      id: 'quick-filter-inactive',
      name: 'Show Inactive Items',
      description: 'Filter to show inactive items',
      icon: FunnelIcon,
      action: () => alert('Filter applied'),
      keywords: ['filter', 'inactive', 'hidden'],
      category: 'quick',
      group: 'Filters',
      priority: 0
    },
    {
      id: 'quick-reset-filters',
      name: 'Reset All Filters',
      description: 'Clear all active filters',
      icon: XCircleIcon,
      action: () => alert('Filters reset'),
      keywords: ['reset', 'clear', 'filter', 'all'],
      category: 'quick',
      group: 'Filters',
      priority: 0
    }
  );

  return commands;
};

import { TrophyIcon } from '@heroicons/react/24/outline';
