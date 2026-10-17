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
          color: 'bg-[#E63329] text-white',
          border: 'border-[#111111]',
        };
      case 'Mall':
        return {
          icon: ShoppingBag,
          color: 'bg-[#1A3A6B] text-white',
          border: 'border-[#111111]',
        };
      case 'Public spaces':
        return {
          icon: Trees,
          color: 'bg-[#F5C800] text-[#111111]',
          border: 'border-[#111111]',
        };
      default:
        return {
          icon: HelpCircle,
          color: 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]',
          border: 'border-[#111111] dark:border-white',
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
      <div className="bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white relative overflow-hidden flex flex-col justify-between group transition-colors">
        {/* Constructivist Corner Accent Rule */}
        <div className="corner-rule-red" />

        <div>
          {/* Card Top Banner / Image */}
          {firstImage ? (
            <div className="h-44 w-full relative overflow-hidden bg-[#EEEEEE] dark:bg-[#20242B] border-b-[3px] border-[#111111] dark:border-white">
              <img
                src={firstImage.url}
                alt={place.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-3 left-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${badge.border} ${badge.color}`}
                >
                  <BadgeIcon className="w-3 h-3" />
                  {place.type}
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-5 px-6 pb-2 flex items-center justify-between border-b-[2px] border-[#111111]/10 dark:border-white/10">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border-2 ${badge.border} ${badge.color}`}
              >
                <BadgeIcon className="w-3 h-3" />
                {place.type}
              </span>
              <span className="text-[10px] font-mono text-[#888888] uppercase">
                ID // {place.id.slice(0, 6)}
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-black uppercase tracking-tight text-[#111111] dark:text-white leading-tight">
              {place.name}
            </h3>

            {place.address && (
              <p className="mt-2 text-xs text-[#555555] dark:text-[#A0A5B0] flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#E63329] mt-0.5 shrink-0" />
                <span className="line-clamp-2 leading-relaxed">{place.address}</span>
              </p>
            )}

            {place.description && (
              <p className="mt-3 text-xs text-[#444444] dark:text-[#CCCCCC] line-clamp-3 leading-relaxed">
                {place.description}
              </p>
            )}

            {/* Files / Attachments */}
            {place.files.length > 0 && (
              <div className="mt-4 pt-3 border-t-2 border-[#111111]/10 dark:border-white/10">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-2">
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
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[#F7F5F0] dark:bg-[#20242B] border border-[#111111] dark:border-white text-[10px] font-bold uppercase text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition-colors max-w-[140px] truncate"
                    >
                      <FileText className="w-3 h-3 shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </a>
                  ))}
                  {place.files.length > 3 && (
                    <span className="text-[10px] font-mono text-[#888888] self-center">
                      +{place.files.length - 3} MORE
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Distance, Route Directions & Actions */}
        <div className="px-6 py-4 bg-[#F7F5F0] dark:bg-[#20242B] border-t-[3px] border-[#111111] dark:border-white flex flex-wrap items-center justify-between gap-3">
          <DistanceBadge place={place} />

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => onEdit(place)}
              className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#F5C800] hover:text-[#111111] transition-colors"
              title="Edit Place"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#E63329] hover:text-white hover:border-[#E63329] transition-colors"
              title="Delete Place"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
