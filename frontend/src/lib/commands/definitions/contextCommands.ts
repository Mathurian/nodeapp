/**
 * Context-Specific Commands
 * Commands that appear based on the current page/context
 */

import { Command } from '../CommandRegistry';
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  CalculatorIcon,
  PresentationChartLineIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PlusCircleIcon,
  MinusCircleIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  ListBulletIcon,
  MapIcon,
  CalendarDaysIcon,
  UserIcon,
  TrophyIcon,
  FlagIcon,
  BellAlertIcon,
  EnvelopeIcon,
  PrinterIcon,
  DocumentPlusIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export const createContextCommands = (options: {
  context?: string;
  navigate?: (path: string) => void;
}): Command[] => {
  const commands: Command[] = [];
  const { context, navigate } = options;

  if (!navigate) return commands;

  // Event Context Commands
  if (context === 'events' || !context) {
    commands.push(
      {
        id: 'ctx-event-edit',
        name: 'Edit Current Event',
        description: 'Edit the selected event',
        icon: PencilIcon,
        action: () => alert('Edit event dialog would open'),
        keywords: ['edit', 'modify', 'change', 'event'],
        category: 'action',
        group: 'Event Actions',
        priority: 100,
        context: ['events'],
        roles: ['ADMIN', 'ORGANIZER']
      },
      {
        id: 'ctx-event-view-details',
        name: 'View Event Details',
        description: 'See full event information',
        icon: EyeIcon,
        action: () => alert('Event details would open'),
        keywords: ['view', 'details', 'info', 'event'],
        category: 'action',
        group: 'Event Actions',
        priority: 95,
        context: ['events']
      },
      {
        id: 'ctx-event-manage-contests',
        name: 'Manage Event Contests',
        description: 'View and manage contests for this event',
        icon: ClipboardDocumentListIcon,
        action: () => navigate('/contests'),
        keywords: ['contests', 'manage', 'event'],
        category: 'action',
        group: 'Event Actions',
        priority: 90,
        context: ['events'],
        roles: ['ADMIN', 'ORGANIZER']
      },
      {
        id: 'ctx-event-assign-judges',
        name: 'Assign Judges',
        description: 'Assign judges to categories',
        icon: UserGroupIcon,
        action: () => alert('Judge assignment dialog would open'),
        keywords: ['assign', 'judge', 'category'],
        category: 'action',
        group: 'Event Actions',
        priority: 85,
        context: ['events'],
        roles: ['ADMIN', 'ORGANIZER']
      },
      {
        id: 'ctx-event-schedule',
        name: 'Edit Event Schedule',
        description: 'Modify event schedule',
        icon: CalendarDaysIcon,
        action: () => alert('Schedule editor would open'),
        keywords: ['schedule', 'time', 'calendar'],
        category: 'action',
        group: 'Event Actions',
        priority: 80,
        context: ['events'],
        roles: ['ADMIN', 'ORGANIZER']
      }
    );
  }

  // Scoring Context Commands
  if (context === 'scoring' || !context) {
    commands.push(
      {
        id: 'ctx-score-contestant',
        name: 'Score Contestant',
        description: 'Enter scores for a contestant',
        icon: CalculatorIcon,
        action: () => alert('Score entry would open'),
        keywords: ['score', 'enter', 'contestant'],
        category: 'action',
        group: 'Scoring Actions',
        priority: 100,
        context: ['scoring'],
        roles: ['JUDGE', 'ADMIN']
      },
      {
        id: 'ctx-view-my-scores',
        name: 'View My Scores',
        description: 'See all scores I have entered',
        icon: ClipboardDocumentCheckIcon,
        action: () => navigate!('/scoring?view=mine'),
        keywords: ['my', 'scores', 'view'],
        category: 'action',
        group: 'Scoring Actions',
        priority: 95,
        context: ['scoring'],
        roles: ['JUDGE']
      },
      {
        id: 'ctx-score-verification',
        name: 'Verify Scores',
        description: 'Verify and certify scores',
        icon: ShieldCheckIcon,
        action: () => navigate!('/scoring?action=verify'),
        keywords: ['verify', 'certify', 'check'],
        category: 'action',
        group: 'Scoring Actions',
        priority: 90,
        context: ['scoring'],
        roles: ['ADMIN', 'TALLY_MASTER', 'AUDITOR']
      },
      {
        id: 'ctx-score-summary',
        name: 'Score Summary',
        description: 'View scoring summary',
        icon: PresentationChartLineIcon,
        action: () => navigate!('/scoring?view=summary'),
        keywords: ['summary', 'overview', 'scores'],
        category: 'action',
        group: 'Scoring Actions',
        priority: 85,
        context: ['scoring']
      },
      {
        id: 'ctx-recalculate-scores',
        name: 'Recalculate Results',
        description: 'Recalculate all score totals',
        icon: ArrowPathIcon,
        action: () => {
          if (confirm('Recalculate all scores?')) {
            alert('Scores would be recalculated');
          }
        },
        keywords: ['recalculate', 'refresh', 'update'],
        category: 'action',
        group: 'Scoring Actions',
        priority: 80,
        context: ['scoring'],
        roles: ['ADMIN', 'TALLY_MASTER']
      }
    );
  }

  // User Management Context Commands
  if (context === 'users' || !context) {
    commands.push(
      {
        id: 'ctx-user-edit',
        name: 'Edit User',
        description: 'Edit selected user',
        icon: PencilIcon,
        action: () => alert('Edit user dialog would open'),
        keywords: ['edit', 'user', 'modify'],
        category: 'action',
        group: 'User Actions',
        priority: 100,
        context: ['users'],
        roles: ['ADMIN', 'ORGANIZER']
      },
      {
        id: 'ctx-user-reset-password',
        name: 'Reset User Password',
        description: 'Send password reset email',
        icon: EnvelopeIcon,
        action: () => {
          if (confirm('Send password reset email?')) {
            alert('Reset email sent');
          }
        },
        keywords: ['reset', 'password', 'email'],
        category: 'action',
        group: 'User Actions',
        priority: 95,
        context: ['users'],
        roles: ['ADMIN']
      },
      {
        id: 'ctx-user-toggle-status',
        name: 'Toggle User Status',
        description: 'Activate or deactivate user',
        icon: AdjustmentsHorizontalIcon,
        action: () => alert('User status toggled'),
        keywords: ['activate', 'deactivate', 'toggle'],
        category: 'action',
        group: 'User Actions',
        priority: 90,
        context: ['users'],
        roles: ['ADMIN', 'ORGANIZER']
      },
      {
        id: 'ctx-user-view-history',
        name: 'View User History',
        description: 'See user activity history',
        icon: ClipboardDocumentListIcon,
        action: () => alert('User history would open'),
        keywords: ['history', 'activity', 'log'],
        category: 'action',
        group: 'User Actions',
        priority: 85,
        context: ['users'],
        roles: ['ADMIN']
      }
    );
  }

  // Results Context Commands
  if (context === 'results' || !context) {
    commands.push(
      {
        id: 'ctx-results-by-category',
        name: 'View Results by Category',
        description: 'See results grouped by category',
        icon: Squares2X2Icon,
        action: () => navigate!('/results?view=category'),
        keywords: ['category', 'group', 'results'],
        category: 'action',
        group: 'Results Views',
        priority: 100,
        context: ['results']
      },
      {
        id: 'ctx-results-by-contestant',
        name: 'View Results by Contestant',
        description: 'See all results for each contestant',
        icon: UserIcon,
        action: () => navigate!('/results?view=contestant'),
        keywords: ['contestant', 'competitor', 'results'],
        category: 'action',
        group: 'Results Views',
        priority: 95,
        context: ['results']
      },
      {
        id: 'ctx-results-overall',
        name: 'Overall Standings',
        description: 'View overall competition standings',
        icon: TrophyIcon,
        action: () => navigate!('/results?view=overall'),
        keywords: ['overall', 'standings', 'leaderboard'],
        category: 'action',
        group: 'Results Views',
        priority: 90,
        context: ['results']
      },
      {
        id: 'ctx-results-print',
        name: 'Print Results',
        description: 'Print current results view',
        icon: PrinterIcon,
        action: () => window.print(),
        keywords: ['print', 'results'],
        category: 'action',
        group: 'Results Views',
        priority: 85,
        context: ['results']
      }
    );
  }

  // Admin Context Commands
  if (context === 'admin' || !context) {
    commands.push(
      {
        id: 'ctx-admin-user-audit',
        name: 'User Audit Report',
        description: 'Generate user audit report',
        icon: DocumentChartBarIcon,
        action: () => alert('Audit report would generate'),
        keywords: ['audit', 'user', 'report'],
        category: 'action',
        group: 'Admin Tools',
        priority: 100,
        context: ['admin'],
        roles: ['ADMIN']
      },
      {
        id: 'ctx-admin-system-settings',
        name: 'System Settings',
        description: 'Configure system settings',
        icon: AdjustmentsHorizontalIcon,
        action: () => navigate!('/settings'),
        keywords: ['settings', 'config', 'system'],
        category: 'action',
        group: 'Admin Tools',
        priority: 95,
        context: ['admin'],
        roles: ['ADMIN']
      },
      {
        id: 'ctx-admin-send-notification',
        name: 'Send System Notification',
        description: 'Broadcast notification to all users',
        icon: BellAlertIcon,
        action: () => alert('Notification composer would open'),
        keywords: ['notification', 'broadcast', 'send'],
        category: 'action',
        group: 'Admin Tools',
        priority: 90,
        context: ['admin'],
        roles: ['ADMIN']
      }
    );
  }

  return commands;
};
