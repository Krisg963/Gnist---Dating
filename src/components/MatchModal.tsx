import React, { useState } from 'react';
import { Heart, MessageCircle, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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

export const MatchModal: React.FC<MatchModalProps> = ({
  match,
  profile,
  currentUser,
  onClose,
  onSendIcebreaker,
  onOpenChat,
}) => {
  const [customText, setCustomText] = useState('');

  if (!match || !profile) return null;

  const userAvatar =
    (currentUser.photos !== null
      ? currentUser.photos[0]
      : DEFAULT_USER_PHOTOS[0]) || currentUser.selfieDataUrl;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSendIcebreaker(match.id, customText.trim());
    setCustomText('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/75 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-8 shadow-2xl pb-safe"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-celebration-heading"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">
              Ny match opprettet
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-800 transition"
              aria-label="Lukk match-vindu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dual Avatar Header */}
          <div className="mt-2 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md bg-zinc-100 flex items-center justify-center -mr-3 z-10">
              {userAvatar ? (
                <SafeImage
                  src={userAvatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-rose-50 text-rose-700 font-display font-bold text-2xl flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center z-20 shadow-md ring-4 ring-white">
              <Heart className="w-5 h-5" fill="currentColor" />
            </div>

            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-white shadow-md bg-zinc-100 -ml-3 z-10">
              <SafeImage
                src={profile.image}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="text-center mt-5">
            <h2
              id="match-celebration-heading"
              className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight"
            >
              Det er en match med {profile.name}!
            </h2>
            <p className="text-sm text-zinc-500 mt-1.5 inline-flex items-center justify-center gap-1.5">
              <span>Dere likte hverandre</span>
              {profile.verified && <VerifiedBadge size="sm" />}
            </p>
          </div>

          {/* 3 Instant Icebreakers */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-zinc-500 mb-2.5">
              Bryt isen med ett trykk — velg en samtalestarter:
            </p>
            <div className="space-y-2">
              {match.icebreakers.map((icebreaker, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSendIcebreaker(match.id, icebreaker)}
                  className="w-full min-h-[48px] text-left px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 hover:bg-rose-50/60 hover:border-rose-200 text-sm text-zinc-800 flex items-center justify-between gap-3 active:scale-[0.99] transition"
                >
                  <span className="leading-snug">{icebreaker}</span>
                  <Send className="w-4 h-4 text-rose-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Direct Custom Message Form */}
          <form onSubmit={handleCustomSubmit} className="mt-4 flex items-center gap-2">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={`Skriv din egen melding til ${profile.name}...`}
              className="flex-1 min-h-[48px] px-4 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900"
            />
            <button
              type="submit"
              disabled={!customText.trim()}
              className="min-h-[48px] px-4 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 transition whitespace-nowrap shrink-0"
            >
              Send
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-100 transition whitespace-nowrap"
            >
              Fortsett å sveipe
            </button>
            <button
              type="button"
              onClick={() => onOpenChat(match.id)}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Åpne chat</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
