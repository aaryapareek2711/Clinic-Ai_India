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

export function homePathForRole(role: AppRole): string {
  if (role === 'super_admin') return '/admin';
  if (role === 'patient') return '/patient/dashboard';
  return '/clinic/dashboard';
}
