'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Mail, CheckSquare, Square } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { fetchPermissionsList } from '@/lib/api';
import { useToast } from '../common/Toast';
import type { Role, PermissionDefinition } from '@/types';

interface RoleFormModalProps {
  isOpen: boolean;
  roleToEdit?: Role | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    permissions: string[];
    emails: string[];
  }) => Promise<void>;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({
  isOpen,
  roleToEdit,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const isEditing = !!roleToEdit;

  const [name, setName] = useState(roleToEdit?.name || '');
  const [description, setDescription] = useState(roleToEdit?.description || '');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    roleToEdit?.permissions || []
  );
  const [emailsStr, setEmailsStr] = useState(roleToEdit?.members?.join(', ') || '');
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPermissionsList()
      .then((res) => setAvailablePermissions(res.permissions))
      .catch((err) => console.error(err));

    if (roleToEdit) {
      setName(roleToEdit.name);
      setDescription(roleToEdit.description || '');
      setSelectedPermissions(roleToEdit.permissions || []);
      setEmailsStr(roleToEdit.members?.join(', ') || '');
    } else {
      setSelectedPermissions([]);
    }
  }, [roleToEdit]);

  if (!isOpen) return null;

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPermissions.includes('*')) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(['*']);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Role name is required.');
      return;
    }
    if (selectedPermissions.length === 0) {
      toast.error('Assign at least one permission to this role.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const emails = emailsStr
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      await onSave({
        name: name.trim(),
        description: description.trim(),
        permissions: selectedPermissions,
        emails,
      });
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-6">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Access Role' : 'Create Access Role'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure permissions and assign authorized admin emails
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Role Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Trip Coordinator, Place Curator, Auditor"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what members in this role are responsible for..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Permissions Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Permissions ({selectedPermissions.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  {selectedPermissions.includes('*') ? 'Unselect Super Admin' : 'Grant Full Super Admin (*) '}
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/60 max-h-56 overflow-y-auto space-y-2">
                {availablePermissions.map((perm) => {
                  const isChecked =
                    selectedPermissions.includes('*') || selectedPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      onClick={() => togglePermission(perm.id)}
                      className="flex items-start gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition cursor-pointer select-none"
                    >
                      <div className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 fill-emerald-100 dark:fill-emerald-950" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{perm.name}</span>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {perm.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {perm.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Assigned Emails */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Assigned Gmail Accounts (comma-separated)
              </label>
              <textarea
                rows={3}
                value={emailsStr}
                onChange={(e) => setEmailsStr(e.target.value)}
                placeholder="alice@gmail.com, bob@gmail.com, partner@trippy.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Only users listed in active roles (plus the registered owner) are allowed to sign in.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                {isEditing ? 'Save Role Changes' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Update Role Confirmation' : 'Create Role Confirmation'}
        message={
          isEditing
            ? `Are you sure you want to update permissions and assignments for the role "${name}"?`
            : `Are you sure you want to create the role "${name}"?`
        }
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Save Role' : 'Create Role'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
