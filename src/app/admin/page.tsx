'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Role } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiMail, FiShield, FiArrowLeft } from 'react-icons/fi';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export default function AdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([
    { id: '1', name: 'Admin User', email: 'admin@example.com', role: Role.ADMIN },
    { id: '2', name: 'Regular User', email: 'user@example.com', role: Role.USER },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleCreate = () => {
    setIsCreating(true);
    setEditingUser(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsCreating(false);
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleSave = (userData: Partial<User>) => {
    if (isCreating) {
      const newUser: User = {
        id: Date.now().toString(),
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || Role.USER,
      };
      setUsers([...users, newUser]);
    } else if (editingUser) {
      setUsers(users.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...userData }
          : u
      ));
    }
    setIsCreating(false);
    setEditingUser(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingUser(null);
  };

  return (
    <ProtectedRoute requiredRole={Role.ADMIN}>
      <DashboardLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
          <div className="flex-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
              User <span className="text-primary">Management</span>
            </h1>
            <p className="text-secondary-foreground font-medium">
              Control access levels and manage administrative permissions across the system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.replace('/dashboard')} className="rounded-xl">
              <FiArrowLeft className="mr-2" /> Back
            </Button>
            <Button variant="primary" onClick={handleCreate} className="rounded-xl shadow-lg shadow-primary/20">
              <FiPlus className="mr-2" /> Create User
            </Button>
          </div>
        </div>

        {/* User Form Modal-like Card */}
        {(isCreating || editingUser) && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="border-primary/20 shadow-2xl shadow-primary/5">
              <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    {isCreating ? <FiPlus /> : <FiEdit2 />}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {isCreating ? 'Onboard New User' : 'Update User Access'}
                  </h2>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <UserForm
                  user={editingUser}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Table */}
        <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
          <CardHeader className="p-6 bg-muted/20 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-lg text-foreground">System Accounts</h3>
            <span className="text-xs font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">
              {users.length} TOTAL USERS
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Identity</th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Email Access</th>
                  <th className="px-6 py-4 text-xs font-bold text-secondary-foreground uppercase tracking-wider">Role & Privileges</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-secondary-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="group hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-secondary-foreground font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-bold text-foreground">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-secondary-foreground font-medium">
                      {user.email}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                        user.role === Role.ADMIN 
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        <FiShield className="mr-1.5" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEdit(user)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(user.id)}
                          className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface UserFormProps {
  user?: User | null;
  onSave: (userData: Partial<User>) => void;
  onCancel: () => void;
}

function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || Role.USER,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <FiUser className="text-primary" /> Full Name
          </label>
          <input
            type="text"
            required
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground flex items-center gap-2">
            <FiMail className="text-primary" /> Email Address
          </label>
          <input
            type="email"
            required
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
          />
        </div>
      </div>
      
      <div className="space-y-2 max-w-sm">
        <label className="text-sm font-bold text-foreground flex items-center gap-2">
          <FiShield className="text-primary" /> System Access Level
        </label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
          className="w-full px-4 py-2.5 bg-card border border-border rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none appearance-none cursor-pointer"
        >
          <option value={Role.USER}>Standard User</option>
          <option value={Role.ADMIN}>Administrator</option>
        </select>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-border">
        <Button
          type="submit"
          variant="primary"
          className="px-8 rounded-xl h-11"
        >
          {user ? 'Update Account' : 'Confirm User Creation'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="px-8 rounded-xl h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
