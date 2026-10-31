import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  ChatMessage,
  CurrentUser,
  DatingProfile,
  MatchRecord,
} from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface MessagesViewProps {
  matches: MatchRecord[];
  messagesByMatch: Record<string, ChatMessage[]>;
  profileMap: Record<string, DatingProfile>;
  currentUser: CurrentUser;
  selectedMatchId: string | null;
  onSelectMatch: (matchId: string | null) => void;
  onSendMessage: (matchId: string, text: string, isIcebreaker?: boolean) => void;
  onSelectProfile: (profile: DatingProfile) => void;
  onRequestBlockUser: (profile: DatingProfile) => void;
  onGoToSwipe: () => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  matches,
  messagesByMatch,
  profileMap,
  currentUser,
  selectedMatchId,
  onSelectMatch,
  onSendMessage,
  onSelectProfile,
  onRequestBlockUser,
  onGoToSwipe,
}) => {
  const [draft, setDraft] = useState('');
  const [showIcebreakersDrawer, setShowIcebreakersDrawer] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0] || null;
  const activeProfile = activeMatch
    ? profileMap[activeMatch.profileId]
    : undefined;
  const activeMessages = activeMatch
    ? messagesByMatch[activeMatch.id] || []
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeMatch?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatch || !draft.trim()) return;
    onSendMessage(activeMatch.id, draft.trim(), false);
    setDraft('');
  };

  if (matches.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="rounded-3xl bg-white border border-zinc-200 p-10 sm:p-14">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Ingen matcher ennå
          </h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
            Når du og en annen bruker liker hverandre, dukker samtalen opp her med
            ferdige samtalestartere klare til bruk.
          </p>
          <button
            type="button"
            onClick={onGoToSwipe}
            className="mt-6 min-h-[48px] px-6 py-3 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition whitespace-nowrap"
          >
            Finn nye matcher
          </button>
        </div>
      </section>
    );
  }

  // On mobile, if selectedMatchId is set, show conversation view; if null, show list
  const mobileShowChat = Boolean(selectedMatchId && activeMatch && activeProfile);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Pane: Matches & Conversations List */}
        <div
          className={`lg:col-span-4 rounded-3xl bg-white border border-zinc-200 overflow-hidden flex flex-col h-[calc(100vh-148px)] lg:h-[640px] ${
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-4 sm:p-5 border-b border-zinc-100">
            <h1 className="text-xl font-bold text-zinc-900">Meldinger</h1>
            <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
              {matches.length}{' '}
              {matches.length === 1 ? 'aktiv match' : 'aktive matcher'}
            </p>

            {/* Horizontal New Matches Avatar Row */}
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
              {matches.map((match) => {
                const p = profileMap[match.profileId];
                if (!p) return null;
                return (
                  <button
                    key={`avatar-${match.id}`}
                    type="button"
                    onClick={() => onSelectMatch(match.id)}
                    className="flex flex-col items-center gap-1 shrink-0 group min-w-[56px]"
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-rose-500/80 p-0.5 bg-white">
                      <SafeImage
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-800 truncate max-w-[64px]">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread Rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {matches.map((match) => {
              const p = profileMap[match.profileId];
              if (!p) return null;
              const msgs = messagesByMatch[match.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const isSelected = activeMatch?.id === match.id;

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match.id)}
                  className={`w-full min-h-[72px] px-4 sm:px-5 py-3.5 flex items-center gap-3.5 text-left transition ${
                    isSelected ? 'bg-zinc-50' : 'hover:bg-zinc-50/70'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0">
                    <SafeImage
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-zinc-900 truncate">
                          {p.name}
                        </span>
                        {p.verified && <VerifiedBadge size="sm" />}
                      </div>
                      <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
                        {lastMsg ? lastMsg.createdAt : match.matchedAt}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 truncate mt-1">
                      {lastMsg
                        ? `${
                            lastMsg.senderId === currentUser.id ? 'Du: ' : ''
                          }${lastMsg.text}`
                        : 'Ny match — trykk for å sende en icebreaker'}
                    </p>
                  </div>

                  {match.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center tabular-nums shrink-0">
                      {match.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Active Conversation + 3 Icebreakers */}
        {activeMatch && activeProfile && (
          <div
            className={`lg:col-span-8 rounded-3xl bg-white border border-zinc-200 overflow-hidden flex flex-col h-[calc(100vh-148px)] lg:h-[640px] ${
              mobileShowChat ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectMatch(null)}
                  className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-zinc-600 hover:text-zinc-900"
                  aria-label="Tilbake til meldingslisten"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProfile(activeProfile)}
                  className="flex items-center gap-3 text-left min-w-0 group"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 shrink-0">
                    <SafeImage
                      src={activeProfile.image}
                      alt={activeProfile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-zinc-900 group-hover:underline truncate">
                        {activeProfile.name},{' '}
                        <span className="tabular-nums">{activeProfile.age}</span>
                      </span>
                      {activeProfile.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-zinc-500 truncate">
                      {activeProfile.isOnline
                        ? 'Aktiv nå'
                        : activeProfile.lastActiveLabel}{' '}
                      · {activeProfile.city}
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowIcebreakersDrawer((v) => !v)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
                >
                  <span>Icebreakers</span>
                  {showIcebreakersDrawer ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRequestBlockUser(activeProfile)}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition"
                  aria-label={`Blokker ${activeProfile.name}`}
                  title={`Blokker ${activeProfile.name}`}
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Blokker bruker</span>
                  <span className="sm:hidden">Blokker</span>
                </button>
              </div>
            </div>

            {/* Collapsible 3 Curated Icebreakers Panel */}
            <AnimatePresence initial={false}>
              {showIcebreakersDrawer && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="px-4 sm:px-6 py-3.5 bg-zinc-50/90 border-b border-zinc-100 shrink-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-zinc-600 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      <span>
                        3 foreslåtte samtalestartere tilpasset {activeProfile.name} — trykk for å sende:
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {activeMatch.icebreakers.map((icebreaker, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          onSendMessage(activeMatch.id, icebreaker, true)
                        }
                        className="min-h-[48px] text-left p-3 rounded-2xl bg-white border border-zinc-200 hover:border-rose-300 hover:bg-rose-50/40 text-xs text-zinc-800 leading-snug flex items-center justify-between gap-2 active:scale-[0.99] transition"
                      >
                        <span>{icebreaker}</span>
                        <Send className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="text-center py-2">
                <p className="text-xs text-zinc-400 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                  <span>Dere matchet · {activeMatch.matchedAt}</span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onRequestBlockUser(activeProfile)}
                    className="text-zinc-500 hover:text-red-600 font-medium underline underline-offset-2 transition"
                  >
                    Blokker bruker
                  </button>
                </p>
              </div>

              {activeMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className={`flex flex-col ${
                      isMine ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMine
                          ? 'bg-rose-600 text-white rounded-br-sm'
                          : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="mt-1 text-[11px] text-zinc-400 tabular-nums px-1">
                      {msg.isIcebreaker ? 'Icebreaker · ' : ''}
                      {msg.createdAt}
                    </span>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSubmit}
              className="p-3.5 sm:px-6 sm:py-4 border-t border-zinc-100 bg-white flex items-center gap-2.5 shrink-0"
            >
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Skriv en melding til ${activeProfile.name}...`}
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="min-h-[48px] px-5 rounded-xl bg-zinc-900 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-35 transition whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};
