import React from 'react';
import { Heart, MapPin, MessageSquareHeart, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DatingProfile, LikeReceived } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface LikesYouViewProps {
  likesReceived: LikeReceived[];
  profileMap: Record<string, DatingProfile>;
  onMatchBack: (profileId: string) => void;
  onDismissLike: (profileId: string) => void;
  onSelectProfile: (profile: DatingProfile) => void;
  onGoToMessages: () => void;
  onGoToSwipe: () => void;
}

export const LikesYouView: React.FC<LikesYouViewProps> = ({
  likesReceived,
  profileMap,
  onMatchBack,
  onDismissLike,
  onSelectProfile,
  onGoToMessages,
  onGoToSwipe,
}) => {
  const populated = likesReceived
    .map((item) => ({
      like: item,
      profile: profileMap[item.profileId],
    }))
    .filter((entry): entry is { like: LikeReceived; profile: DatingProfile } =>
      Boolean(entry.profile)
    );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Hvem likte deg
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Personer som allerede har sveipet høyre på profilen din — match tilbake direkte
          </p>
        </div>

        <span className="text-sm font-medium text-zinc-600 tabular-nums">
          {populated.length}{' '}
          {populated.length === 1 ? 'person venter på svar' : 'personer venter på svar'}
        </span>
      </div>

      {populated.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-10 sm:p-14 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <MessageSquareHeart className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 text-balance">
            Du har svart på alle som har likt deg hittil
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Start en samtale med matchene dine eller utforsk flere profiler i nærheten.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToMessages}
              className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition whitespace-nowrap"
            >
              Gå til meldinger
            </button>
            <button
              type="button"
              onClick={onGoToSwipe}
              className="w-full sm:w-auto min-h-[48px] px-5 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium hover:bg-zinc-50 transition whitespace-nowrap"
            >
              Sveip videre
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {populated.map(({ like, profile }) => (
              <motion.article
                key={profile.id}
                layout="position"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl bg-white border border-zinc-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
              <div>
                <button
                  type="button"
                  onClick={() => onSelectProfile(profile)}
                  className="relative w-full aspect-[4/4] bg-zinc-100 block text-left group overflow-hidden"
                  aria-label={`Åpne profilen til ${profile.name}`}
                >
                  <SafeImage
                    src={profile.image}
                    alt={`${profile.name}, ${profile.age} år`}
                    fallbackLabel={profile.name}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xl font-bold tracking-tight">
                        {profile.name},{' '}
                        <span className="tabular-nums">{profile.age}</span>
                      </h2>
                      {profile.verified && <VerifiedBadge size="sm" />}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/85">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {profile.city} ({profile.distanceKm} km)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{like.likedAt}</span>
                    </div>
                  </div>
                </button>

                {/* Personal Note / Compliment */}
                <div className="p-4 sm:p-5">
                  <p className="text-xs font-medium text-zinc-400">
                    Kommentar til profilen din
                  </p>
                  <p className="text-sm text-zinc-800 mt-1 leading-relaxed">
                    «{like.note}»
                  </p>
                </div>
              </div>

              {/* Direct Match Back or Pass Controls */}
              <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onDismissLike(profile.id)}
                  className="min-h-[48px] px-4 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-medium inline-flex items-center justify-center gap-1.5 hover:bg-zinc-50 active:scale-[0.98] transition whitespace-nowrap"
                  aria-label={`Fjern ${profile.name}`}
                >
                  <X className="w-4 h-4" />
                  <span>Fjern</span>
                </button>

                <button
                  type="button"
                  onClick={() => onMatchBack(profile.id)}
                  className="flex-1 min-h-[48px] px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-rose-700 active:scale-[0.98] transition whitespace-nowrap"
                >
                  <Heart className="w-4 h-4" fill="currentColor" />
                  <span>Match tilbake</span>
                </button>
              </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
