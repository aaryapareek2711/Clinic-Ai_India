'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  Building2,
  Calendar,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Receipt,
  ArrowUpRight,
  Filter,
  Eye,
  Mail,
  RefreshCw,
} from 'lucide-react';

interface Invoice {
  id: string;
  organization: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  dueDate: string;
  paidDate?: string;
  plan: string;
}

const mockInvoices: Invoice[] = [
  { id: 'INV-001', organization: 'Metro Health System', amount: 2499, status: 'paid', dueDate: '2024-11-15', paidDate: '2024-11-12', plan: 'Enterprise' },
  { id: 'INV-002', organization: 'Atlantic Health Network', amount: 2499, status: 'paid', dueDate: '2024-11-15', paidDate: '2024-11-14', plan: 'Enterprise' },
  { id: 'INV-003', organization: 'Sunrise Medical Group', amount: 599, status: 'pending', dueDate: '2024-11-25', plan: 'Professional' },
  { id: 'INV-004', organization: 'Pacific Coast Medical', amount: 599, status: 'overdue', dueDate: '2024-11-10', plan: 'Professional' },
  { id: 'INV-005', organization: 'Community Health Partners', amount: 2499, status: 'paid', dueDate: '2024-11-15', paidDate: '2024-11-15', plan: 'Enterprise' },
  { id: 'INV-006', organization: 'Valley Care Clinic', amount: 299, status: 'failed', dueDate: '2024-11-18', plan: 'Starter' },
  { id: 'INV-007', organization: 'Northside Physicians', amount: 599, status: 'paid', dueDate: '2024-11-20', paidDate: '2024-11-19', plan: 'Professional' },
  { id: 'INV-008', organization: 'Mountain View Clinic', amount: 299, status: 'pending', dueDate: '2024-11-28', plan: 'Starter' },
];

const billingStats = {
  mrr: 89420,
  mrrGrowth: 20.5,
  collected: 78450,
  pending: 8970,
  overdue: 2000,
  churnRate: 2.1,
};

const subscriptionBreakdown = [
  { plan: 'Enterprise', count: 21, mrr: 52479, color: 'bg-violet-500' },
  { plan: 'Professional', count: 48, mrr: 28752, color: 'bg-blue-500' },
  { plan: 'Starter', count: 27, mrr: 8073, color: 'bg-emerald-500' },
  { plan: 'Trial', count: 31, mrr: 0, color: 'bg-slate-400' },
];

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" size="sm">Paid</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive" size="sm">Overdue</Badge>;
      case 'failed':
        return <Badge variant="destructive" size="sm">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Billing & Revenue</h2>
          <p className="text-slate-600 mt-1">Manage subscriptions, invoices, and revenue</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
            Export Report
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Receipt className="w-4 h-4" />}>
            Generate Invoices
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Monthly Recurring Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${billingStats.mrr.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600">
                    +{billingStats.mrrGrowth}%
                  </span>
                  <span className="text-sm text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Collected This Month</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  ${billingStats.collected.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {Math.round((billingStats.collected / billingStats.mrr) * 100)}% of MRR
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Payments</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">
                  ${billingStats.pending.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {invoices.filter(i => i.status === 'pending').length} invoices
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Overdue Amount</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  ${billingStats.overdue.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  {invoices.filter(i => i.status === 'overdue').length} invoices
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown & Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Breakdown</CardTitle>
            <CardDescription>Active subscriptions by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptionBreakdown.map((item) => (
                <div key={item.plan} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-12 rounded-full ${item.color}`} />
                    <div>
                      <p className="font-medium text-slate-900">{item.plan}</p>
                      <p className="text-sm text-slate-500">{item.count} organizations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      ${item.mrr.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">/month</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-700">Total Active</span>
              <span className="text-lg font-bold text-slate-900">
                {subscriptionBreakdown.reduce((sum, item) => sum + item.count, 0)} organizations
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Actions</CardTitle>
            <CardDescription>Common billing operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Send Reminders</span>
                <span className="text-xs text-slate-500">3 overdue</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <span className="text-sm">Retry Failed</span>
                <span className="text-xs text-slate-500">1 failed</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <Receipt className="w-5 h-5 text-violet-600" />
                <span className="text-sm">View All Invoices</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                <CreditCard className="w-5 h-5 text-amber-600" />
                <span className="text-sm">Payment Methods</span>
              </Button>
            </div>

            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Action Required</p>
                  <p className="text-sm text-amber-700 mt-1">
                    2 organizations have overdue payments. Consider sending payment reminders or reaching out directly.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100">
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>All billing transactions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by organization or invoice ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Invoice
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Organization
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Plan
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Amount
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Due Date
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-900">{invoice.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900">{invoice.organization}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          invoice.plan === 'Enterprise' ? 'primary' :
                          invoice.plan === 'Professional' ? 'info' : 'outline'
                        }
                        size="sm"
                      >
                        {invoice.plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">
                        ${invoice.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600">{invoice.dueDate}</span>
                      {invoice.paidDate && (
                        <p className="text-xs text-slate-500">Paid: {invoice.paidDate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                          <Download className="w-4 h-4" />
                        </button>
                        {invoice.status === 'overdue' && (
                          <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                        {invoice.status === 'failed' && (
                          <button className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-medium">1-{filteredInvoices.length}</span> of{' '}
              <span className="font-medium">{invoices.length}</span> invoices
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                1
              </Button>
              <Button variant="outline" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
