import { AppUser } from './api';

export type AppRole = 'GESTOR' | 'SUPERVISOR' | 'VENDEDOR';

export function normalizeAppRole(rawRole?: string): AppRole {
  const normalized = String(rawRole || '').trim().toLowerCase();

  if (
    normalized === 'gestor' ||
    normalized === 'admin' ||
    normalized === 'manager' ||
    normalized === 'administrador'
  ) {
    return 'GESTOR';
  }

  if (
    normalized === 'supervisor' ||
    normalized === 'coordenador' ||
    normalized === 'coodenador' ||
    normalized === 'coordinator'
  ) {
    return 'SUPERVISOR';
  }

  return 'VENDEDOR';
}

export function getUserAppRole(user?: AppUser | null): AppRole {
  return normalizeAppRole(user?.role);
}

export function canAccessGeneralSettings(role: AppRole): boolean {
  return role === 'GESTOR';
}

export function canManageSellerGoals(role: AppRole): boolean {
  return role === 'GESTOR';
}

export function canManageUsers(role: AppRole): boolean {
  return role === 'GESTOR';
}
