'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Filter, AlertCircle } from 'lucide-react';
import { PlaceCard } from '@/components/places/PlaceCard';
import { PlaceFormModal } from '@/components/places/PlaceFormModal';
import { fetchPlaces, createPlace, updatePlace, deletePlace } from '@/lib/api';
import { useToast } from '@/components/common/Toast';
import type { Place, PlaceType, PlaceFile } from '@/types';

export default function PlacesPage() {
  const toast = useToast();
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);

  const loadPlaces = async () => {
    setLoading(true);
    try {
      const typeParam = selectedType !== 'All' ? (selectedType as PlaceType) : undefined;
      const res = await fetchPlaces({ type: typeParam, query: searchQuery.trim() || undefined });
      setPlaces(res.places || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load places.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPlaces();
  };

  const handleOpenCreate = () => {
    setEditingPlace(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (place: Place) => {
    setEditingPlace(place);
    setIsFormOpen(true);
  };

  const handleSavePlace = async (data: {
    name: string;
    type: PlaceType;
    description?: string;
    address?: string;
    gmaps_url?: string;
    latitude?: number | null;
    longitude?: number | null;
    files: PlaceFile[];
  }) => {
    if (editingPlace) {
      const res = await updatePlace(editingPlace.id, data);
      toast.success(`Updated "${res.place.name}" successfully.`);
    } else {
      const res = await createPlace(data);
      toast.success(`Created "${res.place.name}" successfully.`);
    }
    await loadPlaces();
  };

  const handleDeletePlace = async (id: string) => {
    await deletePlace(id);
    toast.success('Place deleted successfully.');
    await loadPlaces();
  };

  const typeTabs = ['All', 'Restaurant', 'Mall', 'Public spaces', 'other'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Places</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage destinations, restaurants, malls, public spots, directions, and files
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/20 transition self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Place</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {typeTabs.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedType === t
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search places by name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* Places Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Loading places...</p>
          </div>
        </div>
      ) : places.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              onEdit={handleOpenEdit}
              onDelete={handleDeletePlace}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No places found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedType !== 'All'
              ? 'Try adjusting your search query or filter.'
              : 'Start by creating your first place with directions and static attachments.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-700 transition"
          >
            Create Place Now
          </button>
        </div>
      )}

      <PlaceFormModal
        isOpen={isFormOpen}
        placeToEdit={editingPlace}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePlace}
      />
    </div>
  );
}
