/**
 * RBAC Permission Definitions & Utilities
 */

export interface PermissionDefinition {
  id: string;
  name: string;
  category: 'System' | 'Places' | 'Trips' | 'Roulette' | 'Settings';
  description: string;
}

export const SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // Super Admin
  {
    id: '*',
    name: 'Full Admin Access',
    category: 'System',
    description: 'Unrestricted access to all resources, management, and settings',
  },

  // Places
  {
    id: 'places:read',
    name: 'View Places',
    category: 'Places',
    description: 'View places of interest, directions, and file attachments',
  },
  {
    id: 'places:create',
    name: 'Create Places',
    category: 'Places',
    description: 'Add new places with details, files, and coordinates',
  },
  {
    id: 'places:update',
    name: 'Update Places',
    category: 'Places',
    description: 'Edit place details, replace files, and change coordinates',
  },
  {
    id: 'places:delete',
    name: 'Delete Places',
    category: 'Places',
    description: 'Remove places from the database',
  },

  // Trips
  {
    id: 'trips:read',
    name: 'View Trips',
    category: 'Trips',
    description: 'View trip itineraries and planned places',
  },
  {
    id: 'trips:create',
    name: 'Create Trips',
    category: 'Trips',
    description: 'Create new trips and attach places',
  },
  {
    id: 'trips:update',
    name: 'Update Trips',
    category: 'Trips',
    description: 'Edit trips, reorganize itinerary order, and update dates',
  },
  {
    id: 'trips:delete',
    name: 'Delete Trips',
    category: 'Trips',
    description: 'Remove trips from the database',
  },

  // Roulette
  {
    id: 'roulette:read',
    name: 'View Roulettes',
    category: 'Roulette',
    description: 'View roulette configurations and audit history',
  },
  {
    id: 'roulette:create',
    name: 'Create Roulettes',
    category: 'Roulette',
    description: 'Create new weighted roulettes and shareable links',
  },
  {
    id: 'roulette:update',
    name: 'Update Roulettes',
    category: 'Roulette',
    description: 'Edit roulette items, weights, and security settings',
  },
  {
    id: 'roulette:delete',
    name: 'Delete Roulettes',
    category: 'Roulette',
    description: 'Remove roulette configurations (audit logs remain permanent)',
  },
  {
    id: 'roulette:spin',
    name: 'Execute Roulette',
    category: 'Roulette',
    description: 'Spin roulettes and record results to immutable audit trail',
  },

  // Settings & RBAC
  {
    id: 'settings:rbac:read',
    name: 'View Roles & RBAC',
    category: 'Settings',
    description: 'View system roles, permissions, and member assignments',
  },
  {
    id: 'settings:rbac:manage',
    name: 'Manage Roles & RBAC',
    category: 'Settings',
    description: 'Create, update, delete roles and assign email access',
  },
];

/**
 * Checks if user's permissions grant the required permission.
 * '*' grants everything.
 * 'prefix:*' grants all actions under prefix (e.g. 'places:*' grants 'places:read').
 */
export function hasPermission(userPermissions: string[], requiredPermission: string | null): boolean {
  if (!requiredPermission) return true;
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes(requiredPermission)) return true;

  const [prefix] = requiredPermission.split(':');
  if (prefix && userPermissions.includes(`${prefix}:*`)) return true;

  return false;
}
