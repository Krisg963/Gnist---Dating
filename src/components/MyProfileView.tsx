import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Eye,
  Heart,
  History,
  ImagePlus,
  MapPin,
  Monitor,
  Moon,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DEFAULT_USER_PHOTOS,
  EDUCATION_OPTIONS,
  INTEREST_OPTIONS,
  RELATIONSHIP_GOAL_OPTIONS,
} from '../data/profiles';
import type {
  BlockedUserRecord,
  CurrentUser,
  DatingProfile,
  EducationLevel,
  RelationshipGoal,
  SwipeHistoryEntry,
  SwipeStats,
  ThemeMode,
} from '../types';
import { PWAInstallControl, SafeImage, VerifiedBadge } from './CommonUI';
import { InterestBadges } from './InterestBadges';

interface ThemeControlsProps {
  themeMode: ThemeMode;
  isDark: boolean;
  systemPrefersDark: boolean;
  onSetThemeMode: (mode: ThemeMode) => void;
  onToggleDarkMode: () => void;
}

interface PushControlsProps {
  isSubscribed: boolean;
  inAppFallbackActive: boolean;
  notifyMatches: boolean;
  notifyMessages: boolean;
  busy: boolean;
  statusNote: string | null;
  onSubscribe: () => Promise<boolean>;
  onUnsubscribe: () => Promise<void>;
  onUpdatePreferences: (matches: boolean, messages: boolean) => Promise<void>;
  onSendTestPush: (kind: 'match' | 'message') => Promise<void>;
}

interface MyProfileViewProps {
  currentUser: CurrentUser;
  swipeStats: SwipeStats;
  swipeHistory: SwipeHistoryEntry[];
  matchesCount: number;
  blockedUsers: BlockedUserRecord[];
  profileMap: Record<string, DatingProfile>;
  matchingCountsByInterest: Record<string, number>;
  themeControls: ThemeControlsProps;
  pushControls: PushControlsProps;
  onSaveProfile: (updates: Partial<CurrentUser>) => Promise<boolean>;
  onUnblockUser: (profileId: string) => Promise<void>;
  onSelectHistoryProfile: (profile: DatingProfile) => void;
  onSelectInterest: (interest: string) => void;
  onOpenVideoIntroModal: () => void;
  onDeleteVideoIntro: () => Promise<boolean>;
  onOpenVerificationModal: () => void;
  onPreviewPublicModal: (publicProfile: DatingProfile) => void;
}

