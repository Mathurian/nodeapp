import { Request, Response, NextFunction } from 'express';

const prisma = require('../utils/prisma')

// Define navigation structure based on roles
const getNavigationItems = (userRole: string): any[] => {
  const baseItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'HomeIcon',
      roles: ['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'EMCEE', 'CONTESTANT']
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: 'UserIcon',
      roles: ['ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'TALLY_MASTER', 'AUDITOR', 'EMCEE', 'CONTESTANT']
    }
  ]

  const roleSpecificItems: Record<string, any[]> = {
    ORGANIZER: [
      {
        id: 'events',
        label: 'Events',
        path: '/events',
        icon: 'CalendarIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'contests',
        label: 'Contests',
        path: '/contests',
        icon: 'TrophyIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'categories',
        label: 'Categories',
        path: '/categories',
        icon: 'TagIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'users',
        label: 'Users',
        path: '/users',
        icon: 'UsersIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'assignments',
        label: 'Assignments',
        path: '/assignments',
        icon: 'ClipboardDocumentListIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'certifications',
        label: 'Certifications',
        path: '/certifications',
        icon: 'ShieldCheckIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'admin',
        label: 'Admin',
        path: '/admin',
        icon: 'CogIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: 'Cog6ToothIcon',
        roles: ['ADMIN', 'ORGANIZER', 'BOARD']
      }
    ],
    BOARD: [
      {
        id: 'board',
        label: 'Board Dashboard',
        path: '/board',
        icon: 'BuildingOfficeIcon',
        roles: ['BOARD', 'ORGANIZER']
      },
      {
        id: 'emcee-scripts',
        label: 'Emcee Scripts',
        path: '/emcee-scripts',
        icon: 'DocumentTextIcon',
        roles: ['BOARD', 'ORGANIZER']
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/reports',
        icon: 'ChartBarIcon',
        roles: ['BOARD', 'ORGANIZER']
      },
      {
        id: 'score-removal',
        label: 'Score Removal',
        path: '/score-removal',
        icon: 'ExclamationTriangleIcon',
        roles: ['BOARD', 'ORGANIZER']
      }
    ],
    AUDITOR: [
      {
        id: 'auditor',
        label: 'Auditor Dashboard',
        path: '/auditor',
        icon: 'MagnifyingGlassIcon',
        roles: ['AUDITOR', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'score-verification',
        label: 'Score Verification',
        path: '/score-verification',
        icon: 'CheckCircleIcon',
        roles: ['AUDITOR', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'tally-status',
        label: 'Tally Status',
        path: '/tally-status',
        icon: 'CalculatorIcon',
        roles: ['AUDITOR', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'final-certification',
        label: 'Final Certification',
        path: '/final-certification',
        icon: 'ShieldCheckIcon',
        roles: ['AUDITOR', 'ORGANIZER', 'BOARD']
      }
    ],
    TALLY_MASTER: [
      {
        id: 'tally-master',
        label: 'Tally Master Dashboard',
        path: '/tally-master',
        icon: 'CalculatorIcon',
        roles: ['TALLY_MASTER', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'score-review',
        label: 'Score Review',
        path: '/score-review',
        icon: 'EyeIcon',
        roles: ['TALLY_MASTER', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'bias-checking',
        label: 'Bias Checking',
        path: '/bias-checking',
        icon: 'ExclamationTriangleIcon',
        roles: ['TALLY_MASTER', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'certification-workflow',
        label: 'Certification Workflow',
        path: '/certification-workflow',
        icon: 'ClipboardDocumentCheckIcon',
        roles: ['TALLY_MASTER', 'ORGANIZER', 'BOARD']
      }
    ],
    JUDGE: [
      {
        id: 'judge',
        label: 'Judge Dashboard',
        path: '/judge',
        icon: 'ScaleIcon',
        roles: ['JUDGE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'my-assignments',
        label: 'My Assignments',
        path: '/my-assignments',
        icon: 'ClipboardDocumentListIcon',
        roles: ['JUDGE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'scoring',
        label: 'Scoring',
        path: '/scoring',
        icon: 'PencilIcon',
        roles: ['JUDGE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'contestant-bios',
        label: 'Contestant Bios',
        path: '/contestant-bios',
        icon: 'UserGroupIcon',
        roles: ['JUDGE', 'ORGANIZER', 'BOARD']
      }
    ],
    EMCEE: [
      {
        id: 'emcee',
        label: 'Emcee Dashboard',
        path: '/emcee',
        icon: 'MicrophoneIcon',
        roles: ['EMCEE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'scripts',
        label: 'Scripts',
        path: '/scripts',
        icon: 'DocumentTextIcon',
        roles: ['EMCEE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'contestant-bios',
        label: 'Contestant Bios',
        path: '/contestant-bios',
        icon: 'UserGroupIcon',
        roles: ['EMCEE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'judge-bios',
        label: 'Judge Bios',
        path: '/judge-bios',
        icon: 'UsersIcon',
        roles: ['EMCEE', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'event-management',
        label: 'Event Management',
        path: '/event-management',
        icon: 'CalendarIcon',
        roles: ['EMCEE', 'ORGANIZER', 'BOARD']
      }
    ],
    CONTESTANT: [
      {
        id: 'results',
        label: 'Results',
        path: '/results',
        icon: 'TrophyIcon',
        roles: ['CONTESTANT', 'ORGANIZER', 'BOARD']
      },
      {
        id: 'my-scores',
        label: 'My Scores',
        path: '/my-scores',
        icon: 'ChartBarIcon',
        roles: ['CONTESTANT', 'ORGANIZER', 'BOARD']
      }
    ]
  }

  // Combine base items with role-specific items
  const allItems = [...baseItems];
  
  if (roleSpecificItems[userRole as keyof typeof roleSpecificItems]) {
    allItems.push(...roleSpecificItems[userRole as keyof typeof roleSpecificItems]);
  }

  // Filter items based on user role
  return allItems.filter(item => 
    item.roles.includes(userRole) || 
    item.roles.includes('ORGANIZER') || 
    item.roles.includes('BOARD')
  )
}

// Get navigation permissions for a specific route
const getRoutePermissions = (route: string, userRole: string): { allowed: boolean; reason: string } => {
  const navigationItems = getNavigationItems(userRole)
  const item = navigationItems.find(nav => nav.path === route)
  
  if (!item) {
    return {
      allowed: false,
      reason: 'Route not found in navigation'
    }
  }

  return {
    allowed: item.roles.includes(userRole),
    reason: item.roles.includes(userRole) ? 'Access granted' : 'Insufficient permissions'
  }
}

// Check if user can access a specific feature
const canAccessFeature = (feature: string, userRole: string): boolean => {
  const featurePermissions: Record<string, string[]> = {
    'CREATE_EVENT': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'EDIT_EVENT': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'DELETE_EVENT': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'CREATE_CONTEST': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'EDIT_CONTEST': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'DELETE_CONTEST': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'CREATE_CATEGORY': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'EDIT_CATEGORY': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'DELETE_CATEGORY': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'MANAGE_USERS': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'ASSIGN_JUDGES': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'VIEW_ALL_SCORES': ['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR', 'TALLY_MASTER'],
    'EDIT_SCORES': ['ADMIN', 'JUDGE', 'ORGANIZER', 'BOARD'],
    'CERTIFY_SCORES': ['ADMIN', 'TALLY_MASTER', 'ORGANIZER', 'BOARD'],
    'AUDIT_SCORES': ['ADMIN', 'AUDITOR', 'ORGANIZER', 'BOARD'],
    'BOARD_APPROVAL': ['ADMIN', 'BOARD', 'ORGANIZER'],
    'MANAGE_SCRIPTS': ['ADMIN', 'EMCEE', 'ORGANIZER', 'BOARD'],
    'VIEW_CONTESTANT_BIOS': ['ADMIN', 'JUDGE', 'EMCEE', 'ORGANIZER', 'BOARD'],
    'VIEW_JUDGE_BIOS': ['ADMIN', 'EMCEE', 'ORGANIZER', 'BOARD'],
    'GENERATE_REPORTS': ['ADMIN', 'ORGANIZER', 'BOARD', 'AUDITOR'],
    'MANAGE_SETTINGS': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'VIEW_ADMIN': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'MANAGE_FILES': ['ADMIN', 'ORGANIZER', 'BOARD'],
    'VIEW_PERFORMANCE': ['ADMIN', 'ORGANIZER', 'BOARD']
  }

  const allowedRoles = featurePermissions[feature] || [];
  return allowedRoles.includes(userRole);
};

// Get user's accessible features
const getUserFeatures = (userRole: string): string[] => {
  const allFeatures = [
    'CREATE_EVENT', 'EDIT_EVENT', 'DELETE_EVENT',
    'CREATE_CONTEST', 'EDIT_CONTEST', 'DELETE_CONTEST',
    'CREATE_CATEGORY', 'EDIT_CATEGORY', 'DELETE_CATEGORY',
    'MANAGE_USERS', 'ASSIGN_JUDGES', 'VIEW_ALL_SCORES',
    'EDIT_SCORES', 'CERTIFY_SCORES', 'AUDIT_SCORES',
    'BOARD_APPROVAL', 'MANAGE_SCRIPTS', 'VIEW_CONTESTANT_BIOS',
    'VIEW_JUDGE_BIOS', 'GENERATE_REPORTS', 'MANAGE_SETTINGS',
    'VIEW_ADMIN', 'MANAGE_FILES', 'VIEW_PERFORMANCE'
  ]

  return allFeatures.filter(feature => canAccessFeature(feature, userRole))
}

// Middleware to check navigation permissions
const checkNavigationPermission = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const userRole = req.user?.role
    const requestedPath = req.path

    if (!userRole) {
      res.status(401).json({ error: 'User not authenticated' }); return;
    }

    const permissions = getRoutePermissions(requestedPath, userRole)
    
    if (!permissions.allowed) {
      res.status(403).json({ 
        error: 'Access denied', 
        reason: permissions.reason 
      }); return;
    }

    next()
  } catch (error) {
    console.error('Navigation permission check error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get navigation data for frontend
const getNavigationData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userRole = req.user?.role

    if (!userRole) {
      res.status(401).json({ error: 'User not authenticated' }); return;
    }

    const navigationItems = getNavigationItems(userRole)
    const userFeatures = getUserFeatures(userRole)

    res.json({
      navigation: navigationItems,
      features: userFeatures,
      role: userRole
    })
  } catch (error) {
    console.error('Get navigation data error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export { 
  getNavigationItems,
  getRoutePermissions,
  canAccessFeature,
  getUserFeatures,
  checkNavigationPermission,
  getNavigationData
 }
