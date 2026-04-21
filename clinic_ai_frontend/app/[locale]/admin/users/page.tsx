'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Shield,
  Eye,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  UserCog,
  Building2,
  Mail,
  MoreVertical,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  organizationId: string;
  status: 'active' | 'pending' | 'suspended';
  lastLogin: string;
  createdAt: string;
}

// Mock user data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@metrohealth.com',
    role: 'doctor',
    organization: 'Metro Health System',
    organizationId: '1',
    status: 'active',
    lastLogin: '2 hours ago',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@metrohealth.com',
    role: 'admin',
    organization: 'Metro Health System',
    organizationId: '1',
    status: 'active',
    lastLogin: '30 min ago',
    createdAt: '2024-01-15',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.r@sunrisemedical.com',
    role: 'nurse',
    organization: 'Sunrise Medical Group',
    organizationId: '2',
    status: 'active',
    lastLogin: '1 day ago',
    createdAt: '2024-02-20',
  },
  {
    id: '4',
    name: 'Dr. James Wilson',
    email: 'jwilson@valleycare.com',
    role: 'doctor',
    organization: 'Valley Care Clinic',
    organizationId: '3',
    status: 'pending',
    lastLogin: 'Never',
    createdAt: '2024-11-10',
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    email: 'lisa.t@northsidephysicians.com',
    role: 'staff',
    organization: 'Northside Physicians',
    organizationId: '4',
    status: 'active',
    lastLogin: '5 hours ago',
    createdAt: '2024-03-05',
  },
  {
    id: '6',
    name: 'Robert Martinez',
    email: 'rmartinez@communityhealth.org',
    role: 'admin',
    organization: 'Community Health Partners',
    organizationId: '5',
    status: 'active',
    lastLogin: '1 hour ago',
    createdAt: '2024-01-28',
  },
  {
    id: '7',
    name: 'Jennifer Lee',
    email: 'jlee@pacificcoastmed.com',
    role: 'doctor',
    organization: 'Pacific Coast Medical',
    organizationId: '6',
    status: 'suspended',
    lastLogin: '1 week ago',
    createdAt: '2024-04-12',
  },
  {
    id: '8',
    name: 'David Brown',
    email: 'dbrown@mountainviewclinic.com',
    role: 'nurse',
    organization: 'Mountain View Clinic',
    organizationId: '7',
    status: 'active',
    lastLogin: '3 hours ago',
    createdAt: '2024-06-18',
  },
  {
    id: '9',
    name: 'Platform Admin',
    email: 'admin@healthai.com',
    role: 'super_admin',
    organization: 'MedGenie Platform',
    organizationId: '0',
    status: 'active',
    lastLogin: 'Just now',
    createdAt: '2023-01-01',
  },
];

const roleIcons: Record<string, React.ElementType> = {
  doctor: Stethoscope,
  nurse: Users,
  admin: UserCog,
  staff: Users,
  super_admin: Shield,
};

const roleColors: Record<string, string> = {
  doctor: 'text-blue-500',
  nurse: 'text-emerald-500',
  admin: 'text-violet-500',
  staff: 'text-slate-500',
  super_admin: 'text-red-500',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOrg, setSelectedOrg] = useState('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.organization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || user.status === selectedStatus;
    const matchesOrg = selectedOrg === 'all' || user.organizationId === selectedOrg;
    return matchesSearch && matchesRole && matchesStatus && matchesOrg;
  });

  const userStats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  };

  const organizations = Array.from(new Set(users.map(u => ({ id: u.organizationId, name: u.organization }))))
    .filter((org, index, self) => self.findIndex(o => o.id === org.id) === index);

  const handleSuspendUser = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: 'suspended' as const } : u
    ));
  };

  const handleActivateUser = (userId: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: 'active' as const } : u
    ));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-600 mt-1">Manage all users across the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
            Invite User
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
            Add User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-slate-900">{userStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Users</p>
                <p className="text-2xl font-bold text-emerald-600">{userStats.active}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Invites</p>
                <p className="text-2xl font-bold text-amber-600">{userStats.pending}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Suspended</p>
                <p className="text-2xl font-bold text-red-600">{userStats.suspended}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Ban className="w-5 h-5 text-red-600" />
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
                placeholder="Search users by name, email, or organization..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            {/* Organization Filter */}
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="staff">Staff</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>

            {/* Export Button */}
            <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Organization
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => {
                  const RoleIcon = roleIcons[user.role] || Users;
                  return (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.name}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`w-4 h-4 ${roleColors[user.role]}`} />
                          <span className="text-slate-700 capitalize">
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">{user.organization}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            user.status === 'active' ? 'success' :
                              user.status === 'pending' ? 'warning' : 'destructive'
                          }
                          size="sm"
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-500 text-sm">{user.lastLogin}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View user"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          {user.status === 'active' ? (
                            <button
                              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Suspend user"
                              onClick={() => handleSuspendUser(user.id)}
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : user.status === 'suspended' ? (
                            <button
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Activate user"
                              onClick={() => handleActivateUser(user.id)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : null}
                          {user.role !== 'super_admin' && (
                            <button
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Showing <span className="font-medium">1-{filteredUsers.length}</span> of{' '}
              <span className="font-medium">{users.length}</span> users
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
