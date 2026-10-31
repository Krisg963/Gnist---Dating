import React, { useEffect, useState } from 'react';
import {
  Heart,
  Info,
  MapPin,
  RotateCcw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { DatingProfile } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface SwipeViewProps {
  deckProfiles: DatingProfile[];
  canRewind: boolean;
  likesYouCount: number;
  onSwipe: (profileId: string, direction: 'left' | 'right') => void;
  onRewind: () => void;
  onSelectProfile: (profile: DatingProfile) => void;
  onGoToLikes: () => void;
  onGoToDiscover: () => void;
}

const cardVariants: Variants = {
  enter: {
    opacity: 0,
    scale: 0.96,
    y: 10,
  },
  center: {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 360,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: (direction: 'left' | 'right' | null) => ({
    x: direction === 'left' ? -440 : direction === 'right' ? 440 : 0,
    rotate: direction === 'left' ? -15 : direction === 'right' ? 15 : 0,
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const SwipeCard: React.FC<{
  profile: DatingProfile;
  isTop: boolean;
  exitDirection: 'left' | 'right' | null;
  reducedMotion: boolean;
  onCommitSwipe: (direction: 'left' | 'right') => void;
  onOpenDetails: () => void;
}> = ({
  profile,
  isTop,
  exitDirection,
  reducedMotion,
  onCommitSwipe,
  onOpenDetails,
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-220, 0, 220],
    reducedMotion ? [0, 0, 0] : [-11, 0, 11]
  );
  const likeOpacity = useTransform(x, [25, 105], [0, 1]);
  const nopeOpacity = useTransform(x, [-25, -105], [0, 1]);

  if (!isTop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 0.86, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 rounded-3xl overflow-hidden bg-zinc-200 pointer-events-none border border-zinc-200"
      >
        <SafeImage
          src={profile.image}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
      </motion.div>
    );
  }

  return (
    <motion.div
      custom={exitDirection}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      whileTap={{ scale: reducedMotion ? 1 : 0.99 }}
      onDragEnd={(_e, info) => {
        if (info.offset.x > 95 || info.velocity.x > 500) {
          onCommitSwipe('right');
        } else if (info.offset.x < -95 || info.velocity.x < -500) {
          onCommitSwipe('left');
        }
      }}
      className="absolute inset-0 rounded-3xl overflow-hidden bg-zinc-100 shadow-lg border border-zinc-200 cursor-grab active:cursor-grabbing touch-pan-y select-none"
    >
      <SafeImage
        src={profile.image}
        alt={`${profile.name}, ${profile.age} år`}
        fallbackLabel={`${profile.name}, ${profile.age}`}
        className="w-full h-full object-cover pointer-events-none"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

      {/* Drag Stamps (Compositor-Only Opacity) */}
      <motion.div
        style={{ opacity: likeOpacity }}
        className="absolute top-6 left-6 border-2 border-emerald-400 text-emerald-300 bg-black/35 backdrop-blur-xs px-4 py-1.5 rounded-xl font-display font-bold text-lg tracking-wide -rotate-6 pointer-events-none"
      >
        Liker
      </motion.div>

      <motion.div
        style={{ opacity: nopeOpacity }}
        className="absolute top-6 right-6 border-2 border-rose-400 text-rose-300 bg-black/35 backdrop-blur-xs px-4 py-1.5 rounded-xl font-display font-bold text-lg tracking-wide rotate-6 pointer-events-none"
      >
        Hopp over
      </motion.div>

      {/* Card Overlay Info */}
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {profile.name}, <span className="tabular-nums">{profile.age}</span>
              </h2>
              {profile.verified && <VerifiedBadge size="md" />}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-white/90">
              <span>{profile.occupation}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.city} ({profile.distanceKm} km)
              </span>
            </div>

            <p className="mt-2.5 text-sm text-white/85 line-clamp-2 leading-relaxed">
              {profile.bio}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition shrink-0"
            aria-label={`Vis hele profilen til ${profile.name}`}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const SwipeView: React.FC<SwipeViewProps> = ({
  deckProfiles,
  canRewind,
  likesYouCount,
  onSwipe,
  onRewind,
  onSelectProfile,
  onGoToLikes,
  onGoToDiscover,
}) => {
  const [swipingLock, setSwipingLock] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(
    null
  );
  const prefersReducedMotion = Boolean(useReducedMotion());

  const activeProfile = deckProfiles[0] || null;
  const nextProfile = deckProfiles[1] || null;

  const triggerSwipe = (direction: 'left' | 'right') => {
    if (!activeProfile || swipingLock) return;
    setExitDirection(direction);
    setSwipingLock(true);
    onSwipe(activeProfile.id, direction);
    window.setTimeout(() => setSwipingLock(false), 190);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        triggerSwipe('right');
      } else if (e.key === 'ArrowLeft') {
        triggerSwipe('left');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!activeProfile) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-white border border-zinc-200 p-8 sm:p-12 shadow-xs"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-5">
            <Heart className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 text-balance">
            Du har sett alle nye forslag i området ditt
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-2 max-w-md mx-auto">
            Ta en titt på hvem som allerede har likt deg, eller gå tilbake om du
            sveipet litt for raskt.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            {likesYouCount > 0 && (
              <button
                type="button"
                onClick={onGoToLikes}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition whitespace-nowrap"
              >
                Se hvem som likte deg ({likesYouCount})
              </button>
            )}
            {canRewind && (
              <button
                type="button"
                onClick={onRewind}
                className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Angre siste sveip</span>
              </button>
            )}
            <button
              type="button"
              onClick={onGoToDiscover}
              className="w-full sm:w-auto min-h-[48px] px-5 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition whitespace-nowrap"
            >
              Utforsk alle profiler
            </button>
          </div>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
        {/* Left / Mobile Primary Column: Interactive Framer Motion Touch Stack */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="relative w-full max-w-[420px] aspect-[3/4] max-h-[62vh] sm:max-h-[540px]">
            {nextProfile && (
              <SwipeCard
                key={`bg-${nextProfile.id}`}
                profile={nextProfile}
                isTop={false}
                exitDirection={null}
                reducedMotion={prefersReducedMotion}
                onCommitSwipe={() => {}}
                onOpenDetails={() => {}}
              />
            )}
            <AnimatePresence mode="popLayout" custom={exitDirection}>
              <SwipeCard
                key={activeProfile.id}
                profile={activeProfile}
                isTop={true}
                exitDirection={exitDirection}
                reducedMotion={prefersReducedMotion}
                onCommitSwipe={triggerSwipe}
                onOpenDetails={() => onSelectProfile(activeProfile)}
              />
            </AnimatePresence>
          </div>

          {/* Thumb-Zone Action Controls (All >= 48px touch hitboxes) */}
          <div className="mt-5 flex items-center justify-center gap-4 sm:gap-5 w-full max-w-[420px]">
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => {
                setExitDirection(null);
                onRewind();
              }}
              disabled={!canRewind}
              className="min-h-[48px] min-w-[48px] rounded-full border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center shadow-xs hover:bg-zinc-50 disabled:opacity-35 transition"
              aria-label="Angre forrige sveip"
              title="Angre"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => triggerSwipe('left')}
              className="min-h-[60px] min-w-[60px] rounded-full border border-zinc-200 bg-white text-zinc-800 flex items-center justify-center shadow-sm hover:bg-zinc-50 transition"
              aria-label={`Hopp over ${activeProfile.name}`}
              title="Avvis (sveip venstre)"
            >
              <X className="w-7 h-7" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => triggerSwipe('right')}
              className="min-h-[60px] min-w-[60px] rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20 hover:bg-rose-700 transition"
              aria-label={`Lik ${activeProfile.name}`}
              title="Liker (sveip høyre)"
            >
              <Heart className="w-7 h-7" fill="currentColor" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => onSelectProfile(activeProfile)}
              className="min-h-[48px] min-w-[48px] rounded-full border border-zinc-200 bg-white text-zinc-600 flex items-center justify-center shadow-xs hover:bg-zinc-50 transition"
              aria-label="Vis fullstendig profil"
              title="Full profil"
            >
              <Info className="w-5 h-5" />
            </motion.button>
          </div>

          <p className="mt-3 text-xs text-zinc-400 text-center">
            Sveip kortet mot høyre for å like, eller venstre for å gå videre
          </p>
        </div>

        {/* Right Desktop Column: Animated Full Profile Bio & Prompts */}
        <aside className="hidden lg:flex lg:col-span-6 flex-col justify-between rounded-3xl bg-white border border-zinc-200 p-8 shadow-xs overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeProfile.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 flex-1"
            >
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-zinc-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-zinc-900">
                      {activeProfile.name},{' '}
                      <span className="tabular-nums">{activeProfile.age}</span>
                    </h2>
                    {activeProfile.verified && (
                      <VerifiedBadge size="md" showLabel />
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 mt-1">
                    {activeProfile.occupation} · {activeProfile.city} ·{' '}
                    <span className="tabular-nums">
                      {activeProfile.distanceKm} km unna
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {activeProfile.education} · {activeProfile.relationshipGoal}
                  </p>
                </div>

                <span className="text-xs font-medium text-zinc-500 whitespace-nowrap">
                  {activeProfile.isOnline
                    ? 'Aktiv nå'
                    : activeProfile.lastActiveLabel}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                  Biografi
                </h3>
                <p className="text-base text-zinc-700 leading-relaxed">
                  {activeProfile.bio}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-400 mb-2">
                  Interesser
                </h3>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-700">
                  {activeProfile.interests.map((item, idx) => (
                    <React.Fragment key={item}>
                      {idx > 0 && (
                        <span aria-hidden="true" className="text-zinc-300">
                          ·
                        </span>
                      )}
                      <span>{item}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-100">
                {activeProfile.prompts.map((p) => (
                  <div key={p.question}>
                    <p className="text-xs text-zinc-500">{p.question}</p>
                    <p className="text-base font-medium text-zinc-900 mt-1">
                      «{p.answer}»
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="pt-6 mt-6 border-t border-zinc-100 flex items-center gap-2.5 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              {activeProfile.verified
                ? 'Profilen er selfie-verifisert med pose-gjenkjenning.'
                : 'Ikke verifisert med selfie ennå.'}
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
};
