'use client';

import React, { useState } from 'react';
import { X, Upload, Trash2, MapPin, Navigation, FileText, Image as ImageIcon } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { uploadPlaceFile } from '@/lib/api';
import { getUserLocation } from '@/lib/geo';
import { useToast } from '../common/Toast';
import type { Place, PlaceType, PlaceFile } from '@/types';

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

  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDetectLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await getUserLocation();
      if (loc) {
        setLatitude(String(loc.latitude));
        setLongitude(String(loc.longitude));
        toast.success(`Coordinates: ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`);
      } else {
        toast.error('Unable to retrieve location. Please check browser permissions.');
      }
    } catch {
      toast.error('Failed to get current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < uploadedFiles.length; i++) {
        const f = uploadedFiles[i];
        const res = await uploadPlaceFile(f);
        setFiles((prev) => [...prev, res.file]);
      }
      toast.success('File(s) uploaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'File upload failed.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
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
      await onSave({
        name: name.trim(),
        type,
        description: description.trim(),
        address: address.trim(),
        gmaps_url: gmapsUrl.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        files,
      });
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save place.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const types: PlaceType[] = ['Restaurant', 'Mall', 'Public spaces', 'other'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-6">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Place' : 'Create New Place'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Save details, attachments, and Google Maps directions
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Place Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grand Indonesia, Warung Leko, Central Park"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {types.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                      type === t
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Description & Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Highlight dishes, must-see spots, opening hours..."
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street name, district, city"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            {/* Google Maps Link & Coordinates */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Navigation & Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 flex items-center gap-1 px-2.5 py-1 bg-emerald-100/60 dark:bg-emerald-950/60 rounded-lg transition"
                >
                  <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? 'Detecting...' : 'Use My Current Location'}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Google Maps URL (optional, route automatically generated if empty)
                </label>
                <input
                  type="url"
                  value={gmapsUrl}
                  onChange={(e) => setGmapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="-6.1944"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="106.8229"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Static Files Attachments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Attachments & Files ({files.length})
                </label>
                <label className="cursor-pointer text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                  <input
                    type="file"
                    multiple
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {files.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {files.map((file) => {
                    const isImg = file.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          {isImg ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-8 h-8 rounded object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <FileText className="w-6 h-6 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="truncate">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate block underline"
                            >
                              {file.name}
                            </a>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Static File'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  No static files attached yet. Attach menus, photos, PDFs, or maps.
                </div>
              )}
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
                {isEditing ? 'Save Changes' : 'Create Place'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={isEditing ? 'Update Place Confirmation' : 'Create Place Confirmation'}
        message={
          isEditing
            ? `Are you sure you want to update the details for "${name}"?`
            : `Are you sure you want to create the place "${name}"?`
        }
        actionType={isEditing ? 'edit' : 'create'}
        confirmText={isEditing ? 'Save Changes' : 'Create Place'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
