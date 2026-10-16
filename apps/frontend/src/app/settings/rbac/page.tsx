'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield,
  Plus,
  ArrowLeft,
  Users,
  Key,
  Edit2,
  Trash2,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { RoleFormModal } from '@/components/rbac/RoleFormModal';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { fetchRoles, createRole, updateRole, deleteRole, getCurrentUserProfile } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { Role, UserAccessProfile } from '@/types';

export default function RbacSettingsPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<UserAccessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, meRes] = await Promise.all([
        fetchRoles(),
        getCurrentUserProfile().catch(() => null),
      ]);
      setRoles(rolesRes.roles || []);
      if (meRes) setProfile(meRes.user);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load RBAC roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setIsFormOpen(true);
  };

  const handleSaveRole = async (data: {
    name: string;
    description?: string;
    permissions: string[];
    emails: string[];
  }) => {
    if (editingRole) {
      const res = await updateRole(editingRole.id, data);
      toast.success(`Updated role "${res.role.name}" successfully.`);
    } else {
      const res = await createRole(data);
      toast.success(`Created role "${res.role.name}" successfully.`);
    }
    await loadData();
  };

  const handleDeleteRole = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await deleteRole(deletingId);
      toast.success('Role deleted successfully.');
      setDeletingId(null);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Settings</span>
            </Link>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create roles, assign granular permissions, and authorize email addresses for the admin panel
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Role</span>
        </button>
      </div>

      {/* Access Rule Information Banner */}
      <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Admin Authentication Policy</p>
          <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
            Only users whose Gmail account is assigned to at least one active role below (plus the
            registered System Owner) can sign in to this admin panel. Users assigned to multiple
            roles inherit the merged union of all assigned permissions.
          </p>
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Loading roles...</p>
          </div>
        </div>
      ) : roles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const isSuperAdmin = role.permissions.includes('*');
            return (
              <div
                key={role.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{role.name}</h3>
                        {isSuperAdmin && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 uppercase">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{role.id}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition"
                        title="Edit Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingId(role.id)}
                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                      {role.description}
                    </p>
                  )}

                  {/* Permissions Chips */}
                  <div className="mb-4">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      Permissions ({role.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {isSuperAdmin ? (
                        <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold">
                          * (All System Permissions)
                        </span>
                      ) : (
                        role.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assigned Members */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      Assigned Emails ({role.members?.length || 0})
                    </p>
                    {role.members && role.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {role.members.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300"
                          >
                            <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{email}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic">No emails assigned to this role.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500">
                  Last updated: {new Date(role.updated_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No custom roles defined</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Create roles with selected permissions and list the Gmail addresses of members who should
            have access.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Create Role
          </button>
        </div>
      )}

      {/* Role Form Modal */}
      <RoleFormModal
        isOpen={isFormOpen}
        roleToEdit={editingRole}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveRole}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        title="Delete Role Confirmation"
        message="Are you sure you want to delete this role? Any members exclusively assigned to this role will lose their admin privileges."
        actionType="delete"
        confirmText="Yes, Delete Role"
        isLoading={isDeleting}
        onConfirm={handleDeleteRole}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
