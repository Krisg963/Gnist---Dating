import React, { useMemo, useState } from 'react';
import { Heart, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DEFAULT_USER_PHOTOS } from '../data/profiles';
import type { CurrentUser, DatingProfile, MatchRecord } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface MatchModalProps {
  match: MatchRecord | null;
  profile: DatingProfile | undefined;
  currentUser: CurrentUser;
  onClose: () => void;
  onSendIcebreaker: (matchId: string, text: string) => void;
  onOpenChat: (matchId: string) => void;
}

type ConfettiShape = 'ribbon' | 'square' | 'dot';

interface RadialPiece {
  id: string;
  colorClass: string;
  shape: ConfettiShape;
  midX: number;
  endX: number;
  peakY: number;
  endY: number;
  midRotate: number;
  endRotate: number;
  duration: number;
  delay: number;
}

interface CascadePiece {
  id: string;
  colorClass: string;
  shape: ConfettiShape;
  leftPercent: number;
  swayA: number;
  swayB: number;
  fallY: number;
  initRotate: number;
  spinRotate: number;
  duration: number;
  delay: number;
}

const CONFETTI_COLORS = [
  'bg-rose-500',
  'bg-amber-400',
  'bg-orange-400',
  'bg-emerald-400',
  'bg-sky-400',
  'bg-pink-400',
];

const CONFETTI_SHAPES: ConfettiShape[] = ['ribbon', 'square', 'dot'];

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 91.3458 + 17.231) * 43758.5453;
  return x - Math.floor(x);
}

function shapeClassName(shape: ConfettiShape): string {
  if (shape === 'ribbon') return 'w-3.5 h-1.5 rounded-xs';
  if (shape === 'square') return 'w-2.5 h-2.5 rounded-xs';
  return 'w-2 h-2 rounded-full';
}

function buildRadialPieces(seedOffset: number): RadialPiece[] {
  const count = 28;
  return Array.from({ length: count }, (_, idx) => {
    const baseSeed = seedOffset * 131 + idx * 17 + 1;
    const u1 = seededUnit(baseSeed);
    const u2 = seededUnit(baseSeed + 3);
    const u3 = seededUnit(baseSeed + 7);
    const u4 = seededUnit(baseSeed + 11);

    // Fan upward and outward around the central match heart (-165deg to -15deg)
    const angleDeg = -165 + (idx / (count - 1)) * 150 + (u1 - 0.5) * 14;
    const angleRad = (angleDeg * Math.PI) / 180;
    const velocity = 95 + u2 * 115;

    const midX = Math.round(Math.cos(angleRad) * velocity * 0.72);
    const endX = Math.round(Math.cos(angleRad) * velocity * 1.18 + (u3 - 0.5) * 28);
    const peakY = Math.round(Math.sin(angleRad) * velocity * 0.85 - 18);
    const endY = Math.round(135 + u4 * 120);

    const spinDir = idx % 2 === 0 ? 1 : -1;
    const midRotate = Math.round(spinDir * (140 + u1 * 140));
    const endRotate = Math.round(spinDir * (340 + u2 * 260));

    return {
      id: `rad-${seedOffset}-${idx}`,
      colorClass: CONFETTI_COLORS[idx % CONFETTI_COLORS.length],
      shape: CONFETTI_SHAPES[idx % CONFETTI_SHAPES.length],
      midX,
      endX,
      peakY,
      endY,
      midRotate,
      endRotate,
      duration: Number((1.55 + u3 * 0.65).toFixed(2)),
      delay: Number((u4 * 0.14).toFixed(3)),
    };
  });
}

