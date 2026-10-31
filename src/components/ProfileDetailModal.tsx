import React, { useEffect, useState } from 'react';
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DatingProfile, MatchRecord } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface ProfileDetailModalProps {
  profile: DatingProfile | null;
  match: MatchRecord | undefined;
  alreadyLiked: boolean;
  alreadyPassed?: boolean;
  onClose: () => void;
  onLike: (profileId: string) => void;
  onPass: (profileId: string) => void;
  onOpenChat: (matchId: string) => void;
  onRequestBlockUser: (profile: DatingProfile) => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  profile,
  match,
  alreadyLiked,
  alreadyPassed = false,
  onClose,
  onLike,
  onPass,
  onOpenChat,
  onRequestBlockUser,
}) => {
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    setPhotoIdx(0);
  }, [profile?.id]);

  const gallery =
    profile?.images && profile.images.length > 0
      ? profile.images
      : profile
        ? [profile.image]
        : [];

  const currentPhoto = gallery[photoIdx] || profile?.image || '';

  return (
    <AnimatePresence>
      {profile && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 36 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-white shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300" />
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1">
              <div className="relative aspect-[4/4] sm:aspect-[16/11] w-full bg-zinc-100">
                <SafeImage
                  src={currentPhoto}
                  alt={`${profile.name}, ${profile.age} år`}
                  fallbackLabel={profile.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Multi-Photo Progress Bars & Navigation */}
                {gallery.length > 1 && (
                  <>
                    <div className="absolute top-3 inset-x-4 pr-12 flex items-center gap-1.5 z-10">
                      {gallery.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPhotoIdx(idx)}
                          aria-label={`Vis bilde ${idx + 1} av ${gallery.length}`}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            idx === photoIdx ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIdx(
                          (prev) => (prev - 1 + gallery.length) % gallery.length
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/55 transition"
                      aria-label="Forrige bilde"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIdx((prev) => (prev + 1) % gallery.length)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-full bg-black/35 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/55 transition"
                      aria-label="Neste bilde"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-3 right-3 min-h-[44px] min-w-[44px] rounded-full bg-black/45 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/65 transition z-20"
                  aria-label="Lukk profil"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                  <div className="flex items-center gap-2">
                    <h2
                      id="profile-modal-title"
                      className="text-2xl sm:text-3xl font-bold tracking-tight"
                    >
                      {profile.name},{' '}
                      <span className="tabular-nums">{profile.age}</span>
                    </h2>
                    {profile.verified && <VerifiedBadge size="md" />}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/90">
                    {profile.occupation && (
                      <>
                        <span>{profile.occupation}</span>
                        <span aria-hidden="true">·</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {profile.city}
                      {!profile.isCurrentUserPreview &&
                        ` (${profile.distanceKm} km)`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        profile.isOnline
                          ? 'text-emerald-300 font-medium'
                          : 'text-white/80'
                      }
                    >
                      {profile.isOnline ? 'Aktiv nå' : profile.lastActiveLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 space-y-6">
                {/* Accidental Left-Swipe Notice when reviewing from Sveipe-historikk */}
                {alreadyPassed && !match && !profile.isCurrentUserPreview && (
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-zinc-700 pb-4 border-b border-zinc-100">
                    <RotateCcw className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Du sveipet tidligere venstre på {profile.name}. Var det et feilsveip? Du kan like profilen nederst.
                    </span>
                  </div>
                )}

                {/* 15-Second Video Introduction Player */}
                {profile.videoIntroUrl && (
                  <div className="pb-5 border-b border-zinc-100 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-rose-600 shrink-0" />
                        <h3 className="text-sm font-bold text-zinc-900">
                          Video-introduksjon
                        </h3>
                      </div>
                      <span className="text-xs text-zinc-500 tabular-nums">
                        {profile.videoIntroDurationSec || 15} sek · Med lyd
                      </span>
                    </div>

                    {profile.videoIntroPrompt && (
                      <p className="text-xs text-zinc-500">
                        Tema: «{profile.videoIntroPrompt}»
                      </p>
                    )}

                    <div className="rounded-2xl overflow-hidden bg-zinc-950 aspect-[3/4] max-h-[380px] mx-auto">
                      <video
                        src={profile.videoIntroUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Unboxed Key Criteria Metadata: Education & Relationship Goal */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-zinc-600 pb-4 border-b border-zinc-100">
                  <span>Utdanning: {profile.education}</span>
                  <span aria-hidden="true" className="text-zinc-300">
                    ·
                  </span>
                  <span>Ser etter: {profile.relationshipGoal}</span>
                </div>

                {/* Verification Status Row */}
                <div className="flex items-start gap-3 pb-5 border-b border-zinc-100">
                  <ShieldCheck
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      profile.verified ? 'text-sky-600' : 'text-zinc-400'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {profile.verified
                        ? 'Selfie-verifisert profil'
                        : 'Ikke selfie-verifisert ennå'}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {profile.verified
                        ? `${profile.name} har bekreftet bildene sine med sanntids pose-selfie i Gnist.`
                        : `${profile.name} har ikke fullført selfie-verifisering ennå.`}
                    </p>
                  </div>
                </div>

                {/* Biography */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-2">
                    Om {profile.name}
                  </h3>
                  <p className="text-base text-zinc-700 leading-relaxed">
                    {profile.bio || 'Ingen biografi lagt til ennå.'}
                  </p>
                </div>

                {/* Unboxed Interests */}
                {profile.interests.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-1.5">
                      Interesser
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-zinc-600">
                      {profile.interests.map((interest, idx) => (
                        <React.Fragment key={interest}>
                          {idx > 0 && (
                            <span aria-hidden="true" className="text-zinc-300">
                              ·
                            </span>
                          )}
                          <span>{interest}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Prompts */}
                {profile.prompts.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-zinc-100">
                    {profile.prompts.map((prompt) => (
                      <div key={prompt.question} className="py-1">
                        <p className="text-xs font-medium text-zinc-500">
                          {prompt.question}
                        </p>
                        <p className="text-base font-medium text-zinc-900 mt-1 leading-snug">
                          «{prompt.answer}»
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Safety & Block User Section */}
                {!profile.isCurrentUserPreview && (
                  <div className="pt-5 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-700">
                        Trygghet og personvern
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Skjul uønsket kontakt og fjern {profile.name} fra dine matche-lister.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestBlockUser(profile)}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
                    >
                      <Ban className="w-3.5 h-3.5 shrink-0" />
                      <span>Blokker bruker</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pinned Bottom Action Bar */}
            <div className="p-4 sm:px-7 sm:py-4 border-t border-zinc-100 bg-white flex items-center gap-3 shrink-0 pb-safe">
              {profile.isCurrentUserPreview ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold flex items-center justify-center hover:bg-zinc-800 transition whitespace-nowrap"
                >
                  Lukk forhåndsvisning av offentlig profil
                </button>
              ) : match ? (
                <>
                  <button
                    type="button"
                    onClick={() => onRequestBlockUser(profile)}
                    className="min-h-[48px] px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition whitespace-nowrap shrink-0"
                    aria-label={`Blokker ${profile.name}`}
                  >
                    <Ban className="w-4 h-4" />
                    <span>Blokker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat(match.id);
                    }}
                    className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-700 active:scale-[0.98] transition whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Send melding til {profile.name}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onRequestBlockUser(profile)}
                    className="min-h-[48px] px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition whitespace-nowrap shrink-0"
                    aria-label={`Blokker ${profile.name}`}
                    title={`Blokker ${profile.name}`}
                  >
                    <Ban className="w-4 h-4" />
                    <span className="hidden sm:inline">Blokker</span>
                  </button>
                  {!alreadyPassed && (
                    <button
                      type="button"
                      onClick={() => {
                        onPass(profile.id);
                        onClose();
                      }}
                      className="flex-1 min-h-[48px] px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-zinc-50 active:scale-[0.98] transition whitespace-nowrap"
                    >
                      <X className="w-4 h-4" />
                      <span>Hopp over</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={alreadyLiked}
                    onClick={() => {
                      onLike(profile.id);
                      onClose();
                    }}
                    className="flex-[1.4] min-h-[48px] px-5 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-60 active:scale-[0.98] transition whitespace-nowrap"
                  >
                    <Heart className="w-4 h-4" fill="currentColor" />
                    <span>
                      {alreadyLiked
                        ? 'Likt'
                        : alreadyPassed
                          ? `Lik ${profile.name} likevel`
                          : `Lik ${profile.name}`}
                    </span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
