import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Check,
  Flame,
  Gamepad2,
  Gift,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type {
  AchievementBadge,
  AchievementIconKey,
  GamificationState,
  ProfileAchievementSummary,
} from '../types';

export function renderAchievementIcon(
  iconKey: AchievementIconKey,
  className = 'w-4 h-4'
) {
  switch (iconKey) {
    case 'profile':
      return <UserCheck className={className} />;
    case 'verified':
      return <ShieldCheck className={className} />;
    case 'icebreaker':
      return <Sparkles className={className} />;
    case 'match':
      return <Heart className={className} />;
    case 'streak':
      return <Flame className={className} />;
    case 'calendar':
      return <Calendar className={className} />;
    case 'game':
      return <Gamepad2 className={className} />;
    case 'swipe':
      return <Target className={className} />;
    default:
      return <Award className={className} />;
  }
}

interface ProfileAchievementsDisplayProps {
  achievements: ProfileAchievementSummary[];
  level?: number;
  levelTitle?: string;
  compact?: boolean;
  heading?: string;
}

export const ProfileAchievementsDisplay: React.FC<
  ProfileAchievementsDisplayProps
> = ({
  achievements,
  level,
  levelTitle,
  compact = false,
  heading = 'Prestasjoner og merker',
}) => {
  if (!achievements || achievements.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {heading}
          </h3>
        </div>
        {typeof level === 'number' && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
            Nivå {level}
            {levelTitle ? ` · ${levelTitle}` : ''}
          </span>
        )}
      </div>

      <div
        className={
          compact
            ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
            : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
        }
      >
        {achievements.map((badge) => (
          <div
            key={badge.id}
            className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-800/50 p-3 flex items-start gap-2.5"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100/80 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              {renderAchievementIcon(badge.icon, 'w-4 h-4')}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {badge.title}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                {badge.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface GamificationHubCardProps {
  gamification: GamificationState;
  onClaimDailyReward: () => Promise<{
    ok: boolean;
    xpEarned?: number;
    bonusSparks?: number;
    streak?: number;
  }>;
}

export const GamificationHubCard: React.FC<GamificationHubCardProps> = ({
  gamification,
  onClaimDailyReward,
}) => {
  const [claiming, setClaiming] = useState(false);
  const [claimBanner, setClaimBanner] = useState<string | null>(null);

  const spanXp = Math.max(
    1,
    gamification.nextLevelXp - gamification.currentLevelBaseXp
  );
  const earnedInLevel = Math.max(
    0,
    gamification.xp - gamification.currentLevelBaseXp
  );
  const levelProgressPct = Math.min(
    100,
    Math.round((earnedInLevel / spanXp) * 100)
  );

  const unlockedCount = gamification.achievements.filter(
    (a) => a.unlocked
  ).length;

  const handleClaim = async () => {
    if (!gamification.canClaimToday || claiming) return;
    setClaiming(true);
    const res = await onClaimDailyReward();
    setClaiming(false);
    if (res.ok) {
      setClaimBanner(
        `Belønning hentet! +${res.xpEarned || 50} XP${
          res.bonusSparks ? ` og +${res.bonusSparks} Super-Gnist` : ''
        } lagt til profilen din.`
      );
    }
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header & Level Progress */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Belønninger og prestasjoner
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                Nivå {gamification.level} · {gamification.levelTitle} ·{' '}
                {gamification.loginStreak}{' '}
                {gamification.loginStreak === 1 ? 'dag' : 'dager'} på rad ·{' '}
                {gamification.superSparks} Super-Gnister
              </p>
            </div>
          </div>

          <div className="text-right tabular-nums">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {gamification.xp} XP
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Neste nivå ved {gamification.nextLevelXp} XP
            </p>
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelProgressPct}%` }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-rose-600 dark:bg-rose-500"
          />
        </div>
      </div>

      {/* 7-Day Daily Login Rewards Track */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 inline-flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Daglige innloggingsbelønninger</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Logg inn hver dag for å samle XP og Super-Gnister i 7-dagerssyklusen
            </p>
          </div>

          <button
            type="button"
            disabled={!gamification.canClaimToday || claiming}
            onClick={() => void handleClaim()}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 ${
              gamification.canClaimToday
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {claiming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Henter...</span>
              </>
            ) : gamification.canClaimToday ? (
              <>
                <Gift className="w-4 h-4" />
                <span>Hent dagens belønning</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Hentet i dag</span>
              </>
            )}
          </button>
        </div>

        {claimBanner && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 tabular-nums">
            {claimBanner}
          </p>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {gamification.dailyRewards.map((step) => (
            <div
              key={step.day}
              className={`rounded-xl border p-2 text-center transition ${
                step.claimed
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/35'
                  : step.isCurrent
                    ? 'border-rose-400 dark:border-rose-500 bg-rose-50/70 dark:bg-rose-950/35'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40'
              }`}
            >
              <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                Dag {step.day}
              </p>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tabular-nums mt-1">
                +{step.xp}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {step.claimed ? 'Hentet' : step.bonusSparks > 0 ? `+${step.bonusSparks} gnist` : 'XP'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges Grid */}
      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Dine prestasjonsmerker (vises på profilen din)
          </h3>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
            {unlockedCount} av {gamification.achievements.length} låst opp
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gamification.achievements.map((badge: AchievementBadge) => {
            const pct = Math.min(
              100,
              Math.round((badge.progress / Math.max(1, badge.target)) * 100)
            );
            return (
              <div
                key={badge.id}
                className={`rounded-2xl border p-3.5 space-y-2 transition ${
                  badge.unlocked
                    ? 'border-amber-200/90 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/35'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        badge.unlocked
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          : 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {renderAchievementIcon(badge.icon, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {badge.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                    +{badge.xpReward} XP
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    <span>
                      {badge.unlocked
                        ? `Oppnådd${badge.unlockedAt ? ` · ${badge.unlockedAt}` : ''}`
                        : 'Fremdrift'}
                    </span>
                    <span>
                      {Math.min(badge.progress, badge.target)}/{badge.target}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        badge.unlocked
                          ? 'bg-amber-500 dark:bg-amber-400'
                          : 'bg-zinc-500 dark:bg-zinc-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface DailyRewardBannerProps {
  gamification: GamificationState;
  onClaimDailyReward: () => Promise<{
    ok: boolean;
    xpEarned?: number;
    bonusSparks?: number;
    streak?: number;
  }>;
  onOpenProfileAchievements: () => void;
}

export const DailyRewardBanner: React.FC<DailyRewardBannerProps> = ({
  gamification,
  onClaimDailyReward,
  onOpenProfileAchievements,
}) => {
  const [claiming, setClaiming] = useState(false);

  const unlockedCount = gamification.achievements.filter(
    (a) => a.unlocked
  ).length;
  const currentStep = gamification.dailyRewards.find((s) => s.isCurrent);

  const handleQuickClaim = async () => {
    if (!gamification.canClaimToday || claiming) return;
    setClaiming(true);
    await onClaimDailyReward();
    setClaiming(false);
  };

  return (
    <div className="mb-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
          {gamification.canClaimToday ? (
            <Gift className="w-5 h-5" />
          ) : (
            <Award className="w-5 h-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
            {gamification.canClaimToday
              ? `Daglig innloggingsbelønning klar (Dag ${gamification.currentCycleDay}: +${currentStep?.xp || 50} XP)`
              : `Nivå ${gamification.level} · ${gamification.levelTitle}`}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate tabular-nums mt-0.5">
            {gamification.loginStreak}{' '}
            {gamification.loginStreak === 1 ? 'dag' : 'dager'} på rad ·{' '}
            {gamification.xp} XP · {unlockedCount}/
            {gamification.achievements.length} prestasjoner låst opp
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {gamification.canClaimToday && (
          <button
            type="button"
            disabled={claiming}
            onClick={() => void handleQuickClaim()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap"
          >
            {claiming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Gift className="w-3.5 h-3.5" />
            )}
            <span>Hent belønning</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenProfileAchievements}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition whitespace-nowrap"
        >
          Se merker
        </button>
      </div>
    </div>
  );
};
