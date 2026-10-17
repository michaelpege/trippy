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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 overflow-y-auto">
        <div className="w-full max-w-2xl bg-[#FFFFFF] dark:bg-[#0E1013] border-[3px] border-[#111111] dark:border-[#FFFFFF] corner-rule-yellow rounded-none overflow-hidden my-6 relative">
          <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#111111] border-b-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#E63329]">
                [RBAC // ACCESS DEFINITION]
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                {isEditing ? 'Edit Access Role' : 'Create Access Role'}
              </h2>
              <p className="text-xs text-[#888888] font-mono mt-0.5">
                Configure permission matrix and whitelist operator Gmail accounts
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#0E1013] text-[#111111] dark:text-[#FFFFFF] hover:bg-[#E63329] hover:text-white transition rounded-none"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Role Name <span className="text-[#E63329]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TRIP COORDINATOR // SPOT CURATOR // AUDITOR"
                className="w-full px-4 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-sm font-bold focus:outline-none focus:border-[#E63329] transition uppercase"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Operational purpose and scope for members assigned to this role..."
                className="w-full px-4 py-2 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-xs font-medium focus:outline-none focus:border-[#E63329] transition"
              />
            </div>

            {/* Permissions Matrix */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF]">
                  Permissions Matrix ({selectedPermissions.length})
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs font-mono font-black uppercase tracking-wider px-2.5 py-1 bg-[#F5C800] text-[#111111] border border-[#111111] hover:bg-[#111111] hover:text-[#F5C800] transition rounded-none"
                >
                  {selectedPermissions.includes('*') ? 'Revoke Super Admin' : 'Grant Super Admin (*) '}
                </button>
              </div>

              <div className="border-2 border-[#111111] dark:border-[#FFFFFF] rounded-none p-3 bg-[#F7F5F0] dark:bg-[#111111] max-h-56 overflow-y-auto space-y-2">
                {availablePermissions.map((perm) => {
                  const isChecked =
                    selectedPermissions.includes('*') || selectedPermissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      onClick={() => togglePermission(perm.id)}
                      className={`flex items-start gap-3 p-2.5 rounded-none border-2 transition cursor-pointer select-none ${
                        isChecked
                          ? 'bg-[#FFFFFF] dark:bg-[#0E1013] border-[#111111] dark:border-[#FFFFFF]'
                          : 'bg-[#F7F5F0] dark:bg-[#1e2024] border-transparent hover:border-[#111111]/40'
                      }`}
                    >
                      <div className="mt-0.5 text-[#111111] dark:text-[#FFFFFF]">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#E63329]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#888888]" />
                        )}
                      </div>
                      <div className="text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black uppercase tracking-tight text-[#111111] dark:text-[#FFFFFF]">
                            {perm.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#888888] bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-none font-bold">
                            {perm.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#888888] font-mono mt-0.5">
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
              <label className="block text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] mb-1.5">
                Assigned Gmail Accounts (comma-separated)
              </label>
              <textarea
                rows={3}
                value={emailsStr}
                onChange={(e) => setEmailsStr(e.target.value)}
                placeholder="alice@gmail.com, bob@gmail.com, partner@trippy.com"
                className="w-full px-4 py-2.5 rounded-none border-2 border-[#111111] dark:border-[#FFFFFF] bg-white dark:bg-[#111111] text-[#111111] dark:text-[#FFFFFF] text-xs font-mono font-bold focus:outline-none focus:border-[#E63329] transition"
              />
              <p className="text-[10px] text-[#888888] font-mono mt-1">
                Edge firewall checks incoming OAuth payload against this list.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t-2 border-[#111111] dark:border-[#FFFFFF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-[#FFFFFF] bg-white dark:bg-[#111111] border-2 border-[#111111] dark:border-[#FFFFFF] hover:bg-[#111111] hover:text-white dark:hover:bg-[#FFFFFF] dark:hover:text-[#111111] rounded-none transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#111111] bg-[#F5C800] border-2 border-[#111111] dark:border-[#FFFFFF] hover:bg-[#111111] hover:text-[#F5C800] rounded-none transition"
              >
                {isEditing ? 'Commit Changes' : 'Create Role'}
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
