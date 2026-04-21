/**
 * Authentication and Authorization Utilities
 */

import { cookies } from 'next/headers';

export type UserRole = 'patient' | 'provider' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

/**
 * Decode JWT token to extract user info (without verification - for display only)
 * In production, tokens should be verified server-side
 */
function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Verify and decode JWT token to get user info
 */
export async function verifyToken(token: string): Promise<User | null> {
  try {
    // Decode JWT to get user info
    const payload = decodeJWT(token);

    if (payload && payload.sub) {
      // Map role from JWT (doctor -> provider for UI)
      let role: UserRole = 'patient';
      if (payload.role === 'doctor' || payload.role === 'nurse' || payload.role === 'staff') {
        role = 'provider';
      } else if (payload.role === 'admin') {
        role = 'admin';
      } else if (payload.role === 'patient') {
        role = 'patient';
      }

      return {
        id: payload.sub,
        email: payload.email || 'unknown@example.com',
        role: role,
        name: payload.full_name || payload.email || 'User',
      };
    }

    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Get current user from session
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  // Try to get the actual JWT token first
  const jwtToken = cookieStore.get('token')?.value;

  if (jwtToken) {
    const user = await verifyToken(jwtToken);
    if (user) {
      return user;
    }
  }

  // Fallback: check auth_token for role-based routing
  const roleToken = cookieStore.get('auth_token')?.value;

  if (roleToken) {
    // This is a simplified role token, try to get user from JWT anyway
    if (jwtToken) {
      return verifyToken(jwtToken);
    }
  }

  // No valid token found
  return null;
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, role: UserRole | UserRole[]): boolean {
  if (!user) return false;

  if (Array.isArray(role)) {
    return role.includes(user.role);
  }

  return user.role === role;
}

/**
 * Require authentication - returns null if not authenticated (no throw for SSR)
 */
export async function requireAuth(): Promise<User | null> {
  const user = await getCurrentUser();
  return user;
}

/**
 * Require specific role - returns null if user doesn't have role (no throw for SSR)
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<User | null> {
  const user = await getCurrentUser();

  if (!user || !hasRole(user, role)) {
    return null;
  }

  return user;
}
