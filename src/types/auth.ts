export enum Role {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Permission {
  action: string;
  resource: string;
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.GUEST]: [
    { action: 'read', resource: 'public' },
    { action: 'read', resource: 'books' },
    { action: 'search', resource: 'books' }
  ],
  [Role.USER]: [
    { action: 'read', resource: 'public' },
    { action: 'read', resource: 'books' },
    { action: 'search', resource: 'books' },
    { action: 'borrow', resource: 'books' },
    { action: 'return', resource: 'books' },
    { action: 'read', resource: 'borrow-history' },
    { action: 'create', resource: 'comments' },
    { action: 'update', resource: 'profile' },
    { action: 'read', resource: 'profile' }
  ],
  [Role.ADMIN]: [
    { action: 'read', resource: 'public' },
    { action: 'read', resource: 'books' },
    { action: 'search', resource: 'books' },
    { action: 'borrow', resource: 'books' },
    { action: 'return', resource: 'books' },
    { action: 'read', resource: 'borrow-history' },
    { action: 'create', resource: 'books' },
    { action: 'update', resource: 'books' },
    { action: 'delete', resource: 'books' },
    { action: 'manage', resource: 'inventory' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    { action: 'manage', resource: 'borrow-records' },
    { action: 'create', resource: 'fines' },
    { action: 'update', resource: 'fines' },
    { action: 'manage', resource: 'system' },
    { action: 'create', resource: 'comments' },
    { action: 'update', resource: 'profile' },
    { action: 'read', resource: 'profile' }
  ]
};

export function hasPermission(userRole: Role, action: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.some(
    permission => permission.action === action && permission.resource === resource
  );
}

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  const roleHierarchy = {
    [Role.GUEST]: 0,
    [Role.USER]: 1,
    [Role.ADMIN]: 2
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