function buildCascadePieces(seedOffset: number): CascadePiece[] {
  const count = 22;
  return Array.from({ length: count }, (_, idx) => {
    const baseSeed = seedOffset * 197 + idx * 23 + 5;
    const u1 = seededUnit(baseSeed);
    const u2 = seededUnit(baseSeed + 4);
    const u3 = seededUnit(baseSeed + 9);
    const u4 = seededUnit(baseSeed + 13);

    const leftPercent = Number((4 + (idx / (count - 1)) * 92).toFixed(1));
    const swaySign = idx % 2 === 0 ? 1 : -1;
    const swayA = Math.round(swaySign * (18 + u1 * 26));
    const swayB = Math.round(-swaySign * (14 + u2 * 24));
    const fallY = Math.round(520 + u3 * 260);
    const initRotate = Math.round((u1 - 0.5) * 90);
    const spinRotate = Math.round(swaySign * (280 + u4 * 240));

    return {
      id: `cas-${seedOffset}-${idx}`,
      colorClass: CONFETTI_COLORS[(idx + 2) % CONFETTI_COLORS.length],
      shape: CONFETTI_SHAPES[(idx + 1) % CONFETTI_SHAPES.length],
      leftPercent,
      swayA,
      swayB,
      fallY,
      initRotate,
      spinRotate,
      duration: Number((2.05 + u2 * 0.85).toFixed(2)),
      delay: Number((u3 * 0.42).toFixed(3)),
    };
  });
}

