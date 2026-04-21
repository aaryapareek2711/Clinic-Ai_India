'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { Loader2, Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AuditLog {
    id: string;
    tenant_id: string;
    user_email: string;
    user_role: string;
    action: string;
    resource_type: string;
    description: string;
    created_at: string;
}

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const pageSize = 50;

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getGlobalAuditLogs({
                skip: (page - 1) * pageSize,
                limit: pageSize
            });
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
                <p className="text-muted-foreground">
                    System-wide activity and security logs.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Recent administrative actions across the platform</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm">Page {page}</span>
                            <Button variant="outline" size="sm" disabled={logs.length < pageSize} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">User</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Resource</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                No logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                <td className="p-4 align-middle">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{log.user_email}</span>
                                                        <span className="text-xs text-muted-foreground capitalize">{log.user_role}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-middle">
                                                    <Badge variant={
                                                        log.action === 'CREATE' ? 'success' :
                                                            log.action === 'UPDATE' ? 'info' :
                                                                log.action === 'DELETE' ? 'danger' :
                                                                    log.action === 'SUSPEND' ? 'warning' : 'default'
                                                    }>
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 align-middle capitalize">
                                                    {log.resource_type}
                                                </td>
                                                <td className="p-4 align-middle text-muted-foreground">
                                                    {log.description}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
