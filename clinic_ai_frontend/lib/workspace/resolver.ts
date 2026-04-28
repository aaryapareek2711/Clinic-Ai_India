/**
 * Workspace route helpers.
 * `/clinic` is the primary workspace, while `/provider` is legacy compatibility.
 */
export type WorkspaceBase = '/clinic' | '/provider';
export type AppRole = 'super_admin' | 'patient' | string | undefined;

export function workspaceBaseFromPathname(pathname: string | null): WorkspaceBase {
  if (!pathname) return '/clinic';
  return pathname.includes('/provider') ? '/provider' : '/clinic';
}

export function normalizeWorkspacePath(pathname: string): string {
  return pathname.replace('/provider', '/clinic');
}

export function localePrefixFromPathname(pathname: string | null): string {
  if (!pathname) return '/en';
  const match = pathname.match(/^\/(en|hi|fr)(\/|$)/);
  return match ? `/${match[1]}` : '/en';
}

export function localizedWorkspacePath(pathname: string | null, targetPath: string): string {
  const normalizedTarget = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return `${localePrefixFromPathname(pathname)}${normalizedTarget}`;
}

export function homePathForRole(role: AppRole): string {
  if (role === 'super_admin') return '/admin';
  if (role === 'patient') return '/patient/dashboard';
  return '/clinic/dashboard';
}
