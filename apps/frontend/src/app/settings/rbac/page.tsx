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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#111111] dark:border-[#FFFFFF]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1A3A6B] dark:text-[#F5C800] hover:text-[#E63329] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>[RETURN TO SETTINGS]</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
            Role-Based Access Control
          </h1>
          <p className="text-xs sm:text-sm text-[#888888] font-mono mt-1">
            Granular permission schema, policy definitions, and authorized email assignments
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F5C800] hover:bg-[#111111] hover:text-[#F5C800] text-[#111111] font-black uppercase tracking-wider text-xs border-2 border-[#111111] dark:border-[#FFFFFF] transition self-start sm:self-auto rounded-none"
        >
          <Plus className="w-4 h-4" />
          <span>New Role</span>
        </button>
      </div>

      {/* Access Rule Information Banner */}
      <div className="p-4 bg-[#1A3A6B] text-white border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#F5C800] flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-mono text-xs font-black uppercase tracking-wider text-[#F5C800]">
            Authentication Policy Directive
          </p>
          <p className="font-mono text-[11px] text-white/90 leading-relaxed">
            Only users whose Gmail address is explicitly mapped to at least one active role below (plus the registered System Owner) are authorized through the edge security gate. Permissions merge additively across overlapping roles.
          </p>
        </div>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-[#111111] dark:border-[#FFFFFF] border-t-[#E63329] animate-spin rounded-none" />
            <p className="text-xs font-mono font-black uppercase tracking-widest text-[#888888]">
              [QUERYING ROLE DEFINITIONS...]
            </p>
          </div>
        </div>
      ) : roles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const isSuperAdmin = role.permissions.includes('*');
            return (
              <div
                key={role.id}
                className="bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow p-6 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2 pb-3 border-b-2 border-[#111111]/20 dark:border-[#FFFFFF]/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                          {role.name}
                        </h3>
                        {isSuperAdmin && (
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-black bg-[#E63329] text-white border border-[#111111] uppercase">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#888888]">
                        ID: {role.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(role)}
                        className="p-1.5 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#1A3A6B] hover:text-white transition rounded-none"
                        title="Edit Role"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(role.id)}
                        className="p-1.5 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition rounded-none"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-xs text-[#888888] font-mono mt-1 mb-4 leading-relaxed">
                      {role.description}
                    </p>
                  )}

                  {/* Permissions Chips */}
                  <div className="mb-4">
                    <p className="text-[10px] font-mono font-black text-[#888888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
                      Permissions Matrix ({role.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {isSuperAdmin ? (
                        <span className="px-2.5 py-1 bg-[#F5C800] text-[#111111] border-2 border-[#111111] text-xs font-mono font-black">
                          * ALL PRIVILEGES GRANTED
                        </span>
                      ) : (
                        role.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] border border-[#111111] dark:border-[#FFFFFF] text-[10px] font-mono font-bold"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Assigned Members */}
                  <div>
                    <p className="text-[10px] font-mono font-black text-[#888888] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#111111] dark:text-[#FFFFFF]" />
                      Assigned Operators ({role.members?.length || 0})
                    </p>
                    {role.members && role.members.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {role.members.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F7F5F0] dark:bg-[#111111] border border-[#111111] dark:border-[#FFFFFF] text-xs font-mono font-bold text-[#111111] dark:text-[#FFFFFF]"
                          >
                            <Mail className="w-3 h-3 text-[#1A3A6B] dark:text-[#F5C800]" />
                            <span>{email}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#888888] font-mono italic">
                        No operators assigned to this role.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t-2 border-[#111111]/20 dark:border-[#FFFFFF]/20 text-[10px] font-mono font-bold text-[#888888] uppercase">
                  MODIFIED: {new Date(role.updated_at || Date.now()).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[#FFFFFF] dark:bg-[#0E1013] rounded-none border-2 border-dashed border-[#111111] dark:border-[#FFFFFF] p-12 text-center">
          <div className="w-12 h-12 border-2 border-[#111111] dark:border-[#FFFFFF] bg-[#F7F5F0] dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
            No Roles Configured
          </h3>
          <p className="text-xs text-[#888888] font-mono mt-1 max-w-sm mx-auto">
            Create roles with selected permissions and assign authorized Gmail addresses.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-6 py-2.5 bg-[#F5C800] text-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] font-black uppercase tracking-wider text-xs hover:bg-[#111111] hover:text-[#F5C800] transition rounded-none"
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
