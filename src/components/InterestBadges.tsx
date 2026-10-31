import React from 'react';
import { Sparkles, Users } from 'lucide-react';

interface InterestBadgesProps {
  interests: string[];
  viewerInterests: string[];
  isOwnProfile?: boolean;
  matchingCountsByInterest?: Record<string, number>;
  onSelectInterest: (interest: string) => void;
  compact?: boolean;
  showHeader?: boolean;
}

export function normalizeInterestKey(value: string): string {
  return value.trim().toLowerCase();
}

export const InterestBadges: React.FC<InterestBadgesProps> = ({
  interests,
  viewerInterests,
  isOwnProfile = false,
  matchingCountsByInterest,
  onSelectInterest,
  compact = false,
  showHeader = true,
}) => {
  if (!interests || interests.length === 0) return null;

  const viewerSet = new Set(viewerInterests.map(normalizeInterestKey));

  const sharedInterests = interests.filter((item) =>
    viewerSet.has(normalizeInterestKey(item))
  );
  const sharedCount = isOwnProfile
    ? interests.filter(
        (item) =>
          (matchingCountsByInterest?.[normalizeInterestKey(item)] || 0) > 0
      ).length
    : sharedInterests.length;

  return (
    <div className="space-y-2.5">
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Interesse-merker
            </h3>
            {!isOwnProfile && sharedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>
                  {sharedCount} felles{' '}
                  {sharedCount === 1 ? 'interesse' : 'interesser'}
                </span>
              </span>
            )}
          </div>

          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Trykk på et merke for å se andre med samme interesse
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {interests.map((interest) => {
          const key = normalizeInterestKey(interest);
          const otherCount = matchingCountsByInterest?.[key];
          const isLit = isOwnProfile
            ? (otherCount ?? 0) > 0
            : viewerSet.has(key);

          return (
            <button
              key={interest}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectInterest(interest);
              }}
              aria-label={
                isLit
                  ? isOwnProfile
                    ? `${interest} — deles med ${otherCount} andre brukere. Trykk for å utforske`
                    : `${interest} — felles interesse med deg. Trykk for å se andre brukere med samme interesse`
                  : `${interest} — trykk for å se andre brukere med samme interesse`
              }
              className={`${
                compact ? 'min-h-[36px] px-3 py-1' : 'min-h-[40px] px-3.5 py-1.5'
              } rounded-xl text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 border transition-all active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
                isLit
                  ? 'bg-gradient-to-r from-rose-50 via-rose-50/90 to-amber-50/80 dark:from-rose-950/75 dark:via-rose-950/60 dark:to-amber-950/50 border-rose-300 dark:border-rose-500/65 text-rose-800 dark:text-rose-200 ring-1 ring-rose-400/25 shadow-xs shadow-rose-500/15 hover:border-rose-400 dark:hover:border-rose-400'
                  : 'bg-zinc-50 dark:bg-zinc-800/75 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {isLit ? (
                <Sparkles
                  className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
                  aria-hidden="true"
                />
              ) : (
                <Users
                  className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0"
                  aria-hidden="true"
                />
              )}
              <span>{interest}</span>
              {typeof otherCount === 'number' && (
                <span
                  className={`text-[11px] tabular-nums ${
                    isLit
                      ? 'text-rose-600/90 dark:text-rose-300 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  · {otherCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
