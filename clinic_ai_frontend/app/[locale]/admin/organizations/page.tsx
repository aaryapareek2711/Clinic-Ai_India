'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Search,
  Plus,
  MoreVertical,
  Users,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  Eye,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Activity,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: string;
  is_active: boolean;
  subscription_plan: string;
  subscription_status: string;
  max_users: int;
  max_patients: int;
  onboarding_completed: boolean;
  created_at: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Tenant | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getTenants();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuspend = async (org: Tenant) => {
    if (!confirm(`Are you sure you want to suspend ${org.name}?`)) return;
    try {
      await apiClient.suspendTenant(org.id);
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to suspend organization:', error);
    }
  };

  const handleActivate = async (org: Tenant) => {
    try {
      await apiClient.activateTenant(org.id);
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to activate organization:', error);
    }
  };

  const handleEdit = (org: Tenant) => {
    setEditingOrg(org);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      setIsSubmitting(true);
      await apiClient.updateTenant(editingOrg.id, {
        name: editingOrg.name,
        subscription_plan: editingOrg.subscription_plan,
        max_users: editingOrg.max_users,
        max_patients: editingOrg.max_patients,
      });
      setIsEditModalOpen(false);
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to update organization:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = selectedPlan === 'all' || org.subscription_plan.toLowerCase() === selectedPlan;
    const matchesStatus = selectedStatus === 'all' || org.status === selectedStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // const totalMRR = filteredOrgs.reduce((sum, org) => sum + org.mrr, 0); // MRR not available in API yet
  const totalUsers = filteredOrgs.reduce((sum, org) => sum + org.max_users, 0); // Using max_users as proxy for capacity

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organizations</h2>
          <p className="text-slate-600 mt-1">Manage all organizations on the platform</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
          Add Organization
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Organizations</p>
                <p className="text-2xl font-bold text-slate-900">{filteredOrgs.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Capacity</p>
                <p className="text-2xl font-bold text-slate-900">{totalUsers.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Subscriptions</p>
                <p className="text-2xl font-bold text-slate-900">
                  {organizations.filter(o => o.subscription_status === 'active').length}
                </p>
              </div>
              <div className="p-3 bg-violet-100 rounded-xl">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Trials</p>
                <p className="text-2xl font-bold text-slate-900">
                  {organizations.filter(o => o.subscription_status === 'trial').length}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Plan Filter */}
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Plans</option>
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Export Button */}
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Max Users
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Loading organizations...
                    </td>
                  </tr>
                ) : filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No organizations found.
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {org.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{org.name}</p>
                            <p className="text-sm text-slate-500">{org.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            org.subscription_plan === 'enterprise' ? 'primary' :
                              org.subscription_plan === 'professional' ? 'info' : 'outline'
                          }
                          size="sm"
                        >
                          {org.subscription_plan}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            org.status === 'active' ? 'success' :
                              org.status === 'trial' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {org.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 font-medium">{org.max_users}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 text-sm">
                          {new Date(org.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={() => handleEdit(org)}
                            title="Edit Organization"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {org.status === 'suspended' ? (
                            <button
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              onClick={() => handleActivate(org)}
                              title="Activate Organization"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              onClick={() => handleSuspend(org)}
                              title="Suspend Organization"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-medium">1-{filteredOrgs.length}</span> of{' '}
              <span className="font-medium">{organizations.length}</span> organizations
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                1
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Make changes to the organization here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {editingOrg && (
            <form onSubmit={handleSaveEdit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={editingOrg.name}
                    onChange={(e) => setEditingOrg({ ...editingOrg, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="plan" className="text-right">
                    Plan
                  </Label>
                  <div className="col-span-3">
                    <select
                      id="plan"
                      value={editingOrg.subscription_plan}
                      onChange={(e) => setEditingOrg({ ...editingOrg, subscription_plan: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="trial">Trial</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_users" className="text-right">
                    Max Users
                  </Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={editingOrg.max_users}
                    onChange={(e) => setEditingOrg({ ...editingOrg, max_users: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="max_patients" className="text-right">
                    Max Patients
                  </Label>
                  <Input
                    id="max_patients"
                    type="number"
                    value={editingOrg.max_patients}
                    onChange={(e) => setEditingOrg({ ...editingOrg, max_patients: parseInt(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
