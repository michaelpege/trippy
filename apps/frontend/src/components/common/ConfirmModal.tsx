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
    ? 'YES, DELETE'
    : isCreate
    ? 'YES, CREATE'
    : isEdit
    ? 'YES, SAVE CHANGES'
    : 'CONFIRM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-100">
      <div
        className="w-full max-w-md bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white relative overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="corner-rule-red" />

        <div className="p-6 pt-7">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 border-2 border-[#111111] dark:border-white flex items-center justify-center font-black ${
                  isDelete
                    ? 'bg-[#E63329] text-white'
                    : isCreate
                    ? 'bg-[#1A3A6B] text-white'
                    : isEdit
                    ? 'bg-[#F5C800] text-[#111111]'
                    : 'bg-[#111111] text-white'
                }`}
              >
                {isDelete ? '!' : isCreate ? '+' : '?'}
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wide text-[#111111] dark:text-white">
                  {title}
                </h3>
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
                  SYSTEM CONFIRMATION
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="p-1 border border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#444444] dark:text-[#A0A5B0] leading-relaxed">
            {message}
          </p>

          {details && (
            <div className="mt-3 p-3 bg-[#F7F5F0] dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-[11px] text-[#111111] dark:text-white font-mono break-all">
              {details}
            </div>
          )}

          {isDelete && (
            <div className="mt-4 p-2.5 bg-[#E63329] text-white border-2 border-[#111111] dark:border-white text-[11px] font-bold uppercase tracking-wider">
              Permanent action. This cannot be undone.
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-[#EEEEEE] dark:bg-[#101216] border-t-[3px] border-[#111111] dark:border-white flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white bg-transparent border-2 border-[#111111] dark:border-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-black uppercase tracking-wider text-white border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2 disabled:opacity-50 ${
              isDelete
                ? 'bg-[#E63329] hover:bg-[#C22921]'
                : isCreate
                ? 'bg-[#1A3A6B] hover:bg-[#132A4F]'
                : 'bg-[#111111] hover:bg-[#333333]'
            }`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-none animate-spin" />
            )}
            {confirmText || defaultConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
