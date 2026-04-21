'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  Shield,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
} from 'lucide-react';

interface SupportGrant {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  granted_to_user_id: string;
  granted_to_email?: string;
  granted_by_user_id: string;
  granted_by_email?: string;
  access_level: 'metadata' | 'full';
  reason?: string;
  granted_at: string;
  expires_at: string;
  revoked_at?: string;
  revoked_by?: string;
  revoke_reason?: string;
}

export default function SupportAccessPage() {
  const [grants, setGrants] = useState<SupportGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOnly, setActiveOnly] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchGrants = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAllSupportGrants(activeOnly);
      setGrants(data.grants || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch support grants:', err);
      setError('Failed to load support access grants');
      // Mock data for development
      setGrants([
        {
          id: '1',
          tenant_id: 'tenant-1',
          tenant_name: 'Metro Health System',
          granted_to_user_id: 'user-1',
          granted_to_email: 'support@medgenie.com',
          granted_by_user_id: 'admin-1',
          granted_by_email: 'admin@metrohealth.com',
          access_level: 'metadata',
          reason: 'Investigating billing discrepancy',
          granted_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          tenant_id: 'tenant-2',
          tenant_name: 'Sunrise Medical Group',
          granted_to_user_id: 'user-2',
          granted_to_email: 'tech@medgenie.com',
          granted_by_user_id: 'admin-2',
          granted_by_email: 'dr.smith@sunrise.com',
          access_level: 'full',
          reason: 'Data migration support',
          granted_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, [activeOnly]);

  const handleRevoke = async (grantId: string) => {
    try {
      setRevoking(grantId);
      await apiClient.revokeSupportGrant(grantId, 'Revoked by admin');
      await fetchGrants();
    } catch (err) {
      console.error('Failed to revoke grant:', err);
      setError('Failed to revoke support access');
    } finally {
      setRevoking(null);
    }
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) <= new Date();
  };

  const activeGrants = grants.filter(g => !g.revoked_at && !isExpired(g.expires_at));
  const expiredGrants = grants.filter(g => g.revoked_at || isExpired(g.expires_at));

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
          <h2 className="text-2xl font-bold text-slate-900">Support Access Management</h2>
          <p className="text-slate-600 mt-1">
            Manage consent-based support access to tenant data (HIPAA/DPDP compliant)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={activeOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(true)}
          >
            Active Only
          </Button>
          <Button
            variant={!activeOnly ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveOnly(false)}
          >
            All Grants
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={fetchGrants}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-amber-800">{error}</span>
        </div>
      )}

      {/* Compliance Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Healthcare Compliance</p>
              <p className="text-sm text-blue-700 mt-1">
                All support access grants are time-limited (max 48 hours), require explicit tenant consent,
                and are fully audited. Support agents can only access data during active grant periods.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Active Grants</p>
                <p className="text-2xl font-bold text-slate-900">{activeGrants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-slate-900">
                  {activeGrants.filter(g => {
                    const hoursLeft = (new Date(g.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
                    return hoursLeft > 0 && hoursLeft < 6;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-slate-100">
                <XCircle className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Expired/Revoked</p>
                <p className="text-2xl font-bold text-slate-900">{expiredGrants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Grants */}
      {activeGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Active Support Grants
            </CardTitle>
            <CardDescription>Currently active consent-based access grants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-500" />
                        <span className="font-medium text-slate-900">
                          {grant.tenant_name || grant.tenant_id}
                        </span>
                        <Badge
                          variant={grant.access_level === 'full' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {grant.access_level === 'full' ? (
                            <><Eye className="w-3 h-3 mr-1" /> Full Access</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" /> Metadata Only</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <User className="w-4 h-4" />
                        <span>Granted to: {grant.granted_to_email || grant.granted_to_user_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="w-4 h-4" />
                        <span>Granted: {new Date(grant.granted_at).toLocaleString()}</span>
                      </div>
                      {grant.reason && (
                        <p className="text-sm text-slate-600 italic">
                          Reason: {grant.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant="info" size="sm">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimeRemaining(grant.expires_at)}
                      </Badge>
                      <div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRevoke(grant.id)}
                          disabled={revoking === grant.id}
                        >
                          {revoking === grant.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            'Revoke'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired/Revoked Grants */}
      {!activeOnly && expiredGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-slate-500" />
              Expired/Revoked Grants
            </CardTitle>
            <CardDescription>Historical support access records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiredGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 opacity-60"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {grant.tenant_name || grant.tenant_id}
                        </span>
                        <Badge variant="outline" size="sm">
                          {grant.revoked_at ? 'Revoked' : 'Expired'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <User className="w-4 h-4" />
                        <span>Granted to: {grant.granted_to_email || grant.granted_to_user_id}</span>
                      </div>
                      {grant.revoked_at && (
                        <p className="text-sm text-slate-500">
                          Revoked: {new Date(grant.revoked_at).toLocaleString()}
                          {grant.revoke_reason && ` - ${grant.revoke_reason}`}
                        </p>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {grant.access_level} access
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {grants.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Support Access Grants</h3>
            <p className="text-slate-600">
              There are no {activeOnly ? 'active' : ''} support access grants at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
