import { MODULE_MAP } from '@/shared/config/systemModules';

export const normalizePermission = (permission: string): string =>
  typeof permission === 'string' ? permission.toLowerCase() : '';

export const hasPermission = (permissions: string[] | undefined, permission: string): boolean => {
  if (!permissions || permissions.length === 0) return false;
  const wanted = normalizePermission(permission);
  if (!wanted) return false;
  return permissions.some((p) => normalizePermission(p) === wanted);
};

export const hasRequiredPermission = (userPermissions: string[] | undefined, required: string[]): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;
  const userPermSet = new Set(userPermissions.map(normalizePermission));
  return required
    .map(normalizePermission)
    .filter((p) => p.length > 0)
    .some((p) => userPermSet.has(p));
};

export const hasModulePermission = (userPermissions: string[] | undefined, moduleKey: string): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;
  const mod = MODULE_MAP[moduleKey];
  if (!mod) return false;
  const permSet = new Set(userPermissions);
  return mod.permissionCodes.some((code) => permSet.has(code));
};