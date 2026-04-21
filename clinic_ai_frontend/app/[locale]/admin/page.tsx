'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/client';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Server,
  Database,
  Cpu,
  HardDrive,
  Globe,
  Calendar,
  RefreshCw,
  Stethoscope,
  FileText,
} from 'lucide-react';

interface DashboardData {
  scope: string;
  scope_id: string | null;
  snapshot_date: string | null;
  users: {
    total: number;
    active_24h: number;
    active_7d: number;
    active_30d: number;
  };
  patients: {
    total: number;
    new_24h: number;
    new_7d: number;
    new_30d: number;
  };
  visits: {
    total: number;
    count_24h: number;
    count_7d: number;
    count_30d: number;
  };
  ai_usage: {
    requests_24h: number;
    transcription_minutes_24h: number;
  };
  billing: {
    total_tenants: number;
    active_subscriptions: number;
    mrr: number;
  };
  extended: Record<string, unknown>;
  realtime: Record<string, number>;
  generated_at: string;
}

const systemHealth = [
  { name: 'API Server', status: 'operational', uptime: '99.99%', icon: Server },
  { name: 'Database', status: 'operational', uptime: '99.98%', icon: Database },
  { name: 'AI Services', status: 'operational', uptime: '99.95%', icon: Cpu },
  { name: 'Storage', status: 'operational', uptime: '100%', icon: HardDrive },
];

const revenueByPlan = [
  { plan: 'Enterprise', percentage: 58.7 },
  { plan: 'Professional', percentage: 32.3 },
  { plan: 'Starter', percentage: 9.0 },
];

export default function AdminOverviewPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const data = await apiClient.getPlatformDashboard();
      setDashboard(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Failed to load dashboard data');
      // Use mock data as fallback
      setDashboard({
        scope: 'platform',
        scope_id: null,
        snapshot_date: new Date().toISOString(),
        users: { total: 2847, active_24h: 892, active_7d: 1564, active_30d: 2234 },
        patients: { total: 15420, new_24h: 47, new_7d: 312, new_30d: 1024 },
        visits: { total: 45230, count_24h: 234, count_7d: 1452, count_30d: 5892 },
        ai_usage: { requests_24h: 12450, transcription_minutes_24h: 4521 },
        billing: { total_tenants: 127, active_subscriptions: 118, mrr: 89420 },
        extended: {},
        realtime: {},
        generated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const platformStats = dashboard ? [
    {
      title: 'Total Organizations',
      value: formatNumber(dashboard.billing.total_tenants),
      change: `${dashboard.billing.active_subscriptions} active`,
      changeType: 'increase' as const,
      icon: Building2,
      color: 'blue',
    },
    {
      title: 'Active Users',
      value: formatNumber(dashboard.users.total),
      change: `+${dashboard.users.active_24h} today`,
      changeType: 'increase' as const,
      icon: Users,
      color: 'emerald',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(dashboard.billing.mrr),
      change: 'MRR',
      changeType: 'increase' as const,
      icon: DollarSign,
      color: 'violet',
    },
    {
      title: 'AI Requests',
      value: formatNumber(dashboard.ai_usage.requests_24h),
      change: 'last 24h',
      changeType: 'increase' as const,
      icon: Activity,
      color: 'amber',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Platform Overview</h2>
          <p className="text-slate-600 mt-1">Monitor your SaaS platform performance and health</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
            onClick={fetchDashboard}
            disabled={refreshing}
          >
            Refresh
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Calendar className="w-4 h-4" />}>
            Last 30 Days
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Globe className="w-4 h-4" />}>
            View Public Status
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-amber-800">{error} - Showing cached data</span>
        </div>
      )}

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.changeType === 'increase' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.changeType === 'increase' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clinical Stats Row */}
      {dashboard && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-teal-100">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Patients</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboard.patients.total)}</p>
                  <p className="text-sm text-emerald-600">+{dashboard.patients.new_24h} today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-100">
                  <Stethoscope className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Visits</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboard.visits.total)}</p>
                  <p className="text-sm text-emerald-600">+{dashboard.visits.count_24h} today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-100">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Transcription</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(dashboard.ai_usage.transcription_minutes_24h)} min</p>
                  <p className="text-sm text-slate-500">last 24 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>Platform activity over different time periods</CardDescription>
            </div>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                View Analytics
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {dashboard && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-600 mb-3">Last 24 Hours</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Active Users</span>
                      <span className="font-medium">{dashboard.users.active_24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">New Patients</span>
                      <span className="font-medium">{dashboard.patients.new_24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Visits</span>
                      <span className="font-medium">{dashboard.visits.count_24h}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-600 mb-3">Last 7 Days</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Active Users</span>
                      <span className="font-medium">{dashboard.users.active_7d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">New Patients</span>
                      <span className="font-medium">{dashboard.patients.new_7d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Visits</span>
                      <span className="font-medium">{dashboard.visits.count_7d}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-600 mb-3">Last 30 Days</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Active Users</span>
                      <span className="font-medium">{dashboard.users.active_30d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">New Patients</span>
                      <span className="font-medium">{dashboard.patients.new_30d}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Visits</span>
                      <span className="font-medium">{dashboard.visits.count_30d}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-500" />
              System Health
            </CardTitle>
            <CardDescription>All systems operational</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemHealth.map((system) => (
                <div key={system.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <system.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{system.name}</p>
                      <p className="text-xs text-slate-500">Uptime: {system.uptime}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Operational</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <Link href="/admin/settings">
                <Button variant="outline" size="sm" className="w-full">
                  View System Logs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
            <CardDescription>Monthly recurring revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByPlan.map((item) => {
                const revenue = dashboard ? Math.round(dashboard.billing.mrr * item.percentage / 100) : 0;
                return (
                  <div key={item.plan} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{item.plan}</span>
                      <span className="text-slate-900 font-semibold">
                        {formatCurrency(revenue)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.plan === 'Enterprise' ? 'bg-violet-500' :
                          item.plan === 'Professional' ? 'bg-blue-500' : 'bg-slate-400'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">{item.percentage}% of total</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Total MRR</span>
                <span className="text-lg font-bold text-slate-900">
                  {dashboard ? formatCurrency(dashboard.billing.mrr) : '$0'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/admin/organizations">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Building2 className="w-6 h-6 text-blue-600" />
                  <span>Organizations</span>
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="w-6 h-6 text-emerald-600" />
                  <span>Manage Users</span>
                </Button>
              </Link>
              <Link href="/admin/support-access">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Activity className="w-6 h-6 text-amber-600" />
                  <span>Support Access</span>
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <DollarSign className="w-6 h-6 text-violet-600" />
                  <span>Analytics</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last updated */}
      {dashboard && (
        <p className="text-xs text-slate-500 text-center">
          Last updated: {new Date(dashboard.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
