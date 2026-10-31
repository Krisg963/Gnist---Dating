import React, { useMemo } from 'react';
import {
  Compass,
  Heart,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CurrentUser, DatingProfile, MatchRecord } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';
import { normalizeInterestKey } from './InterestBadges';

interface InterestExplorerModalProps {
  selectedInterest: string | null;
  allInterests: string[];
  profiles: DatingProfile[];
  currentUser: CurrentUser;
  matches: MatchRecord[];
  swipedRightIds: string[];
  onChangeInterest: (interest: string) => void;
  onClose: () => void;
  onSelectProfile: (profile: DatingProfile) => void;
  onQuickLike: (profileId: string) => void;
  onOpenChat: (matchId: string) => void;
  onFilterInDiscover: (interest: string) => void;
}

export const InterestExplorerModal: React.FC<InterestExplorerModalProps> = ({
  selectedInterest,
  allInterests,
  profiles,
  currentUser,
  matches,
  swipedRightIds,
  onChangeInterest,
  onClose,
  onSelectProfile,
  onQuickLike,
  onOpenChat,
  onFilterInDiscover,
}) => {
  const viewerInterestSet = useMemo(
    () => new Set(currentUser.interests.map(normalizeInterestKey)),
    [currentUser.interests]
  );

  const countByInterest = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const profile of profiles) {
      for (const item of profile.interests) {
        const key = normalizeInterestKey(item);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [profiles]);

  const matchingProfiles = useMemo(() => {
    if (!selectedInterest) return [];
    const targetKey = normalizeInterestKey(selectedInterest);

    return profiles
      .filter((p) =>
        p.interests.some((item) => normalizeInterestKey(item) === targetKey)
      )
      .sort((a, b) => {
        const aShared = a.interests.filter((i) =>
          viewerInterestSet.has(normalizeInterestKey(i))
        ).length;
        const bShared = b.interests.filter((i) =>
          viewerInterestSet.has(normalizeInterestKey(i))
        ).length;
        if (bShared !== aShared) return bShared - aShared;
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [profiles, selectedInterest, viewerInterestSet]);

  const isSharedWithCurrentUser = selectedInterest
    ? viewerInterestSet.has(normalizeInterestKey(selectedInterest))
    : false;

  const selectableTabs = useMemo(() => {
    if (!selectedInterest) return allInterests;
    const exists = allInterests.some(
      (item) =>
        normalizeInterestKey(item) === normalizeInterestKey(selectedInterest)
    );
    return exists ? allInterests : [selectedInterest, ...allInterests];
  }, [allInterests, selectedInterest]);

  return (
    <AnimatePresence>
      {selectedInterest && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="interest-explorer-title"
            className="w-full sm:max-w-xl max-h-[88vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl transition-colors"
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-white dark:bg-zinc-900 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            {/* Header */}
            <div className="px-5 sm:px-6 pt-4 pb-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="interest-explorer-title"
                    className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
                  >
                    Interesse: {selectedInterest}
                  </h2>
                  {isSharedWithCurrentUser && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Felles med deg</span>
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                  {matchingProfiles.length}{' '}
                  {matchingProfiles.length === 1
                    ? 'bruker deler'
                    : 'brukere deler'}{' '}
                  denne interessen
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition shrink-0"
                aria-label="Lukk interesseoversikt"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Interest Switcher Bar */}
            <div className="px-5 sm:px-6 py-3 bg-zinc-50/80 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto shrink-0">
              {selectableTabs.map((item) => {
                const key = normalizeInterestKey(item);
                const isSelected =
                  key === normalizeInterestKey(selectedInterest);
                const isMine = viewerInterestSet.has(key);
                const count = countByInterest[key] || 0;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onChangeInterest(item)}
                    aria-pressed={isSelected}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900'
                        : isMine
                          ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 hover:border-rose-300'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {isMine && !isSelected && (
                      <Sparkles className="w-3 h-3 text-rose-500 shrink-0" />
                    )}
                    <span>{item}</span>
                    <span
                      className={`tabular-nums ${
                        isSelected
                          ? 'text-white/80 dark:text-zinc-600'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Matching Users List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80 px-5 sm:px-6">
              {matchingProfiles.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Ingen andre brukere med «{selectedInterest}» akkurat nå
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                    Velg et annet interesse-merke øverst for å utforske flere profiler i nærheten.
                  </p>
                </div>
              ) : (
                matchingProfiles.map((profile) => {
                  const match = matches.find((m) => m.profileId === profile.id);
                  const liked = swipedRightIds.includes(profile.id);
                  const sharedWithMe = profile.interests.filter((i) =>
                    viewerInterestSet.has(normalizeInterestKey(i))
                  );

                  return (
                    <div
                      key={profile.id}
                      className="py-4 flex items-center justify-between gap-3.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectProfile(profile);
                        }}
                        className="flex items-center gap-3.5 min-w-0 text-left group flex-1"
                      >
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                          <SafeImage
                            src={profile.image}
                            alt={`${profile.name}, ${profile.age} år`}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-150"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:underline truncate">
                              {profile.name},{' '}
                              <span className="tabular-nums">{profile.age}</span>
                            </span>
                            {profile.verified && <VerifiedBadge size="sm" />}
                            {profile.isOnline && (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                                · Aktiv nå
                              </span>
                            )}
                          </div>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{profile.occupation}</span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-0.5 tabular-nums">
                              <MapPin className="w-3 h-3" />
                              {profile.city} ({profile.distanceKm} km)
                            </span>
                          </div>

                          {sharedWithMe.length > 0 ? (
                            <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400 truncate inline-flex items-center gap-1 max-w-full">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {sharedWithMe.length} felles:{' '}
                                {sharedWithMe.join(' · ')}
                              </span>
                            </p>
                          ) : (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {profile.interests.join(' · ')}
                            </p>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        {match ? (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenChat(match.id);
                            }}
                            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chat</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={liked}
                            onClick={() => onQuickLike(profile.id)}
                            aria-label={
                              liked
                                ? `Allerede likt ${profile.name}`
                                : `Lik ${profile.name}`
                            }
                            title={liked ? 'Likt' : `Lik ${profile.name}`}
                            className={`min-h-[42px] min-w-[42px] rounded-xl border flex items-center justify-center transition shrink-0 ${
                              liked
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-rose-300 hover:text-rose-600 dark:hover:text-rose-400'
                            }`}
                          >
                            <Heart
                              className="w-4 h-4"
                              fill={liked ? 'currentColor' : 'none'}
                            />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectProfile(profile);
                          }}
                          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition whitespace-nowrap shrink-0"
                        >
                          Se profil
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Action to Jump to Discover Grid Filtered by This Interest */}
            <div className="p-4 sm:px-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 shrink-0 pb-safe">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[46px] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap"
              >
                Lukk
              </button>

              <button
                type="button"
                onClick={() => {
                  const target = selectedInterest;
                  onClose();
                  onFilterInDiscover(target);
                }}
                className="flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs sm:text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-white inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span>Filtrer «{selectedInterest}» i Utforsk</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