export const MatchModal: React.FC<MatchModalProps> = ({
  match,
  profile,
  currentUser,
  onClose,
  onSendIcebreaker,
  onOpenChat,
}) => {
  const [customText, setCustomText] = useState('');
  const [confettiNonce, setConfettiNonce] = useState(0);
  const prefersReducedMotion = Boolean(useReducedMotion());

  const seedNumber = useMemo(() => {
    if (!match) return 1;
    let hash = 0;
    for (let i = 0; i < match.id.length; i += 1) {
      hash = (hash * 31 + match.id.charCodeAt(i)) % 10000;
    }
    return hash + confettiNonce + 1;
  }, [match, confettiNonce]);

  const radialPieces = useMemo(
    () => buildRadialPieces(seedNumber),
    [seedNumber]
  );
  const cascadePieces = useMemo(
    () => buildCascadePieces(seedNumber),
    [seedNumber]
  );

  const userAvatar =
    (currentUser.photos !== null
      ? currentUser.photos[0]
      : DEFAULT_USER_PHOTOS[0]) || currentUser.selfieDataUrl;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!match || !customText.trim()) return;
    onSendIcebreaker(match.id, customText.trim());
    setCustomText('');
  };

  return (
    <AnimatePresence>
      {match && profile && (
        <motion.div
          key={match.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-hidden"
        >
          {/* Full-screen Framer Motion Confetti Cascade (Compositor-only transform & opacity) */}
          {!prefersReducedMotion && (
            <div
              key={`cascade-${seedNumber}`}
              aria-hidden="true"
              className="pointer-events-none fixed inset-0 z-60 overflow-hidden"
            >
              {cascadePieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  initial={{
                    x: 0,
                    y: -28,
                    rotate: piece.initRotate,
                    scale: 0.85,
                    opacity: 0,
                  }}
                  animate={{
                    x: [0, piece.swayA, piece.swayB],
                    y: [-28, piece.fallY * 0.48, piece.fallY],
                    rotate: [
                      piece.initRotate,
                      piece.initRotate + piece.spinRotate * 0.5,
                      piece.initRotate + piece.spinRotate,
                    ],
                    scale: [0.85, 1, 0.75],
                    opacity: [0, 1, 0.95, 0],
                  }}
                  transition={{
                    duration: piece.duration,
                    delay: piece.delay,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  style={{ left: `${piece.leftPercent}%` }}
                  className={`absolute top-0 block ${shapeClassName(piece.shape)} ${piece.colorClass} shadow-xs`}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, y: 24 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.94, y: 20 }
            }
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto overflow-x-clip rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl pb-safe transition-colors"
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-celebration-heading"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Ny match opprettet
                </span>
                {match.matchedAt && (
                  <>
                    <span
                      aria-hidden="true"
                      className="text-zinc-300 dark:text-zinc-600"
                    >
                      ·
                    </span>
                    <time
                      dateTime={match.matchedAtIso}
                      className="text-zinc-500 dark:text-zinc-400 tabular-nums"
                    >
                      {match.matchedAt}
                    </time>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1 -mr-2">
                {!prefersReducedMotion && (
                  <button
                    type="button"
                    onClick={() => setConfettiNonce((n) => n + 1)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    aria-label="Spill av konfettifeiring på nytt"
                    title="Feir matchen på nytt"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  aria-label="Lukk match-vindu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dual Avatar Header + Radial Framer Motion Confetti Burst */}
            <div className="relative mt-3 flex items-center justify-center">
              {!prefersReducedMotion && (
                <div
                  key={`radial-${seedNumber}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                >
                  {radialPieces.map((piece) => (
                    <motion.span
                      key={piece.id}
                      initial={{
                        x: 0,
                        y: 0,
                        scale: 0.25,
                        rotate: 0,
                        opacity: 0,
                      }}
                      animate={{
                        x: [0, piece.midX, piece.endX],
                        y: [0, piece.peakY, piece.endY],
                        scale: [0.25, 1.15, 0.9, 0.65],
                        rotate: [0, piece.midRotate, piece.endRotate],
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{
                        duration: piece.duration,
                        delay: piece.delay,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className={`absolute left-0 top-0 block ${shapeClassName(piece.shape)} ${piece.colorClass}`}
                    />
                  ))}
                </div>
              )}

              <motion.div
                initial={
                  prefersReducedMotion
                    ? false
                    : { x: -22, scale: 0.86, rotate: -6, opacity: 0 }
                }
                animate={{ x: 0, scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 22,
                  delay: 0.04,
                }}
                className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center -mr-3 z-10"
              >
                {userAvatar ? (
                  <SafeImage
                    src={userAvatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-display font-bold text-2xl flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
              </motion.div>

              <motion.div
                key={`heart-${seedNumber}`}
                initial={
                  prefersReducedMotion ? false : { scale: 0.35, rotate: -18 }
                }
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 440,
                  damping: 16,
                  delay: 0.08,
                }}
                className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center z-20 shadow-md ring-4 ring-white dark:ring-zinc-900"
              >
                <Heart className="w-5 h-5" fill="currentColor" />
              </motion.div>

              <motion.div
                initial={
                  prefersReducedMotion
                    ? false
                    : { x: 22, scale: 0.86, rotate: 6, opacity: 0 }
                }
                animate={{ x: 0, scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 22,
                  delay: 0.04,
                }}
                className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white dark:ring-zinc-900 shadow-md bg-zinc-100 dark:bg-zinc-800 -ml-3 z-10"
              >
                <SafeImage
                  src={profile.image}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            <div className="text-center mt-5">
              <h2
                id="match-celebration-heading"
                className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight"
              >
                Det er en match med {profile.name}!
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 inline-flex items-center justify-center gap-1.5">
                <span>Dere likte hverandre</span>
                {profile.verified && <VerifiedBadge size="sm" />}
              </p>
            </div>

            {/* 3 Instant Icebreakers */}
            <div className="mt-6">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2.5">
                Bryt isen med ett trykk — velg en samtalestarter:
              </p>
              <div className="space-y-2">
                {match.icebreakers.map((icebreaker, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onSendIcebreaker(match.id, icebreaker)}
                    className="w-full min-h-[48px] text-left px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60 hover:bg-rose-50/60 dark:hover:bg-rose-950/35 hover:border-rose-200 dark:hover:border-rose-800 text-sm text-zinc-800 dark:text-zinc-100 flex items-center justify-between gap-3 active:scale-[0.99] transition"
                  >
                    <span className="leading-snug">{icebreaker}</span>
                    <Send className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Custom Message Form */}
            <form
              onSubmit={handleCustomSubmit}
              className="mt-4 flex items-center gap-2"
            >
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder={`Skriv din egen melding til ${profile.name}...`}
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
              />
              <button
                type="submit"
                disabled={!customText.trim()}
                className="min-h-[48px] px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 transition whitespace-nowrap shrink-0"
              >
                Send
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition whitespace-nowrap"
              >
                Fortsett å sveipe
              </button>
              <button
                type="button"
                onClick={() => onOpenChat(match.id)}
                className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Åpne chat</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

