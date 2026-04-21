'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  Shield,
  Users,
  Building2,
  Globe,
  RefreshCw,
  CheckCircle2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  scope: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

const scopeIcons: Record<string, React.ElementType> = {
  platform: Globe,
  regional: Building2,
  tenant: Users,
};

const scopeColors: Record<string, string> = {
  platform: 'violet',
  regional: 'blue',
  tenant: 'emerald',
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAvailableRoles();
      setRoles(data.roles || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      setError('Failed to load roles');
      // Mock data for development
      setRoles([
        {
          id: '1',
          name: 'super_admin',
          display_name: 'Super Administrator',
          description: 'Full platform access with all permissions',
          scope: 'platform',
          permissions: ['*'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'compliance_officer',
          display_name: 'Compliance Officer',
          description: 'Access to audit logs and compliance features',
          scope: 'platform',
          permissions: ['view_audit_logs', 'view_analytics', 'manage_consent'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          name: 'regional_admin',
          display_name: 'Regional Administrator',
          description: 'Manage tenants and users within a region',
          scope: 'regional',
          permissions: ['manage_tenants', 'manage_users', 'view_analytics'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '4',
          name: 'support_agent',
          display_name: 'Support Agent',
          description: 'Limited access for customer support',
          scope: 'platform',
          permissions: ['view_tenant_metadata', 'support_access'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '5',
          name: 'tenant_admin',
          display_name: 'Tenant Administrator',
          description: 'Full access within their organization',
          scope: 'tenant',
          permissions: ['manage_users', 'manage_patients', 'view_analytics', 'manage_settings'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '6',
          name: 'provider',
          display_name: 'Healthcare Provider',
          description: 'Clinical access for doctors and nurses',
          scope: 'tenant',
          permissions: ['clinical_access', 'view_patients', 'manage_visits', 'use_ai_assistant'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '7',
          name: 'staff',
          display_name: 'Staff',
          description: 'Administrative staff with limited clinical access',
          scope: 'tenant',
          permissions: ['view_patients', 'manage_appointments', 'view_visits'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
        {
          id: '8',
          name: 'patient',
          display_name: 'Patient',
          description: 'Patient portal access',
          scope: 'tenant',
          permissions: ['view_own_records', 'manage_appointments'],
          is_system: true,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const groupedRoles = roles.reduce((acc, role) => {
    if (!acc[role.scope]) acc[role.scope] = [];
    acc[role.scope].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Role Management</h2>
          <p className="text-slate-600 mt-1">
            Configure roles and permissions for the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchRoles}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-500" />
          <span className="text-amber-800">{error}</span>
        </div>
      )}

      {/* Scope Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-slate-600">Scope Levels:</span>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-violet-500" />
              <span className="text-sm text-slate-700">Platform</span>
              <span className="text-xs text-slate-500">(System-wide)</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">Regional</span>
              <span className="text-xs text-slate-500">(US, CA, IN)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-slate-700">Tenant</span>
              <span className="text-xs text-slate-500">(Organization)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles by Scope */}
      {['platform', 'regional', 'tenant'].map((scope) => {
        const scopeRoles = groupedRoles[scope] || [];
        const Icon = scopeIcons[scope] || Shield;
        const color = scopeColors[scope] || 'slate';

        return (
          <Card key={scope}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className={`w-5 h-5 text-${color}-500`} />
                {scope.charAt(0).toUpperCase() + scope.slice(1)} Roles
              </CardTitle>
              <CardDescription>
                {scope === 'platform' && 'System-wide roles for platform administration'}
                {scope === 'regional' && 'Regional administration roles (US, Canada, India)'}
                {scope === 'tenant' && 'Organization-level roles for tenants'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scopeRoles.map((role) => (
                  <div
                    key={role.id}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg bg-${color}-100`}>
                          {role.is_system ? (
                            <Lock className={`w-4 h-4 text-${color}-600`} />
                          ) : (
                            <Unlock className={`w-4 h-4 text-${color}-600`} />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {role.display_name}
                            </span>
                            {role.is_system && (
                              <Badge variant="outline" size="sm">System</Badge>
                            )}
                            {role.permissions.includes('*') && (
                              <Badge variant="danger" size="sm">Full Access</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{role.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="info" size="sm">
                          {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                        </Badge>
                        {expandedRole === role.id ? (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Permissions */}
                    {expandedRole === role.id && (
                      <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-600 mb-3">Permissions:</p>
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map((permission) => (
                            <Badge key={permission} variant="outline" size="sm">
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                              {permission === '*' ? 'All Permissions' : permission.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                          Role name: <code className="bg-slate-200 px-1 rounded">{role.name}</code>
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {scopeRoles.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No roles defined for this scope
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Role-Based Access Control</p>
              <p className="text-sm text-blue-700 mt-1">
                System roles cannot be modified. Each role defines a set of permissions that determine
                what actions users can perform. Roles are scoped to platform, regional, or tenant level.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
