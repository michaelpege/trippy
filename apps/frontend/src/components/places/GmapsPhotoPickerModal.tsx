'use client';

import React, { useState, useMemo } from 'react';
import { X, Check, Image as ImageIcon, Filter, Layers, ExternalLink } from 'lucide-react';
import type { GmapsPhoto } from '@/types';

interface GmapsPhotoPickerModalProps {
  isOpen: boolean;
  placeName: string;
  photos: GmapsPhoto[];
  groups: string[];
  onClose: () => void;
  onAttachPhotos: (selected: GmapsPhoto[]) => void;
}

export const GmapsPhotoPickerModal: React.FC<GmapsPhotoPickerModalProps> = ({
  isOpen,
  placeName,
  photos,
  groups,
  onClose,
  onAttachPhotos,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // By default, select the first 3 photos as recommended hero images
    return new Set(photos.slice(0, 3).map((p) => p.id));
  });
  const [activeTab, setActiveTab] = useState<string>('All');
  const [previewPhoto, setPreviewPhoto] = useState<GmapsPhoto | null>(null);

  const filteredPhotos = useMemo(() => {
    if (activeTab === 'All') return photos;
    return photos.filter((p) => p.group === activeTab);
  }, [photos, activeTab]);

  if (!isOpen) return null;

  const toggleSelect = (photo: GmapsPhoto) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) {
        next.delete(photo.id);
      } else {
        next.add(photo.id);
      }
      return next;
    });
  };

  const selectAllInTab = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredPhotos.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const deselectAllInTab = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredPhotos.forEach((p) => next.delete(p.id));
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = photos.filter((p) => selectedIds.has(p.id));
    onAttachPhotos(selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#F9F9F6] dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white shadow-[8px_8px_0px_#111111] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.2)] max-w-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Constructivist Corner Accent Rule */}
        <div className="corner-rule-red" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-[3px] border-[#111111] dark:border-white flex items-center justify-between bg-white dark:bg-[#1F232B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#E63329] border-2 border-[#111111] dark:border-white flex items-center justify-center text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-[#E63329]">
                Google Maps Import
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white line-clamp-1">
                Select Photos: {placeName}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border-2 border-[#111111] dark:border-white hover:bg-[#E63329] hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Tabs & Quick Actions Bar */}
        <div className="bg-[#EEEEEE] dark:bg-[#20242B] border-b-[2px] border-[#111111] dark:border-white p-3 flex flex-wrap items-center justify-between gap-2">
          {/* Group Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {groups.map((group) => {
              const count = group === 'All' ? photos.length : photos.filter((p) => p.group === group).length;
              const isActive = activeTab === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setActiveTab(group)}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-wider border-2 transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#111111] text-white border-[#111111] dark:bg-white dark:text-[#111111] dark:border-white shadow-[2px_2px_0px_#E63329]'
                      : 'bg-white dark:bg-[#16191E] text-[#111111] dark:text-white border-[#111111] dark:border-white hover:bg-[#E63329] hover:text-white hover:border-[#111111]'
                  }`}
                >
                  <span>{group}</span>
                  <span
                    className={`text-[10px] px-1 py-0.2 rounded-none font-bold ${
                      isActive
                        ? 'bg-[#E63329] text-white'
                        : 'bg-[#EEEEEE] text-[#111111] dark:bg-[#333] dark:text-white'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Select Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAllInTab}
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] hover:bg-[#F5C800] hover:text-[#111111] transition-colors"
            >
              Select Tab
            </button>
            <button
              type="button"
              onClick={deselectAllInTab}
              className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] hover:bg-[#E63329] hover:text-white transition-colors"
            >
              Deselect
            </button>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredPhotos.length === 0 ? (
            <div className="py-16 text-center text-[#777777] font-bold uppercase tracking-wider text-sm">
              No photos found in this category.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {filteredPhotos.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo)}
                    className={`group relative cursor-pointer border-[3px] transition-all bg-white dark:bg-[#1A1E24] overflow-hidden flex flex-col ${
                      isSelected
                        ? 'border-[#E63329] shadow-[4px_4px_0px_#E63329] ring-2 ring-[#E63329]'
                        : 'border-[#111111] dark:border-white hover:border-[#F5C800] hover:shadow-[3px_3px_0px_#111111]'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-[4/3] w-full bg-[#E5E5E5] dark:bg-[#2A2E35] overflow-hidden">
                      <img
                        src={photo.thumbnail}
                        alt={photo.caption || placeName}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Selection Checkbox Badge */}
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 border-2 border-[#111111] flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-[#E63329] text-white'
                            : 'bg-white/90 text-transparent hover:text-gray-400'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>

                      {/* Group Category Tag */}
                      <div className="absolute bottom-2 left-2">
                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-[#111111]/85 text-white border border-white/40 backdrop-blur-xs">
                          {photo.group}
                        </span>
                      </div>
                    </div>

                    {/* Photo Info */}
                    <div className="p-2 text-left bg-white dark:bg-[#16191E] border-t-2 border-[#111111] dark:border-white flex items-center justify-between text-[11px]">
                      <span className="font-bold truncate text-[#111111] dark:text-white">
                        {photo.author ? `by ${photo.author}` : 'Photo'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(photo.url, '_blank');
                        }}
                        className="text-[#777777] hover:text-[#E63329] p-0.5"
                        title="View Full Res"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t-[3px] border-[#111111] dark:border-white bg-white dark:bg-[#1F232B] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
            <span className="text-[#E63329] font-black">{selectedIds.size}</span> of{' '}
            <span>{photos.length}</span> photos selected
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] hover:bg-[#EEEEEE] text-[#111111] dark:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className={`flex-1 sm:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white transition-all flex items-center justify-center gap-2 ${
                selectedIds.size > 0
                  ? 'bg-[#E63329] text-white hover:bg-[#cc2b22] shadow-[3px_3px_0px_#111111]'
                  : 'bg-[#CCCCCC] dark:bg-[#444444] text-[#777777] cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Attach {selectedIds.size} Photos</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
