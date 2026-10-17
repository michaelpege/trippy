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
    toast.success('Place deleted.');
    await loadPlaces();
  };

  const typeTabs: { label: string; value: string; color?: string }[] = [
    { label: 'ALL', value: 'All' },
    { label: 'RESTAURANTS', value: 'Restaurant', color: '#E63329' },
    { label: 'MALLS', value: 'Mall', color: '#1A3A6B' },
    { label: 'PUBLIC SPACES', value: 'Public spaces', color: '#F5C800' },
    { label: 'OTHER', value: 'other' },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header: Bauhaus Architectural Structure */}
      <div className="border-b-[3px] border-[#111111] dark:border-white pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-3 h-3 bg-[#E63329]" />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-[#888888]">
              DIRECTORY // ARCHIVE
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-[#111111] dark:text-white leading-none">
            CURATED PLACES
          </h1>
          <p className="mt-2 text-xs text-[#555555] dark:text-[#A0A5B0]">
            Database of indexed locations, GPS coordinates, navigation routes, and media attachments.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>ADD PLACE</span>
        </button>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Architectural Filter Tab Strip */}
        <div className="flex flex-wrap items-stretch border-2 border-[#111111] dark:border-white bg-white dark:bg-[#16191E] divide-x-2 divide-[#111111] dark:divide-white">
          {typeTabs.map((tab) => {
            const isSelected = selectedType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedType(tab.value)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                  isSelected
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-[#111111]'
                    : 'text-[#888888] hover:bg-[#F5C800] hover:text-[#111111] dark:hover:bg-[#F5C800] dark:hover:text-[#111111]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-0 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH PLACES..."
              className="w-full px-4 py-2 bg-white dark:bg-[#16191E] border-2 border-[#111111] dark:border-white text-xs font-mono uppercase text-[#111111] dark:text-white placeholder-[#888888] focus:outline-none focus:bg-[#FFFDE6] dark:focus:bg-[#20242B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#E63329] dark:hover:bg-[#E63329] dark:hover:text-white border-2 border-l-0 border-[#111111] dark:border-white text-xs font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            <span>FIND</span>
          </button>
        </form>
      </div>

      {/* Places Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-2 border-dashed border-[#111111]/30 dark:border-white/30 p-12">
          <div className="w-8 h-8 border-3 border-[#E63329] border-t-transparent animate-spin mb-4" />
          <p className="text-xs font-mono uppercase tracking-widest text-[#888888]">
            INDEXING PLACES DATABASE...
          </p>
        </div>
      ) : places.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center border-[3px] border-[#111111] dark:border-white p-12 text-center bg-white dark:bg-[#16191E]">
          <div className="w-12 h-12 border-2 border-[#111111] dark:border-white bg-[#F5C800] text-[#111111] flex items-center justify-center mb-4 font-black">
            !
          </div>
          <h3 className="text-base font-black uppercase tracking-wider text-[#111111] dark:text-white">
            NO PLACES RECORDED
          </h3>
          <p className="mt-1 text-xs text-[#555555] dark:text-[#A0A5B0] max-w-sm">
            {selectedType !== 'All' || searchQuery
              ? 'No places matching the specified category and search parameters.'
              : 'The places directory is empty. Create your first curated place.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-6 px-5 py-2.5 bg-[#E63329] hover:bg-[#C22921] text-white text-xs font-black uppercase tracking-widest border-2 border-[#111111] dark:border-white transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE FIRST PLACE</span>
          </button>
        </div>
      ) : (
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
      )}

      {/* Place Create/Edit Modal */}
      <PlaceFormModal
        isOpen={isFormOpen}
        placeToEdit={editingPlace}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSavePlace}
      />
    </div>
  );
}
