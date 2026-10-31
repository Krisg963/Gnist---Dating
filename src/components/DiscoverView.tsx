import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Heart,
  MessageCircle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  EDUCATION_OPTIONS,
  INTEREST_OPTIONS,
  RELATIONSHIP_GOAL_OPTIONS,
} from '../data/profiles';
import type {
  DatingProfile,
  EducationLevel,
  MatchRecord,
  RelationshipGoal,
} from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';
import { normalizeInterestKey } from './InterestBadges';

type QuickStatusFilter = 'all' | 'online' | 'new' | 'verified';
type SortMode = 'recommended' | 'nearest' | 'ageAsc';

interface DiscoverViewProps {
  profiles: DatingProfile[];
  matches: MatchRecord[];
  swipedRightIds: string[];
  viewerInterests: string[];
  externalInterestFilter?: { interest: string; nonce: number } | null;
  onSelectProfile: (profile: DatingProfile) => void;
  onQuickLike: (profileId: string) => void;
  onOpenChat: (matchId: string) => void;
}

const MAX_DISTANCE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Alle avstander', value: null },
  { label: 'Inntil 3 km', value: 3 },
  { label: 'Inntil 5 km', value: 5 },
  { label: 'Inntil 10 km', value: 10 },
];

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  profiles,
  matches,
  swipedRightIds,
  viewerInterests,
  externalInterestFilter,
  onSelectProfile,
  onQuickLike,
  onOpenChat,
}) => {
  // Quick & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuickStatusFilter>('all');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Advanced Filter Criteria State
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(40);
  const [selectedCity, setSelectedCity] = useState<string>('Alle byer');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<
    EducationLevel | 'Alle'
  >('Alle');
  const [selectedGoal, setSelectedGoal] = useState<RelationshipGoal | 'Alle'>(
    'Alle'
  );
  const [onlyVerified, setOnlyVerified] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');

  useEffect(() => {
    if (!externalInterestFilter?.interest) return;
    setSearchQuery('');
    setStatusFilter('all');
    setMinAge(18);
    setMaxAge(45);
    setSelectedCity('Alle byer');
    setMaxDistanceKm(null);
    setSelectedEducation('Alle');
    setSelectedGoal('Alle');
    setOnlyVerified(false);
    setSelectedInterests([externalInterestFilter.interest]);
    setFilterDrawerOpen(false);
  }, [externalInterestFilter]);

  const viewerInterestSet = useMemo(
    () => new Set(viewerInterests.map(normalizeInterestKey)),
    [viewerInterests]
  );

  const availableInterests = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of INTEREST_OPTIONS) {
      map.set(normalizeInterestKey(opt), opt);
    }
    for (const p of profiles) {
      for (const item of p.interests) {
        const key = normalizeInterestKey(item);
        if (!map.has(key)) map.set(key, item);
      }
    }
    for (const sel of selectedInterests) {
      const key = normalizeInterestKey(sel);
      if (!map.has(key)) map.set(key, sel);
    }
    return Array.from(map.values());
  }, [profiles, selectedInterests]);

  const cities = useMemo(() => {
    const unique = Array.from(new Set(profiles.map((p) => p.city)));
    return ['Alle byer', ...unique];
  }, [profiles]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setMinAge(18);
    setMaxAge(40);
    setSelectedCity('Alle byer');
    setMaxDistanceKm(null);
    setSelectedInterests([]);
    setSelectedEducation('Alle');
    setSelectedGoal('Alle');
    setOnlyVerified(false);
    setSortMode('recommended');
  };

  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (minAge !== 18 || maxAge !== 40) count += 1;
    if (selectedCity !== 'Alle byer') count += 1;
    if (maxDistanceKm !== null) count += 1;
    if (selectedInterests.length > 0) count += 1;
    if (selectedEducation !== 'Alle') count += 1;
    if (selectedGoal !== 'Alle') count += 1;
    if (onlyVerified) count += 1;
    return count;
  }, [
    minAge,
    maxAge,
    selectedCity,
    maxDistanceKm,
    selectedInterests.length,
    selectedEducation,
    selectedGoal,
    onlyVerified,
  ]);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matched = profiles.filter((p) => {
      // Quick tab filter
      if (statusFilter === 'online' && !p.isOnline) return false;
      if (statusFilter === 'new' && !p.isNew) return false;
      if (statusFilter === 'verified' && !p.verified) return false;

      // Age range
      if (p.age < minAge || p.age > maxAge) return false;

      // City & Distance
      if (selectedCity !== 'Alle byer' && p.city !== selectedCity) return false;
      if (maxDistanceKm !== null && p.distanceKm > maxDistanceKm) return false;

      // Specific interests (matches any selected interest or all? Let's match profiles that share ALL selected interests for precision, or check case-insensitive)
      if (selectedInterests.length > 0) {
        const lowerInterests = p.interests.map((i) => i.toLowerCase());
        const hasAllSelected = selectedInterests.every((sel) =>
          lowerInterests.includes(sel.toLowerCase())
        );
        if (!hasAllSelected) return false;
      }

      // Education level
      if (selectedEducation !== 'Alle' && p.education !== selectedEducation) {
        return false;
      }

      // Relationship goal
      if (selectedGoal !== 'Alle' && p.relationshipGoal !== selectedGoal) {
        return false;
      }

      // Verified toggle
      if (onlyVerified && !p.verified) return false;

      // Free-text search query
      if (query) {
        const searchable = [
          p.name,
          p.city,
          p.occupation,
          p.bio,
          p.education,
          p.relationshipGoal,
          ...p.interests,
        ]
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(query)) return false;
      }

      return true;
    });

    if (sortMode === 'nearest') {
      return [...matched].sort((a, b) => a.distanceKm - b.distanceKm);
    }
    if (sortMode === 'ageAsc') {
      return [...matched].sort((a, b) => a.age - b.age);
    }
    return matched;
  }, [
    profiles,
    statusFilter,
    minAge,
    maxAge,
    selectedCity,
    maxDistanceKm,
    selectedInterests,
    selectedEducation,
    selectedGoal,
    onlyVerified,
    searchQuery,
    sortMode,
  ]);

  const quickTabs: Array<{ id: QuickStatusFilter; label: string }> = [
    { id: 'all', label: 'Alle' },
    { id: 'online', label: 'Aktive nå' },
    { id: 'new', label: 'Nye' },
    { id: 'verified', label: 'Verifiserte' },
  ];

  const hasAnyActiveFilter =
    activeAdvancedFilterCount > 0 ||
    statusFilter !== 'all' ||
    Boolean(searchQuery.trim());

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Utforsk i nærheten
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Målrettet søk etter alder, lokasjon, interesser, utdanning og preferanser
          </p>
        </div>

        {/* Search Input + Filter Menu Trigger */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk etter interesse, by, yrke..."
              aria-label="Søk i profiler"
              className="w-full min-h-[44px] pl-10 pr-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                aria-label="Tøm søk"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFilterDrawerOpen((prev) => !prev)}
            aria-expanded={filterDrawerOpen}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0 ${
              filterDrawerOpen || activeAdvancedFilterCount > 0
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>
              Filtrer
              {activeAdvancedFilterCount > 0
                ? ` (${activeAdvancedFilterCount})`
                : ''}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Segmented Bar + Quick Interest Shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div
            role="tablist"
            aria-label="Hurtigfilter"
            className="inline-flex items-center p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800 shrink-0"
          >
            {quickTabs.map((btn) => {
              const active = statusFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(btn.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort Selector & Live Dynamic Count */}
        <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
          <span className="tabular-nums">
            Viser <strong className="text-zinc-900 dark:text-zinc-100">{filteredProfiles.length}</strong> av{' '}
            {profiles.length} profiler
          </span>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
            ·
          </span>
          <label className="inline-flex items-center gap-1.5">
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">Sorter:</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="min-h-[38px] bg-transparent font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
            >
              <option value="recommended" className="bg-white dark:bg-zinc-900">Anbefalt</option>
              <option value="nearest" className="bg-white dark:bg-zinc-900">Nærmest meg</option>
              <option value="ageAsc" className="bg-white dark:bg-zinc-900">Alder (lav–høy)</option>
            </select>
          </label>
        </div>
      </div>

      {/* Advanced Search & Filter Panel */}
      <AnimatePresence initial={false}>
        {filterDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-sm space-y-6"
          >
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Avanserte søkefiltre
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Resultatene i rutenettet oppdateres dynamisk mens du velger kriterier
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFilterDrawerOpen(false)}
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              aria-label="Skjul filterpanel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Age Range Filter */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Aldersspenn
                </label>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {minAge} – {maxAge} år
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                    Fra alder
                  </span>
                  <input
                    type="range"
                    min={18}
                    max={45}
                    value={minAge}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMinAge(Math.min(val, maxAge));
                    }}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                    Til alder
                  </span>
                  <input
                    type="range"
                    min={18}
                    max={45}
                    value={maxAge}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setMaxAge(Math.max(val, minAge));
                    }}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2. Location & Max Distance Filter */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Lokasjon og maks avstand
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  aria-label="Velg by"
                  className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <select
                  value={maxDistanceKm === null ? '' : String(maxDistanceKm)}
                  onChange={(e) =>
                    setMaxDistanceKm(
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  aria-label="Maks avstand"
                  className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  {MAX_DISTANCE_OPTIONS.map((opt) => (
                    <option
                      key={opt.label}
                      value={opt.value === null ? '' : String(opt.value)}
                    >
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Education Level & Relationship Goal */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Utdanningsnivå og relasjonsmål
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <select
                  value={selectedEducation}
                  onChange={(e) =>
                    setSelectedEducation(
                      e.target.value as EducationLevel | 'Alle'
                    )
                  }
                  aria-label="Utdanningsnivå"
                  className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  <option value="Alle">Alle utdanninger</option>
                  {EDUCATION_OPTIONS.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedGoal}
                  onChange={(e) =>
                    setSelectedGoal(e.target.value as RelationshipGoal | 'Alle')
                  }
                  aria-label="Relasjonsmål"
                  className="min-h-[44px] px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  <option value="Alle">Alle relasjonsmål</option>
                  {RELATIONSHIP_GOAL_OPTIONS.map((goal) => (
                    <option key={goal} value={goal}>
                      {goal}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Specific Interests Multi-Select */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Spesifikke interesser (velg én eller flere)
              </span>
              {selectedInterests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedInterests([])}
                  className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                >
                  Tøm interesser
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {availableInterests.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={isSelected}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-rose-600 text-white'
                        : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Filter Actions */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={onlyVerified}
                onChange={(e) => setOnlyVerified(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-600"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                Vis kun selfie-verifiserte profiler
              </span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={resetAllFilters}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nullstill filtre</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterDrawerOpen(false)}
                className="flex-1 sm:flex-initial min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-white transition whitespace-nowrap tabular-nums"
              >
                Vis {filteredProfiles.length} treff
              </button>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Summary Line */}
      {hasAnyActiveFilter && !filterDrawerOpen && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200/70 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">Aktive filtre:</span>
            {(minAge !== 18 || maxAge !== 40) && (
              <span>
                Alder {minAge}–{maxAge} år
              </span>
            )}
            {selectedCity !== 'Alle byer' && <span>· {selectedCity}</span>}
            {maxDistanceKm !== null && (
              <span>· Inntil {maxDistanceKm} km</span>
            )}
            {selectedEducation !== 'Alle' && (
              <span>· {selectedEducation}</span>
            )}
            {selectedGoal !== 'Alle' && <span>· {selectedGoal}</span>}
            {selectedInterests.length > 0 && (
              <span>· Interesser: {selectedInterests.join(', ')}</span>
            )}
            {onlyVerified && <span>· Kun verifiserte</span>}
            {searchQuery.trim() && <span>· Søk: «{searchQuery.trim()}»</span>}
          </div>

          <button
            type="button"
            onClick={resetAllFilters}
            className="min-h-[36px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 whitespace-nowrap"
          >
            Nullstill alle
          </button>
        </div>
      )}

      {/* Responsive Profile Grid */}
      {filteredProfiles.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-10 text-center">
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Ingen profiler matcher akkurat denne kombinasjonen av filtre
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Prøv å utvide aldersspennet, fjerne en interesse eller velge alle byer.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-white transition whitespace-nowrap"
          >
            Tilbakestill alle søkefiltre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          <AnimatePresence mode="popLayout">
            {filteredProfiles.map((profile) => {
              const match = matches.find((m) => m.profileId === profile.id);
              const liked = swipedRightIds.includes(profile.id);

              return (
                <motion.article
                  key={profile.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 aspect-[3/4] shadow-xs border border-zinc-200/70 dark:border-zinc-800"
                >
                <button
                  type="button"
                  onClick={() => onSelectProfile(profile)}
                  className="w-full h-full text-left block focus-visible:outline-2 focus-visible:outline-rose-600"
                  aria-label={`Se profilen til ${profile.name}, ${profile.age} år`}
                >
                  <SafeImage
                    src={profile.image}
                    alt={`${profile.name}, ${profile.age} år fra ${profile.city}`}
                    fallbackLabel={`${profile.name}, ${profile.age}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

                  {/* Bottom Profile Info */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 text-white">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                        {profile.name},{' '}
                        <span className="tabular-nums">{profile.age}</span>
                      </h2>
                      {profile.verified && <VerifiedBadge size="sm" />}
                    </div>

                    {/* Online & New Status as Clean Unboxed Metadata */}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-white/90 truncate">
                      {profile.isOnline ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300 shrink-0">
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-400"
                            aria-hidden="true"
                          />
                          Aktiv nå
                        </span>
                      ) : (
                        <span className="text-white/75 shrink-0">
                          {profile.lastActiveLabel}
                        </span>
                      )}
                      {profile.isNew && (
                        <>
                          <span aria-hidden="true" className="text-white/50">
                            ·
                          </span>
                          <span className="text-rose-200 font-medium shrink-0">
                            Ny
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/75 truncate">
                      <span>{profile.city}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {profile.distanceKm} km
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{profile.education}</span>
                    </div>

                    <div className="mt-1 text-[11px] text-white/75 truncate flex items-center gap-1">
                      {profile.interests.some((i) =>
                        viewerInterestSet.has(normalizeInterestKey(i))
                      ) && (
                        <Sparkles
                          className="w-3 h-3 text-rose-300 shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">
                        {profile.interests.slice(0, 3).join(' · ')}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Quick Action Touch Button (44x44px hitbox) */}
                <div className="absolute top-2.5 right-2.5 z-10">
                  {match ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChat(match.id);
                      }}
                      className="min-h-[44px] min-w-[44px] rounded-full bg-white/90 backdrop-blur-md text-zinc-900 flex items-center justify-center shadow-sm hover:bg-white active:scale-95 transition"
                      aria-label={`Åpne chat med ${profile.name}`}
                      title="Send melding"
                    >
                      <MessageCircle className="w-4 h-4 text-rose-600" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!liked) onQuickLike(profile.id);
                      }}
                      disabled={liked}
                      className={`min-h-[44px] min-w-[44px] rounded-full backdrop-blur-md flex items-center justify-center shadow-sm active:scale-95 transition ${
                        liked
                          ? 'bg-rose-600 text-white'
                          : 'bg-black/35 text-white hover:bg-rose-600'
                      }`}
                      aria-label={
                        liked
                          ? `Du har allerede likt ${profile.name}`
                          : `Lik ${profile.name}`
                      }
                      title={liked ? 'Allerede likt' : 'Lik profil'}
                    >
                      <Heart
                        className="w-4 h-4"
                        fill={liked ? 'currentColor' : 'none'}
                      />
                    </button>
                  )}
                </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
