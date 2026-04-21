"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Loader2, Mail, Clock } from "lucide-react";
import apiClient from "@/lib/api/client";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: string;
    tenant_id: string;
}

interface Invitation {
    id: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    expires_at: string;
}

export default function SettingsPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("staff");
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [userData, usersData] = await Promise.all([
                apiClient.getCurrentUser(),
                apiClient.getUsers()
            ]);
            setCurrentUser(userData);
            setUsers(usersData);

            if (userData.tenant_id) {
                const invitationsData = await apiClient.getInvitations(userData.tenant_id);
                setInvitations(invitationsData);
            }
        } catch (error) {
            console.error("Failed to load settings data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        try {
            await apiClient.updateUserRole(userId, newRole);
            // Refresh list
            const usersData = await apiClient.getUsers();
            setUsers(usersData);
        } catch (error) {
            console.error("Failed to update role", error);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser?.tenant_id) return;

        try {
            setIsInviting(true);
            await apiClient.createInvitation(currentUser.tenant_id, {
                email: inviteEmail,
                role: inviteRole
            });

            // Refresh invitations
            const invitationsData = await apiClient.getInvitations(currentUser.tenant_id);
            setInvitations(invitationsData);

            setIsInviteModalOpen(false);
            setInviteEmail("");
            setInviteRole("staff");
        } catch (error) {
            console.error("Failed to invite user", error);
            alert("Failed to invite user. Please check if the email is already invited or registered.");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="organization">Organization</TabsTrigger>
                    <TabsTrigger value="team">Team Members</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Settings</CardTitle>
                            <CardDescription>Manage your personal information.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <Input id="name" defaultValue={currentUser?.full_name} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" defaultValue={currentUser?.email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Role</Label>
                                <Input id="role" defaultValue={currentUser?.role} disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="organization">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organization Settings</CardTitle>
                            <CardDescription>Manage your organization details.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Organization Name</Label>
                                <Input defaultValue="Antigravity Healthcare" disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Subscription Plan</Label>
                                <Input defaultValue="Professional" disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Team Management</CardTitle>
                                <CardDescription>Manage users and their roles within your organization.</CardDescription>
                            </div>
                            <Button onClick={() => setIsInviteModalOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Member
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="p-4 text-left font-medium">Name</th>
                                            <th className="p-4 text-left font-medium">Email</th>
                                            <th className="p-4 text-left font-medium">Role</th>
                                            <th className="p-4 text-left font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id} className="border-t">
                                                <td className="p-4">{user.full_name}</td>
                                                <td className="p-4">{user.email}</td>
                                                <td className="p-4">
                                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <Select
                                                        defaultValue={user.role}
                                                        onValueChange={(value) => handleRoleUpdate(user.id, value)}
                                                        disabled={currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin'}
                                                    >
                                                        <SelectTrigger className="w-[140px]">
                                                            <SelectValue placeholder="Select role" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">Admin</SelectItem>
                                                            <SelectItem value="doctor">Doctor</SelectItem>
                                                            <SelectItem value="nurse">Nurse</SelectItem>
                                                            <SelectItem value="staff">Staff</SelectItem>
                                                            <SelectItem value="patient">Patient</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pending Invitations */}
                    {invitations.length > 0 && (
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Pending Invitations</CardTitle>
                                <CardDescription>Users who have been invited but haven't accepted yet.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="p-4 text-left font-medium">Email</th>
                                                <th className="p-4 text-left font-medium">Role</th>
                                                <th className="p-4 text-left font-medium">Sent At</th>
                                                <th className="p-4 text-left font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invitations.map((invitation) => (
                                                <tr key={invitation.id} className="border-t">
                                                    <td className="p-4 flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                                        {invitation.email}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                            {invitation.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-muted-foreground">
                                                        {new Date(invitation.created_at).toLocaleDateString()}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-medium">
                                                            <Clock className="h-3 w-3" />
                                                            Pending
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Invite Modal */}
                    <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Invite Team Member</DialogTitle>
                                <DialogDescription>
                                    Send an invitation to a new team member. They will receive an email to join your organization.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleInvite}>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="colleague@example.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="role">Role</Label>
                                        <Select value={inviteRole} onValueChange={setInviteRole}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="doctor">Doctor</SelectItem>
                                                <SelectItem value="nurse">Nurse</SelectItem>
                                                <SelectItem value="staff">Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={isInviting}>
                                        {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Send Invitation
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
            </Tabs>
        </div>
    );
}
