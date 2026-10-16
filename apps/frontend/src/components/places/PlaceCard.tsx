'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Utensils,
  ShoppingBag,
  Trees,
  HelpCircle,
  FileText,
  Edit2,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { DistanceBadge } from '../common/DistanceBadge';
import { ConfirmModal } from '../common/ConfirmModal';
import type { Place, PlaceType } from '@/types';

interface PlaceCardProps {
  place: Place;
  onEdit: (place: Place) => void;
  onDelete: (id: string) => Promise<void>;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({ place, onEdit, onDelete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getTypeBadge = (type: PlaceType) => {
    switch (type) {
      case 'Restaurant':
        return {
          icon: Utensils,
          style: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        };
      case 'Mall':
        return {
          icon: ShoppingBag,
          style: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'Public spaces':
        return {
          icon: Trees,
          style: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      default:
        return {
          icon: HelpCircle,
          style: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const badge = getTypeBadge(place.type);
  const BadgeIcon = badge.icon;

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await onDelete(place.id);
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const firstImage = place.files.find(
    (f) => f.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name)
  );

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
        <div>
          {/* Card Top Banner / Image */}
          {firstImage ? (
            <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={firstImage.url}
                alt={place.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${badge.style}`}
                >
                  <BadgeIcon className="w-3.5 h-3.5" />
                  {place.type}
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-5 px-6 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.style}`}
              >
                <BadgeIcon className="w-3.5 h-3.5" />
                {place.type}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
              {place.name}
            </h3>

            {place.address && (
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{place.address}</span>
              </p>
            )}

            {place.description && (
              <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                {place.description}
              </p>
            )}

            {/* Files / Attachments */}
            {place.files.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  <Paperclip className="w-3 h-3" />
                  <span>Attachments ({place.files.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {place.files.slice(0, 3).map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition max-w-[150px] truncate"
                    >
                      <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </a>
                  ))}
                  {place.files.length > 3 && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                      +{place.files.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Distance, Route Directions & Actions */}
        <div className="px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <DistanceBadge place={place} />

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => onEdit(place)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl transition"
              title="Edit Place"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition"
              title="Delete Place"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Place Confirmation"
        message={`Are you sure you want to permanently delete "${place.name}"? This action cannot be reversed.`}
        actionType="delete"
        confirmText="Yes, Delete Place"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteModal(false)}
      />
    </>
  );
};