function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunne ikke lese bildefil'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ugyldig bildeformat'));
      img.onload = () => {
        const maxDim = 960;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const MyProfileView: React.FC<MyProfileViewProps> = ({
  currentUser,
  swipeStats,
  swipeHistory,
  matchesCount,
  blockedUsers,
  profileMap,
  matchingCountsByInterest,
  themeControls,
  pushControls,
  onSaveProfile,
  onUnblockUser,
  onSelectHistoryProfile,
  onSelectInterest,
  onOpenVideoIntroModal,
  onDeleteVideoIntro,
  onOpenVerificationModal,
  onPreviewPublicModal,
}) => {
  const savedPhotos =
    currentUser.photos !== null ? currentUser.photos : DEFAULT_USER_PHOTOS;

  // Form State
  const [name, setName] = useState(currentUser.name);
  const [age, setAge] = useState<number>(currentUser.age);
  const [city, setCity] = useState(currentUser.city);
  const [occupation, setOccupation] = useState(currentUser.occupation);
  const [education, setEducation] = useState<EducationLevel>(
    currentUser.education
  );
  const [relationshipGoal, setRelationshipGoal] = useState<RelationshipGoal>(
    currentUser.relationshipGoal
  );
  const [bio, setBio] = useState(currentUser.bio);
  const [interests, setInterests] = useState<string[]>(currentUser.interests);
  const [photos, setPhotos] = useState<string[]>(savedPhotos);
  const [customInterest, setCustomInterest] = useState('');

  // UI State
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewPhotoIdx, setPreviewPhotoIdx] = useState(0);
  const [publicPreviewTab, setPublicPreviewTab] = useState<'photos' | 'video'>(
    'photos'
  );
  const [historyFilter, setHistoryFilter] = useState<
    'all' | 'right' | 'left'
  >('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(currentUser.name);
    setAge(currentUser.age);
    setCity(currentUser.city);
    setOccupation(currentUser.occupation);
    setEducation(currentUser.education);
    setRelationshipGoal(currentUser.relationshipGoal);
    setBio(currentUser.bio);
    setInterests(currentUser.interests);
    setPhotos(
      currentUser.photos !== null ? currentUser.photos : DEFAULT_USER_PHOTOS
    );
  }, [currentUser]);

  // Swipe Statistics Calculation
  const totalSwipes = swipeStats.rightCount + swipeStats.leftCount;
  const rightPercent =
    totalSwipes > 0 ? Math.round((swipeStats.rightCount / totalSwipes) * 100) : 0;
  const leftPercent = totalSwipes > 0 ? 100 - rightPercent : 0;

  const preferenceInsight =
    totalSwipes === 0
      ? 'Sveip på noen profiler under Sveip-fanen for å se mønsteret i preferansene dine.'
      : rightPercent < 35
        ? 'Du er selektiv og målrettet — du sveiper kun høyre når profilen virkelig skiller seg ut.'
        : rightPercent <= 70
          ? 'Balansert preferansemønster — en god kombinasjon av tydelige valg og åpenhet for nye mennesker.'
          : 'Du er åpen og imøtekommende — du gir mange muligheten til en god første samtale.';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = Math.max(0, 6 - photos.length);
    const filesToRead = Array.from(fileList).slice(0, remainingSlots);

    try {
      const compressed = await Promise.all(filesToRead.map(compressImageFile));
      setPhotos((prev) => [...prev, ...compressed].slice(0, 6));
      setSaveSuccess(false);
    } catch {
      // Ignore invalid image files
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (idxToRemove: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== idxToRemove);
      if (previewPhotoIdx >= next.length) {
        setPreviewPhotoIdx(Math.max(0, next.length - 1));
      }
      return next;
    });
    setSaveSuccess(false);
  };

  const handleMakePrimaryPhoto = (idx: number) => {
    if (idx <= 0 || idx >= photos.length) return;
    setPhotos((prev) => {
      const chosen = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [chosen, ...rest];
    });
    setPreviewPhotoIdx(0);
    setSaveSuccess(false);
  };

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
    setSaveSuccess(false);
  };

  const handleAddCustomInterest = () => {
    const trimmed = customInterest.trim();
    if (!trimmed) return;
    if (!interests.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setInterests((prev) => [...prev, trimmed]);
      setSaveSuccess(false);
    }
    setCustomInterest('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clampedAge = Math.min(99, Math.max(18, Number(age) || 18));
    setAge(clampedAge);
    setSaving(true);
    const ok = await onSaveProfile({
      name: name.trim() || currentUser.name,
      age: clampedAge,
      city: city.trim() || currentUser.city,
      occupation: occupation.trim(),
      education,
      relationshipGoal,
      bio: bio.trim(),
      interests,
      photos,
    });
    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
    }
  };

  const publicPhotos =
    savedPhotos.length > 0
      ? savedPhotos
      : currentUser.selfieDataUrl
        ? [currentUser.selfieDataUrl]
        : [];

  const activePublicPhoto =
    publicPhotos[previewPhotoIdx] || publicPhotos[0] || '';

  const publicProfileData: DatingProfile = {
    id: currentUser.id,
    name: currentUser.name,
    age: currentUser.age,
    city: currentUser.city,
    distanceKm: 0,
    occupation: currentUser.occupation,
    education: currentUser.education,
    relationshipGoal: currentUser.relationshipGoal,
    verified: currentUser.verified,
    isOnline: true,
    isNew: false,
    lastActiveLabel: 'Aktiv nå',
    bio: currentUser.bio,
    interests: currentUser.interests,
    prompts: [],
    image: publicPhotos[0] || '',
    images: publicPhotos,
    videoIntroUrl: currentUser.videoIntroUrl,
    videoIntroDurationSec: currentUser.videoIntroDurationSec,
    videoIntroPrompt: currentUser.videoIntroPrompt,
    icebreakers: ['Hei!', 'Hvordan går det?', 'Lyst til å ta en kaffe?'],
    readReceiptsEnabled: currentUser.readReceiptsEnabled,
    isCurrentUserPreview: true,
  };

  const recentTenHistory = swipeHistory.slice(0, 10);
  const filteredHistory = recentTenHistory.filter((item) => {
    if (historyFilter === 'right') return item.direction === 'right';
    if (historyFilter === 'left') return item.direction === 'left';
    return true;
  });

  const allSelectableInterests = Array.from(
    new Set([...INTEREST_OPTIONS, ...interests])
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Min profil og preferanser
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Rediger din offentlige profil, tilpass lys eller mørk modus og se innsikt i egne sveipevalg
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPreviewPublicModal(publicProfileData)}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0"
        >
          <Eye className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <span>Se offentlig profil i fullskjerm</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column (7 cols): Interactive Interest Badges + Swipe Statistics Module + Swipe History + Profile Editor Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* 0. INTERAKTIVE INTERESSE-MERKER MODUL */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-5 h-5 mt-0.5 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Mine interesse-merker
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Merker lyser opp når du har felles interesser med andre brukere — trykk på et merke for å se hvem som deler interessen.
                  </p>
                </div>
              </div>
            </div>

            {currentUser.interests.length > 0 ? (
              <div className="pt-1">
                <InterestBadges
                  interests={currentUser.interests}
                  viewerInterests={currentUser.interests}
                  isOwnProfile
                  matchingCountsByInterest={matchingCountsByInterest}
                  onSelectInterest={onSelectInterest}
                  showHeader={false}
                />
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pt-1">
                Du har ikke valgt noen interesser ennå. Legg til interesser i skjemaet nedenfor for å aktivere interesse-merker.
              </p>
            )}
          </div>

          {/* 1. SVEIPE-STATISTIKK MODUL */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Sveipe-statistikk
                </h2>
              </div>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                {totalSwipes} vurderte profiler
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 py-3 border-y border-zinc-100 dark:border-zinc-800">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Høyre (Likt)
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {rightPercent}%
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    ({swipeStats.rightCount})
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Venstre (Avvist)
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {leftPercent}%
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    ({swipeStats.leftCount})
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Aktive matcher
                </p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {matchesCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div
                className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex"
                role="img"
                aria-label={`Sveipefordeling: ${rightPercent} prosent høyre og ${leftPercent} prosent venstre`}
              >
                <motion.div
                  initial={false}
                  animate={{ scaleX: rightPercent / 100 }}
                  style={{ width: '100%', transformOrigin: 'left' }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full bg-rose-600"
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Heart
                    className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"
                    fill="currentColor"
                  />
                  <span>Sveip høyre · {swipeStats.rightCount} profiler</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <X className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>Sveip venstre · {swipeStats.leftCount} profiler</span>
                </span>
              </div>
            </div>

            <p className="mt-3.5 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {preferenceInsight}
            </p>
          </div>

          {/* 1B. SVEIPE-HISTORIKK MODUL (SISTE 10 SVEIP) */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <History className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                    Sveipe-historikk
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  De siste 10 profilene du har sveipet på — åpne profilen på nytt ved eventuelle feilsveip
                </p>
              </div>

              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                {recentTenHistory.length} / 10 siste sveip
              </span>
            </div>

            {/* Interactive Filter Tabs for Quick Feilsveip Lookup */}
            <div
              role="tablist"
              aria-label="Filtrer sveipehistorikk"
              className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4"
            >
              {[
                { id: 'all' as const, label: `Alle (${recentTenHistory.length})` },
                {
                  id: 'right' as const,
                  label: `Høyre (${recentTenHistory.filter((h) => h.direction === 'right').length})`,
                },
                {
                  id: 'left' as const,
                  label: `Venstre (${recentTenHistory.filter((h) => h.direction === 'left').length})`,
                },
              ].map((tab) => {
                const active = historyFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setHistoryFilter(tab.id)}
                    className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-colors whitespace-nowrap tabular-nums ${
                      active
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="py-6 text-center border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {recentTenHistory.length === 0
                    ? 'Du har ingen sveip i historikken ennå.'
                    : historyFilter === 'left'
                      ? 'Ingen venstre-sveip blant dine siste 10 vurderinger.'
                      : 'Ingen høyre-sveip blant dine siste 10 vurderinger.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border-t border-zinc-100 dark:border-zinc-800">
                {filteredHistory.map((entry) => {
                  const profile = profileMap[entry.profileId];
                  if (!profile) return null;
                  const isRight = entry.direction === 'right';

                  return (
                    <div
                      key={`${entry.profileId}-${entry.swipedAt}`}
                      className="py-3.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectHistoryProfile(profile)}
                        className="flex items-center gap-3.5 min-w-0 text-left group flex-1"
                      >
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                          <SafeImage
                            src={profile.image}
                            alt={profile.name}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-150"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 group-hover:underline truncate">
                              {profile.name},{' '}
                              <span className="tabular-nums">{profile.age}</span>
                            </span>
                            {profile.verified && <VerifiedBadge size="sm" />}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span
                              className={
                                isRight
                                  ? 'text-rose-600 dark:text-rose-400 font-medium'
                                  : 'text-zinc-600 dark:text-zinc-300 font-medium'
                              }
                            >
                              {isRight
                                ? entry.matched
                                  ? 'Sveipet høyre · Match'
                                  : 'Sveipet høyre'
                                : 'Sveipet venstre'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{profile.city}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{entry.swipedAt}</span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectHistoryProfile(profile)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                        <span>Se profil</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. PROFILREDIGERINGSSKJEMA */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-6"
          >
            <div className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Rediger profil
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Oppdater navn, alder, bildegalleri og biografi — lagrede endringer vises umiddelbart på din offentlige profil
              </p>
            </div>

            {/* Photo Gallery Manager */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Mine profilbilder ({photos.length}/6)
                </label>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Første bilde er hovedbilde
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photoSrc, idx) => (
                  <div
                    key={`${idx}-${photoSrc.slice(-18)}`}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 group"
                  >
                    <SafeImage
                      src={photoSrc}
                      alt={`${name || 'Profilbilde'} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25 pointer-events-none" />

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-2 right-2 min-h-[36px] min-w-[36px] rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-rose-600 transition"
                      aria-label={`Fjern bilde ${idx + 1}`}
                      title="Fjern bilde"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
                      {idx === 0 ? (
                        <span className="text-[11px] font-semibold text-white inline-flex items-center gap-1">
                          <Star
                            className="w-3 h-3 text-amber-300"
                            fill="currentColor"
                          />
                          Hovedbilde
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMakePrimaryPhoto(idx)}
                          className="min-h-[30px] px-2.5 py-1 rounded-lg bg-white/90 text-zinc-900 text-[11px] font-semibold hover:bg-white transition whitespace-nowrap"
                        >
                          Sett som hoved
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-rose-500 dark:hover:border-rose-500 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 flex flex-col items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-4 transition"
                  >
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs font-semibold text-center">
                      Legg til bilde
                    </span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {/* Name & Age */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Fornavn
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  maxLength={40}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-age"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Alder
                </label>
                <input
                  id="profile-age"
                  type="number"
                  required
                  min={18}
                  max={99}
                  value={age}
                  onChange={(e) => {
                    setAge(Number(e.target.value));
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 tabular-nums focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>
            </div>

            {/* City & Occupation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-city"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  By / Lokasjon
                </label>
                <input
                  id="profile-city"
                  type="text"
                  required
                  maxLength={50}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-occupation"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Yrke / Studier
                </label>
                <input
                  id="profile-occupation"
                  type="text"
                  maxLength={60}
                  value={occupation}
                  onChange={(e) => {
                    setOccupation(e.target.value);
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>
            </div>

            {/* Education & Relationship Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-education"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Utdanningsnivå
                </label>
                <select
                  id="profile-education"
                  value={education}
                  onChange={(e) => {
                    setEducation(e.target.value as EducationLevel);
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  {EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="profile-goal"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Hva jeg ser etter
                </label>
                <select
                  id="profile-goal"
                  value={relationshipGoal}
                  onChange={(e) => {
                    setRelationshipGoal(e.target.value as RelationshipGoal);
                    setSaveSuccess(false);
                  }}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                >
                  {RELATIONSHIP_GOAL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Biography */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="profile-bio"
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Biografi
                </label>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                  {bio.length}/400
                </span>
              </div>
              <textarea
                id="profile-bio"
                rows={4}
                maxLength={400}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  setSaveSuccess(false);
                }}
                placeholder="Fortell litt om hva du liker å bruke dagene på..."
                className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
              />
            </div>

            {/* Interests Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Mine interesser
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {allSelectableInterests.map((item) => {
                  const active = interests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleInterest(item)}
                      aria-pressed={active}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition whitespace-nowrap ${
                        active
                          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                          : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={28}
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomInterest();
                    }
                  }}
                  placeholder="Legg til egen interesse..."
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-800/70 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
                <button
                  type="button"
                  onClick={handleAddCustomInterest}
                  disabled={!customInterest.trim()}
                  className="min-h-[42px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 inline-flex items-center gap-1 transition whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Legg til</span>
                </button>
              </div>
            </div>

            {/* Save Button + Confirmation */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
              {saveSuccess && (
                <div
                  role="status"
                  className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-4 py-3 flex items-center gap-2.5 text-xs sm:text-sm font-medium text-emerald-900 dark:text-emerald-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Endringene er lagret og vises nå på din offentlige profil!
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 active:scale-[0.99] transition whitespace-nowrap shadow-xs"
              >
                {saving ? 'Lagrer endringer...' : 'Lagre endringer'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (5 cols): Theme Settings + Live Public Profile Card + Video Intro + Web Push + Verification + Blocked + PWA */}
        <aside className="lg:col-span-5 space-y-6">
          {/* UTSEENDE OG MØRK MODUS (PROFILE SETTINGS CARD) */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                {themeControls.isDark ? (
                  <Moon className="w-5 h-5 mt-0.5 text-rose-500 shrink-0" />
                ) : (
                  <Sun className="w-5 h-5 mt-0.5 text-amber-500 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Utseende og mørk modus
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Bytt automatisk etter systeminnstillinger eller bruk bryteren for manuell visning.
                  </p>
                </div>
              </div>

              {/* Manual Dark Mode Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={themeControls.isDark}
                aria-label="Slå mørk modus av eller på"
                onClick={themeControls.onToggleDarkMode}
                className="min-h-[44px] min-w-[56px] flex items-center justify-end shrink-0"
              >
                <span
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                    themeControls.isDark
                      ? 'bg-rose-600 justify-end'
                      : 'bg-zinc-200 dark:bg-zinc-700 justify-start'
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    className="w-5 h-5 rounded-full bg-white shadow-xs block"
                  />
                </span>
              </button>
            </div>

            {/* 3-Way Segmented Mode Selector: System / Lys / Mørk */}
            <div
              role="radiogroup"
              aria-label="Velg temamodus"
              className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            >
              {(
                [
                  { id: 'system', label: 'System', icon: Monitor },
                  { id: 'light', label: 'Lys', icon: Sun },
                  { id: 'dark', label: 'Mørk', icon: Moon },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = themeControls.themeMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => themeControls.onSetThemeMode(opt.id)}
                    className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {themeControls.themeMode === 'system'
                ? `Følger systeminnstillinger automatisk (${
                    themeControls.systemPrefersDark
                      ? 'mørk bakgrunn aktiv'
                      : 'lys bakgrunn aktiv'
                  }).`
                : themeControls.themeMode === 'dark'
                  ? 'Manuell mørk modus er aktivert på tvers av hele appen.'
                  : 'Manuell lys modus er aktivert på tvers av hele appen.'}
            </p>
          </div>

          {/* MELDINGER OG LESEBEKREFTELSER (PRIVACY SETTING) */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCheck
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    currentUser.readReceiptsEnabled !== false
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Lesebekreftelser i meldinger
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    La matcher se når du har åpnet meldingene deres, og se når de har åpnet dine.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={currentUser.readReceiptsEnabled !== false}
                aria-label="Slå lesebekreftelser av eller på"
                onClick={() => {
                  void onSaveProfile({
                    readReceiptsEnabled: !(
                      currentUser.readReceiptsEnabled !== false
                    ),
                  });
                }}
                className="min-h-[44px] min-w-[56px] flex items-center justify-end shrink-0"
              >
                <span
                  className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center ${
                    currentUser.readReceiptsEnabled !== false
                      ? 'bg-sky-600 justify-end'
                      : 'bg-zinc-200 dark:bg-zinc-700 justify-start'
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    className="w-5 h-5 rounded-full bg-white shadow-xs block"
                  />
                </span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {currentUser.readReceiptsEnabled !== false
                ? 'Aktivert — du ser dobbel hake og «Lest» på meldinger når mottakeren heller ikke har deaktivert dette.'
                : 'Deaktivert — lesebekreftelser deles og vises ikke i meldingsvisningen.'}
            </p>
          </div>

          {/* PUBLIC PROFILE CARD */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Din offentlige profil (lagret visning)
              </span>

              {currentUser.videoIntroUrl ? (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => setPublicPreviewTab('photos')}
                    className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      publicPreviewTab === 'photos'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Bilder
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublicPreviewTab('video')}
                    className={`min-h-[30px] px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                      publicPreviewTab === 'video'
                        ? 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <Video className="w-3 h-3" />
                    <span className="tabular-nums">
                      Video ({currentUser.videoIntroDurationSec || 15}s)
                    </span>
                  </button>
                </div>
              ) : (
                publicPhotos.length > 1 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    Bilde {previewPhotoIdx + 1} av {publicPhotos.length}
                  </span>
                )
              )}
            </div>

            {publicPreviewTab === 'video' && currentUser.videoIntroUrl ? (
              <div className="relative aspect-[3/4] bg-zinc-950">
                <video
                  src={currentUser.videoIntroUrl}
                  controls
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="relative aspect-[3/4] bg-zinc-100 dark:bg-zinc-800">
                <SafeImage
                  src={activePublicPhoto}
                  alt={`${currentUser.name}, ${currentUser.age} år`}
                  fallbackLabel={`${currentUser.name}, ${currentUser.age}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                {publicPhotos.length > 1 && (
                  <>
                    <div className="absolute top-3 inset-x-4 flex items-center gap-1.5">
                      {publicPhotos.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewPhotoIdx(idx)}
                          aria-label={`Se bilde ${idx + 1}`}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            idx === previewPhotoIdx ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhotoIdx(
                          (p) =>
                            (p - 1 + publicPhotos.length) % publicPhotos.length
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[42px] min-w-[42px] rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/55 transition"
                      aria-label="Forrige profilbilde"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhotoIdx((p) => (p + 1) % publicPhotos.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[42px] min-w-[42px] rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/55 transition"
                      aria-label="Neste profilbilde"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold tracking-tight">
                      {currentUser.name},{' '}
                      <span className="tabular-nums">{currentUser.age}</span>
                    </h3>
                    {currentUser.verified && <VerifiedBadge size="md" />}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-white/90">
                    {currentUser.occupation && (
                      <>
                        <span>{currentUser.occupation}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {currentUser.city}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <span>{currentUser.education}</span>
                <span aria-hidden="true">·</span>
                <span>{currentUser.relationshipGoal}</span>
              </div>

              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {currentUser.bio || 'Ingen biografi lagret ennå.'}
              </p>

              {currentUser.interests.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <InterestBadges
                    interests={currentUser.interests}
                    viewerInterests={currentUser.interests}
                    isOwnProfile
                    matchingCountsByInterest={matchingCountsByInterest}
                    onSelectInterest={onSelectInterest}
                    compact
                  />
                </div>
              )}
            </div>
          </div>

          {/* 15-SECOND VIDEO INTRODUCTION STUDIO CARD */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start gap-3">
              <Video
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  currentUser.videoIntroUrl
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  15-sekunders video-introduksjon
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Spill inn en kort video med kamera og mikrofon slik at andre kan høre stemmen din og bli raskere kjent med deg.
                </p>
              </div>
            </div>

            {currentUser.videoIntroUrl && (
              <div className="space-y-2.5 pt-1">
                <div className="rounded-2xl overflow-hidden bg-zinc-950 aspect-[3/4] max-h-[280px] mx-auto">
                  <video
                    src={currentUser.videoIntroUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="tabular-nums">
                    Lengde: {currentUser.videoIntroDurationSec || 15} sek
                    {currentUser.videoIntroUpdatedAt
                      ? ` · Lagret ${currentUser.videoIntroUpdatedAt}`
                      : ''}
                  </span>
                  {currentUser.videoIntroPrompt && (
                    <span className="truncate max-w-[200px]">
                      «{currentUser.videoIntroPrompt}»
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenVideoIntroModal}
                className={`flex-1 min-h-[46px] px-4 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition whitespace-nowrap ${
                  currentUser.videoIntroUrl
                    ? 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>
                  {currentUser.videoIntroUrl
                    ? 'Spill inn ny video'
                    : 'Spill inn 15s video-intro'}
                </span>
              </button>

              {currentUser.videoIntroUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPublicPreviewTab('photos');
                    void onDeleteVideoIntro();
                  }}
                  className="min-h-[46px] px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                  aria-label="Fjern video-introduksjon"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Fjern</span>
                </button>
              )}
            </div>
          </div>

          {/* WEB PUSH API NOTIFICATIONS CARD */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Bell
                  className={`w-5 h-5 mt-0.5 shrink-0 ${
                    pushControls.isSubscribed || pushControls.inAppFallbackActive
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Push-varsler (Web Push API)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Få varsel på Android og i nettleseren så snart du får en ny
                    match eller direktemelding.
                  </p>
                </div>
              </div>
            </div>

            {pushControls.statusNote && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700 rounded-xl p-3 leading-relaxed">
                {pushControls.statusNote}
              </p>
            )}

            {/* Channel Preferences */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center justify-between min-h-[40px] cursor-pointer select-none">
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  Varsle ved nye matcher
                </span>
                <input
                  type="checkbox"
                  checked={pushControls.notifyMatches}
                  onChange={(e) =>
                    pushControls.onUpdatePreferences(
                      e.target.checked,
                      pushControls.notifyMessages
                    )
                  }
                  className="w-4 h-4 rounded accent-rose-600"
                />
              </label>

              <label className="flex items-center justify-between min-h-[40px] cursor-pointer select-none">
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  Varsle ved nye meldinger
                </span>
                <input
                  type="checkbox"
                  checked={pushControls.notifyMessages}
                  onChange={(e) =>
                    pushControls.onUpdatePreferences(
                      pushControls.notifyMatches,
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 rounded accent-rose-600"
                />
              </label>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {pushControls.isSubscribed ? (
                <button
                  type="button"
                  disabled={pushControls.busy}
                  onClick={pushControls.onUnsubscribe}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  <BellOff className="w-4 h-4" />
                  <span>Deaktiver Web Push-abonnement</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pushControls.busy}
                  onClick={pushControls.onSubscribe}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-white inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  <Bell className="w-4 h-4" />
                  <span>
                    {pushControls.busy
                      ? 'Aktiverer push...'
                      : 'Aktiver Web Push-varsler'}
                  </span>
                </button>
              )}

              {/* Instant Verification Buttons for Web Push Delivery */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={pushControls.busy}
                  onClick={() => pushControls.onSendTestPush('match')}
                  className="min-h-[42px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Test match-push</span>
                </button>

                <button
                  type="button"
                  disabled={pushControls.busy}
                  onClick={() => pushControls.onSendTestPush('message')}
                  className="min-h-[42px] px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  <span>Test meldings-push</span>
                </button>
              </div>
            </div>
          </div>

          {/* Selfie Verification Status Card */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  currentUser.verified
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {currentUser.verified
                    ? 'Profilen din er selfie-verifisert'
                    : 'Bekreft profilen din med pose-selfie'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  {currentUser.verified
                    ? `Det blå verifiseringsmerket er aktivt på profilen din (${currentUser.verificationPose}).`
                    : 'Ta en rask selfie som matcher en gitt pose for å få et offisielt blått verifiseringsmerke.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenVerificationModal}
              className={`w-full min-h-[46px] px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                currentUser.verified
                  ? 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              {currentUser.verified
                ? 'Oppdater selfie-verifisering'
                : 'Start selfie-verifisering'}
            </button>
          </div>

          {/* Blocked Users Management Card */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Ban className="w-5 h-5 mt-0.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    Blokkerte brukere ({blockedUsers.length})
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Blokkerte profiler er skjult fra matche-lister, meldinger og søk.
                  </p>
                </div>
              </div>
            </div>

            {blockedUsers.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                Du har ikke blokkert noen brukere.
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border-t border-zinc-100 dark:border-zinc-800 pt-1">
                {blockedUsers.map((entry) => {
                  const p = profileMap[entry.profileId];
                  const displayName = p ? `${p.name}, ${p.age}` : entry.profileId;
                  return (
                    <div
                      key={entry.profileId}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p && (
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                            <SafeImage
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {entry.reason} · {entry.blockedAt}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onUnblockUser(entry.profileId)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap shrink-0"
                      >
                        Opphev
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PWA Home Screen Card */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 shadow-xs space-y-2.5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Gnist på hjemskjermen (PWA)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Installer web-appen direkte på Android eller iOS for rask tilgang i fullskjerm.
            </p>
            <PWAInstallControl />
          </div>
        </aside>
      </div>
    </section>
  );
};
