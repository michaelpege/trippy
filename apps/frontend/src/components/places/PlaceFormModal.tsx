'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  Trash2,
  MapPin,
  Navigation,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  Loader2,
  Layers,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { uploadPlaceFile, parseGmapsUrl } from '@/lib/api';
import { getUserLocation } from '@/lib/geo';
import { useToast } from '../common/Toast';
import { GmapsPhotoPickerModal } from './GmapsPhotoPickerModal';
import type { Place, PlaceType, PlaceFile, GmapsPhoto } from '@/types';

interface PlaceFormModalProps {
  isOpen: boolean;
  placeToEdit?: Place | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: PlaceType;
    description?: string;
    address?: string;
    gmaps_url?: string;
    latitude?: number | null;
    longitude?: number | null;
    files: PlaceFile[];
  }) => Promise<void>;
}

export const PlaceFormModal: React.FC<PlaceFormModalProps> = ({
  isOpen,
  placeToEdit,
  onClose,
  onSave,
}) => {
  const toast = useToast();
  const isEditing = !!placeToEdit;

  const [name, setName] = useState(placeToEdit?.name || '');
  const [type, setType] = useState<PlaceType>(placeToEdit?.type || 'Restaurant');
  const [description, setDescription] = useState(placeToEdit?.description || '');
  const [address, setAddress] = useState(placeToEdit?.address || '');
  const [gmapsUrl, setGmapsUrl] = useState(placeToEdit?.gmaps_url || '');
  const [latitude, setLatitude] = useState<string>(
    placeToEdit?.latitude !== null && placeToEdit?.latitude !== undefined
      ? String(placeToEdit.latitude)
      : ''
  );
  const [longitude, setLongitude] = useState<string>(
    placeToEdit?.longitude !== null && placeToEdit?.longitude !== undefined
      ? String(placeToEdit.longitude)
      : ''
  );
  const [files, setFiles] = useState<PlaceFile[]>(placeToEdit?.files || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Google Maps Auto-Fill & Photo Picker state
  const [gmapsInputUrl, setGmapsInputUrl] = useState('');
  const [isParsingGmaps, setIsParsingGmaps] = useState(false);
  const [gmapsPhotos, setGmapsPhotos] = useState<GmapsPhoto[]>([]);
  const [gmapsGroups, setGmapsGroups] = useState<string[]>([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAutoFillGmaps = async () => {
    const rawUrl = gmapsInputUrl.trim() || gmapsUrl.trim();
    if (!rawUrl) {
      toast.error('Please paste a Google Maps link first.');
      return;
    }

    setIsParsingGmaps(true);
    try {
      const res = await parseGmapsUrl(rawUrl);
      const data = res.data;

      if (data.name) setName(data.name);
      if (data.type) setType(data.type);
      if (data.address) setAddress(data.address);
      if (data.gmaps_url) setGmapsUrl(data.gmaps_url);
      if (data.latitude !== null && data.latitude !== undefined) {
        setLatitude(String(data.latitude));
      }
      if (data.longitude !== null && data.longitude !== undefined) {
        setLongitude(String(data.longitude));
      }

      // Add curator notes if rating or website exists
      const notes: string[] = [];
      if (description) notes.push(description);
      if (data.rating) {
        notes.push(`Rating: ${data.rating.toFixed(1)} ★ (${data.reviews_count || 'reviews'})`);
      }
      if (data.website) {
        notes.push(`Website / Link: ${data.website}`);
      }
      if (!description && notes.length > 0) {
        setDescription(notes.join('\n'));
      }

      // Store photos & groups
      if (data.photos && data.photos.length > 0) {
        setGmapsPhotos(data.photos);
        setGmapsGroups(data.groups || ['All']);
        setShowPhotoPicker(true);
        toast.success(`Found ${data.photos.length} photos! Auto-filled details.`);
      } else {
        toast.success('Place details auto-filled successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to auto-fill from Google Maps.');
    } finally {
      setIsParsingGmaps(false);
    }
  };

  const handleAttachGmapsPhotos = (selected: GmapsPhoto[]) => {
    const newFiles: PlaceFile[] = selected.map((p, idx) => ({
      id: `gmaps_${Date.now()}_${idx}`,
      name: `${(name || 'place').toLowerCase().replace(/\s+/g, '_')}_photo_${idx + 1}.jpg`,
      url: p.url,
      mime_type: 'image/jpeg',
    }));

    setFiles((prev) => {
      const existingUrls = new Set(prev.map((f) => f.url));
      const filtered = newFiles.filter((f) => !existingUrls.has(f.url));
      return [...prev, ...filtered];
    });

    toast.success(`Attached ${selected.length} photos from Google Maps!`);
  };

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await getUserLocation();
      if (loc) {
        setLatitude(String(loc.latitude));
        setLongitude(String(loc.longitude));
        toast.success(`Coordinates acquired: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`);
      } else {
        toast.error('Unable to acquire GPS coordinates.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const res = await uploadPlaceFile(file);
        setFiles((prev) => [...prev, res.file]);
      }
      toast.success('Files uploaded.');
    } catch (err: any) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Place name is required.');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsSubmitting(true);
    try {
      const latNum = latitude.trim() ? parseFloat(latitude) : null;
      const lngNum = longitude.trim() ? parseFloat(longitude) : null;

      await onSave({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        gmaps_url: gmapsUrl.trim() || undefined,
        latitude: isNaN(latNum as any) ? null : latNum,
        longitude: isNaN(lngNum as any) ? null : lngNum,
        files,
      });

      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Save failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: PlaceType[] = ['Restaurant', 'Mall', 'Public spaces', 'other'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-100">
        <div
          className="w-full max-w-2xl bg-white dark:bg-[#16191E] border-[3px] border-[#111111] dark:border-white relative overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
        >
          <div className="corner-rule-red" />

          {/* Modal Header */}
          <div className="p-6 border-b-[3px] border-[#111111] dark:border-white flex items-center justify-between bg-white dark:bg-[#16191E]">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#888888]">
                {isEditing ? 'UPDATE RECORD' : 'CREATE RECORD'}
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#111111] dark:text-white">
                {isEditing ? `EDIT // ${placeToEdit?.name}` : 'NEW PLACE'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 border-2 border-[#111111] dark:border-white text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-5">
            {/* Google Maps Smart Auto-Fill */}
            <div className="p-4 bg-[#F5C800]/15 dark:bg-[#F5C800]/10 border-2 border-[#111111] dark:border-white relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E63329]" />
                  <span>SMART IMPORT // GOOGLE MAPS LINK</span>
                </span>
                <span className="text-[9px] font-mono uppercase bg-[#111111] text-white dark:bg-white dark:text-[#111111] px-1.5 py-0.5 font-bold">
                  AUTO-FILL & PHOTOS
                </span>
              </div>
              <p className="text-[10px] text-[#666666] dark:text-[#AAAAAA] mb-2.5 font-mono">
                PASTE ANY GOOGLE MAPS LINK (E.G. MAPS.APP.GOO.GL/...) TO AUTO-FILL PLACE DETAILS & SELECT CATEGORIZED PHOTOS.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={gmapsInputUrl}
                    onChange={(e) => setGmapsInputUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAutoFillGmaps();
                      }
                    }}
                    placeholder="https://maps.app.goo.gl/... or google.com/maps/place/..."
                    className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
                  />
                  <LinkIcon className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillGmaps}
                  disabled={isParsingGmaps}
                  className="px-4 py-2 bg-[#111111] text-white dark:bg-white dark:text-[#111111] border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider hover:bg-[#E63329] hover:text-white dark:hover:bg-[#E63329] dark:hover:text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_white]"
                >
                  {isParsingGmaps ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>PARSING...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#F5C800]" />
                      <span>AUTO-FILL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                PLACE NAME <span className="text-[#E63329]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.G. GUGGENHEIM MUSEUM / CENTRAL CAFE"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono uppercase text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
              />
            </div>

            {/* Category / Type Selector */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                CATEGORY CLASSIFICATION
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {types.map((t) => {
                  const isSelected = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider border-2 transition-colors text-center ${
                        isSelected
                          ? t === 'Restaurant'
                            ? 'bg-[#E63329] text-white border-[#111111] dark:border-white'
                            : t === 'Mall'
                            ? 'bg-[#1A3A6B] text-white border-[#111111] dark:border-white'
                            : t === 'Public spaces'
                            ? 'bg-[#F5C800] text-[#111111] border-[#111111] dark:border-white'
                            : 'bg-[#111111] text-white border-[#111111] dark:border-white'
                          : 'bg-white dark:bg-[#20242B] text-[#888888] border-[#111111]/30 dark:border-white/30 hover:border-[#111111] dark:hover:border-white hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                PHYSICAL ADDRESS
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="STREET, DISTRICT, CITY"
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono uppercase text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
              />
            </div>

            {/* GPS Coordinates & Google Maps */}
            <div className="border-2 border-[#111111] dark:border-white p-4 bg-[#F7F5F0] dark:bg-[#20242B]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#111111] dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E63329]" />
                  GEOLOCATION COORDINATES
                </span>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-[#111111] text-white dark:bg-white dark:text-[#111111] hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white transition-colors flex items-center gap-1 border border-[#111111]"
                >
                  <Navigation className="w-3 h-3" />
                  <span>{isLocating ? 'DETECTING...' : 'USE CURRENT GPS'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888888] mb-1">
                    LATITUDE
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-6.2088"
                    className="w-full px-3 py-2 bg-white dark:bg-[#16191E] border border-[#111111] dark:border-white text-xs font-mono focus:outline-none focus:bg-[#FFFDE6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#888888] mb-1">
                    LONGITUDE
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="106.8456"
                    className="w-full px-3 py-2 bg-white dark:bg-[#16191E] border border-[#111111] dark:border-white text-xs font-mono focus:outline-none focus:bg-[#FFFDE6]"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-[10px] font-bold uppercase text-[#888888] mb-1">
                  OPTIONAL GMAPS URL OVERRIDE
                </label>
                <input
                  type="url"
                  value={gmapsUrl}
                  onChange={(e) => setGmapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 bg-white dark:bg-[#16191E] border border-[#111111] dark:border-white text-xs font-mono focus:outline-none focus:bg-[#FFFDE6]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                CURATORIAL NOTES / DESCRIPTION
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Architectural features, culinary specialties, visiting guidelines..."
                className="w-full px-4 py-2.5 bg-white dark:bg-[#20242B] border-2 border-[#111111] dark:border-white text-xs font-mono text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#2A2E37]"
              />
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#111111] dark:text-white mb-1.5">
                ATTACHED FILES & IMAGERY
              </label>

              <label className="border-2 border-dashed border-[#111111] dark:border-white p-6 bg-[#F7F5F0] dark:bg-[#20242B] flex flex-col items-center justify-center cursor-pointer hover:bg-[#FFFDE6] dark:hover:bg-[#2A2E37] transition-colors block text-center">
                <Upload className="w-5 h-5 text-[#E63329] mb-1" />
                <span className="text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white">
                  {isUploading ? 'UPLOADING TO STORAGE...' : 'CLICK OR DROP FILES TO UPLOAD'}
                </span>
                <span className="text-[10px] font-mono text-[#888888] mt-1">
                  PHOTOS, PDFS, MAP EXPORTS, MENUS
                </span>
                <input
                  type="file"
                  multiple
                  disabled={isUploading}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Select Photos from Google Maps Button */}
              {gmapsPhotos.length > 0 && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowPhotoPicker(true)}
                    className="w-full py-2.5 px-3 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] hover:bg-[#e0b700] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_#111111] dark:shadow-[2px_2px_0px_white] transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>CHOOSE PHOTOS FROM GOOGLE MAPS ({gmapsPhotos.length} AVAILABLE)</span>
                  </button>
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {files.map((file) => {
                    const isImg =
                      file.mime_type?.startsWith('image/') ||
                      /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name) ||
                      file.url.includes('googleusercontent.com');

                    return (
                      <div
                        key={file.id}
                        className="p-2 border-2 border-[#111111] dark:border-white bg-white dark:bg-[#20242B] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {isImg && file.url ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-8 h-8 object-cover border border-[#111111] dark:border-white shrink-0"
                            />
                          ) : (
                            <FileText className="w-4 h-4 text-[#888888] shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-mono text-xs font-bold truncate block">{file.name}</span>
                            {file.url.includes('googleusercontent.com') && (
                              <span className="text-[9px] font-mono text-[#E63329] uppercase font-bold">
                                Google Maps CDN
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1 hover:text-[#E63329] transition-colors ml-2 shrink-0"
                          title="Remove file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t-[3px] border-[#111111] dark:border-white flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-transparent border-2 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-[#111111] transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-wider border-2 border-[#111111] dark:border-white transition-colors"
              >
                {isEditing ? 'SAVE PLACE' : 'CREATE PLACE'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Save Changes' : 'Create Place'}
        message={`Are you sure you want to ${isEditing ? 'update' : 'create'} the place "${name}"?`}
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Yes, Save Place' : 'Yes, Create Place'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Google Maps Categorized Photo Picker Modal */}
      <GmapsPhotoPickerModal
        isOpen={showPhotoPicker}
        placeName={name || 'Place'}
        photos={gmapsPhotos}
        groups={gmapsGroups}
        onClose={() => setShowPhotoPicker(false)}
        onAttachPhotos={handleAttachGmapsPhotos}
      />
    </>
  );
};
