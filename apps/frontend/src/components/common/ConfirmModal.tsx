'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  actionType?: 'create' | 'edit' | 'delete' | 'default';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  details,
  actionType = 'default',
  confirmText,
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDelete = actionType === 'delete';
  const isCreate = actionType === 'create';
  const isEdit = actionType === 'edit';

  const defaultConfirmText = isDelete
    ? 'Yes, Delete'
    : isCreate
    ? 'Yes, Create'
    : isEdit
    ? 'Yes, Save Changes'
    : 'Confirm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl flex items-center justify-center ${
                  isDelete
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                    : isCreate
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                    : isEdit
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isDelete ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : isCreate ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  Action Confirmation
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

          {details && (
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono break-all">
              {details}
            </div>
          )}

          {isDelete && (
            <div className="mt-4 p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              ⚠️ This action is permanent and cannot be undone.
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50 ${
              isDelete
                ? 'bg-rose-600 hover:bg-rose-700'
                : isCreate
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText || defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
