'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface TenantDetails {
    id: string;
    name: string;
    subscription_plan: string;
    subscription_status: string;
    trial_ends_at?: string;
    max_users: number;
    max_patients: number;
    created_at: string;
}

interface TenantStats {
    usage: {
        users: { current: number; limit: number };
        patients: { current: number; limit: number };
    };
}

export default function SubscriptionPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [tenant, setTenant] = useState<TenantDetails | null>(null);
    const [stats, setStats] = useState<TenantStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                router.replace('/login');
                return;
            }

            if (user.role !== 'admin' && user.role !== 'doctor') {
                router.replace('/provider/dashboard');
                return;
            }

            if (!user?.tenant_id) {
                setLoading(false); // If no tenant_id, stop loading and show appropriate message or redirect
                return;
            }

            try {
                const [tenantData, statsData] = await Promise.all([
                    apiClient.getTenant(user.tenant_id),
                    apiClient.getTenantStats(user.tenant_id)
                ]);
                setTenant(tenantData);
                setStats(statsData);
            } catch (error) {
                console.error('Failed to fetch subscription data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.tenant_id]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!tenant || !stats) {
        return <div>Failed to load subscription details.</div>;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'success';
            case 'trial': return 'warning';
            case 'past_due': return 'destructive';
            default: return 'default';
        }
    };

    const calculatePercentage = (current: number, limit: number) => {
        if (limit === 0) return 100;
        return Math.min((current / limit) * 100, 100);
    };

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
                <p className="text-muted-foreground">
                    Manage your organization's plan and usage limits.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            Current Plan
                            <Badge variant={getStatusColor(tenant.subscription_status) as any}>
                                {tenant.subscription_status.toUpperCase()}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Your current billing cycle and plan details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-4">
                                <div className="rounded-full bg-primary/10 p-2">
                                    <CreditCard className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium capitalize">{tenant.subscription_plan} Plan</p>
                                    {tenant.trial_ends_at && (
                                        <p className="text-sm text-muted-foreground">
                                            Trial ends on {format(new Date(tenant.trial_ends_at), 'MMM d, yyyy')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Button variant="outline">Upgrade</Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Plan Features</h4>
                            <ul className="grid gap-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {tenant.max_users} Team Members
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    {tenant.max_patients} Active Patients
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    AI Clinical Assistant
                                </li>
                                {tenant.subscription_plan === 'enterprise' && (
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        Custom Branding & SSO
                                    </li>
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* Usage Limits Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Usage Limits</CardTitle>
                        <CardDescription>
                            Monitor your resource consumption
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Team Members</span>
                                <span className="text-muted-foreground">
                                    {stats.usage.users.current} / {stats.usage.users.limit}
                                </span>
                            </div>
                            <Progress value={calculatePercentage(stats.usage.users.current, stats.usage.users.limit)} />
                            {calculatePercentage(stats.usage.users.current, stats.usage.users.limit) >= 90 && (
                                <p className="flex items-center gap-1 text-xs text-amber-600">
                                    <AlertTriangle className="h-3 w-3" />
                                    Approaching limit
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">Active Patients</span>
                                <span className="text-muted-foreground">
                                    {stats.usage.patients.current} / {stats.usage.patients.limit}
                                </span>
                            </div>
                            <Progress value={calculatePercentage(stats.usage.patients.current, stats.usage.patients.limit)} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
