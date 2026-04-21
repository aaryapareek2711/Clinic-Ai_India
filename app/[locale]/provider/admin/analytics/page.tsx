'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import apiClient from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Activity, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AnalyticsData {
    tenant_id: string;
    period: string;
    metrics: {
        documents: Record<string, number>;
        patients: {
            new: number;
            total: number;
            growth_rate: number;
        };
    };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!user?.tenant_id) return;

            setLoading(true);
            try {
                const analyticsData = await apiClient.getTenantAnalytics(user.tenant_id, period);
                setData(analyticsData);
            } catch (error) {
                console.error('Failed to fetch analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        // Added access control logic as per instruction
        if (!isAuthenticated || !user) {
            router.replace('/login');
        } else if (user.role !== 'admin' && user.role !== 'doctor') {
            router.replace('/provider/dashboard');
        } else {
            fetchAnalytics();
        }
    }, [user?.tenant_id, period, isAuthenticated, user, router]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!data) {
        return <div>Failed to load analytics.</div>;
    }

    // Transform document metrics for chart
    const documentChartData = Object.entries(data.metrics.documents).map(([key, value]) => ({
        name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count: value,
    })).filter(item => item.count > 0);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">
                        Insights into your practice's performance and usage.
                    </p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Key Metrics Cards */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.metrics.patients.total}</div>
                        <p className="text-xs text-muted-foreground">
                            +{data.metrics.patients.new} new in this period
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.metrics.patients.growth_rate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            Patient base growth
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Object.values(data.metrics.documents).reduce((a, b) => a + b, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Generated in this period
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Document Distribution Chart */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Clinical Documentation</CardTitle>
                        <CardDescription>
                            Breakdown of documents generated (Transcripts, SOAP Notes, etc.)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {documentChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={documentChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8884d8">
                                        {documentChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                No data available for this period
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
