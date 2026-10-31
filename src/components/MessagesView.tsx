import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type {
  ChatMessage,
  CurrentUser,
  DatingProfile,
  MatchRecord,
} from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';
import { LiveLocationMessageCard } from './LiveLocationMessageCard';

interface MessagesViewProps {
  matches: MatchRecord[];
  messagesByMatch: Record<string, ChatMessage[]>;
  profileMap: Record<string, DatingProfile>;
  currentUser: CurrentUser;
  selectedMatchId: string | null;
  locationRequestingMatchId: string | null;
  locationErrorByMatch: Record<string, string | null>;
  onSelectMatch: (matchId: string | null) => void;
  onSendMessage: (matchId: string, text: string, isIcebreaker?: boolean) => void;
  onStartLiveLocation: (matchId: string) => Promise<boolean>;
  onStopLiveLocation: (matchId: string, messageId?: string) => Promise<void>;
  onClearLocationError: (matchId: string) => void;
  onSelectProfile: (profile: DatingProfile) => void;
  onRequestBlockUser: (profile: DatingProfile) => void;
  onRequestReportUser: (profile: DatingProfile, matchId?: string) => void;
  onGoToSwipe: () => void;
}

function formatMatchTimestamp(match: MatchRecord): {
  full: string;
  compact: string;
  iso?: string;
} {
  if (match.matchedAtIso) {
    const parsed = new Date(match.matchedAtIso);
    if (!Number.isNaN(parsed.getTime())) {
      const fullDate = parsed.toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const compactDate = parsed.toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'short',
      });
      const time = parsed.toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return {
        full: `${fullDate} kl. ${time}`,
        compact: `${compactDate} · ${time}`,
        iso: parsed.toISOString(),
      };
    }
  }

  return {
    full: match.matchedAt,
    compact: match.matchedAt,
  };
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  matches,
  messagesByMatch,
  profileMap,
  currentUser,
  selectedMatchId,
  locationRequestingMatchId,
  locationErrorByMatch,
  onSelectMatch,
  onSendMessage,
  onStartLiveLocation,
  onStopLiveLocation,
  onClearLocationError,
  onSelectProfile,
  onRequestBlockUser,
  onRequestReportUser,
  onGoToSwipe,
}) => {
  const [draft, setDraft] = useState('');
  const [showIcebreakersDrawer, setShowIcebreakersDrawer] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeMatch =
    matches.find((m) => m.id === selectedMatchId) || matches[0] || null;
  const activeProfile = activeMatch
    ? profileMap[activeMatch.profileId]
    : undefined;
  const activeMessages = activeMatch
    ? messagesByMatch[activeMatch.id] || []
    : [];
  const activeMatchTime = activeMatch
    ? formatMatchTimestamp(activeMatch)
    : null;
  const userAllowsReadReceipts = currentUser.readReceiptsEnabled !== false;
  const activeRecipientAllowsRead =
    activeProfile?.readReceiptsEnabled !== false;
  const canShowActiveReadReceipts =
    userAllowsReadReceipts && activeRecipientAllowsRead;

  const hasAnyActiveLiveLocation = useMemo(() => {
    for (const list of Object.values(messagesByMatch)) {
      if (
        Array.isArray(list) &&
        list.some(
          (m) =>
            m.liveLocation?.isActive &&
            Date.parse(m.liveLocation.expiresAtIso) > nowMs
        )
      ) {
        return true;
      }
    }
    return false;
  }, [messagesByMatch, nowMs]);

  useEffect(() => {
    if (!hasAnyActiveLiveLocation) return;
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasAnyActiveLiveLocation]);

  useEffect(() => {
    setShowLocationPrompt(false);
  }, [activeMatch?.id]);

  const activeMyLiveLocationMsg = useMemo(() => {
    return [...activeMessages]
      .reverse()
      .find(
        (m) =>
          m.senderId === currentUser.id &&
          m.liveLocation?.isActive &&
          Date.parse(m.liveLocation.expiresAtIso) > nowMs
      );
  }, [activeMessages, currentUser.id, nowMs]);

  const activeLocationError = activeMatch
    ? locationErrorByMatch[activeMatch.id] || null
    : null;
  const isRequestingLocationForActive =
    Boolean(activeMatch) && locationRequestingMatchId === activeMatch?.id;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeMatch?.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMatch || !draft.trim()) return;
    onSendMessage(activeMatch.id, draft.trim(), false);
    setDraft('');
  };

  const handleConfirmStartLocation = async () => {
    if (!activeMatch) return;
    const started = await onStartLiveLocation(activeMatch.id);
    if (started) {
      setShowLocationPrompt(false);
      setNowMs(Date.now());
    }
  };

  if (matches.length === 0) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 sm:p-14">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Ingen matcher ennå
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
            Når du og en annen bruker liker hverandre, dukker samtalen opp her med
            nøyaktig tidspunkt for matchen og ferdige samtalestartere klare til bruk.
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
          className={`lg:col-span-4 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col h-[calc(100vh-148px)] lg:h-[640px] ${
            mobileShowChat ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Meldinger
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
              {matches.length}{' '}
              {matches.length === 1 ? 'aktiv match' : 'aktive matcher'}
            </p>

            {/* Horizontal Matches Avatar Row with Compact Match Timestamp */}
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
              {matches.map((match) => {
                const p = profileMap[match.profileId];
                if (!p) return null;
                const matchTime = formatMatchTimestamp(match);
                return (
                  <button
                    key={`avatar-${match.id}`}
                    type="button"
                    onClick={() => onSelectMatch(match.id)}
                    className="flex flex-col items-center gap-0.5 shrink-0 group min-w-[64px]"
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-rose-500/80 p-0.5 bg-white dark:bg-zinc-900">
                      <SafeImage
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <span className="mt-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[72px]">
                      {p.name}
                    </span>
                    <time
                      dateTime={matchTime.iso}
                      className="text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap"
                    >
                      {matchTime.compact}
                    </time>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread Rows with Exact Match Creation Date & Timestamp */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {matches.map((match) => {
              const p = profileMap[match.profileId];
              if (!p) return null;
              const msgs = messagesByMatch[match.id] || [];
              const lastMsg = msgs[msgs.length - 1];
              const isSelected = activeMatch?.id === match.id;
              const matchTime = formatMatchTimestamp(match);

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match.id)}
                  className={`w-full min-h-[78px] px-4 sm:px-5 py-3.5 flex items-center gap-3.5 text-left transition ${
                    isSelected
                      ? 'bg-zinc-50 dark:bg-zinc-800/75'
                      : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    <SafeImage
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                          {p.name}
                        </span>
                        {p.verified && <VerifiedBadge size="sm" />}
                      </div>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                        {lastMsg ? lastMsg.createdAt : 'Ny match'}
                      </span>
                    </div>

                    {/* Exact Match Creation Date & Timestamp (Unboxed Metadata) */}
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-400 truncate mt-0.5 tabular-nums">
                      <span>Matchet </span>
                      <time dateTime={matchTime.iso}>{matchTime.full}</time>
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate mt-1 flex items-center gap-1">
                      {lastMsg ? (
                        <>
                          {lastMsg.senderId === currentUser.id &&
                            (userAllowsReadReceipts &&
                            p.readReceiptsEnabled !== false &&
                            lastMsg.readAt ? (
                              <CheckCheck
                                className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0"
                                aria-label="Lest"
                              />
                            ) : (
                              <Check
                                className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0"
                                aria-label="Levert"
                              />
                            ))}
                          {lastMsg.liveLocation ? (
                            <span className="truncate inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">
                                {lastMsg.senderId === currentUser.id
                                  ? 'Du: '
                                  : ''}
                                {lastMsg.liveLocation.isActive &&
                                Date.parse(lastMsg.liveLocation.expiresAtIso) >
                                  nowMs
                                  ? 'Deler live-posisjon (30 min)'
                                  : 'Live-posisjon avsluttet'}
                              </span>
                            </span>
                          ) : (
                            <span className="truncate">
                              {lastMsg.senderId === currentUser.id ? 'Du: ' : ''}
                              {lastMsg.text}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="truncate">
                          Ingen meldinger ennå — trykk for å sende en icebreaker
                        </span>
                      )}
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
        {activeMatch && activeProfile && activeMatchTime && (
          <div
            className={`lg:col-span-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col h-[calc(100vh-148px)] lg:h-[640px] ${
              mobileShowChat ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectMatch(null)}
                  className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  aria-label="Tilbake til meldingslisten"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProfile(activeProfile)}
                  className="flex items-center gap-3 text-left min-w-0 group"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    <SafeImage
                      src={activeProfile.image}
                      alt={activeProfile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:underline truncate">
                        {activeProfile.name},{' '}
                        <span className="tabular-nums">{activeProfile.age}</span>
                      </span>
                      {activeProfile.verified && <VerifiedBadge size="sm" />}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate tabular-nums">
                      {activeProfile.isOnline
                        ? 'Aktiv nå'
                        : activeProfile.lastActiveLabel}{' '}
                      · {activeProfile.city} · Matchet{' '}
                      <time dateTime={activeMatchTime.iso}>
                        {activeMatchTime.full}
                      </time>
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (activeMyLiveLocationMsg) {
                      void onStopLiveLocation(
                        activeMatch.id,
                        activeMyLiveLocationMsg.id
                      );
                    } else {
                      setShowLocationPrompt((v) => !v);
                    }
                  }}
                  className={`min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition ${
                    activeMyLiveLocationMsg
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/80'
                      : showLocationPrompt
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                  title={
                    activeMyLiveLocationMsg
                      ? 'Avslutt aktiv posisjonsdeling'
                      : 'Del nåværende live-posisjon i 30 minutter'
                  }
                >
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">
                    {activeMyLiveLocationMsg
                      ? 'Avslutt posisjon'
                      : 'Del live-posisjon'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowIcebreakersDrawer((v) => !v)}
                  className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition"
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
                  onClick={() =>
                    onRequestReportUser(activeProfile, activeMatch.id)
                  }
                  className="min-h-[40px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition"
                  aria-label={`Rapporter ${activeProfile.name}`}
                  title={`Rapporter ${activeProfile.name}`}
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">Rapporter bruker</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRequestBlockUser(activeProfile)}
                  className="min-h-[40px] min-w-[40px] sm:min-w-0 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition"
                  aria-label={`Blokker ${activeProfile.name}`}
                  title={`Blokker ${activeProfile.name}`}
                >
                  <Ban className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">Blokker bruker</span>
                </button>
              </div>
            </div>

            {/* Active 30-Minute Live Location Status Banner */}
            {activeMyLiveLocationMsg?.liveLocation && (
              <div className="px-4 sm:px-6 py-2.5 bg-emerald-50/90 dark:bg-emerald-950/45 border-b border-emerald-200/80 dark:border-emerald-800/70 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0 text-xs text-emerald-900 dark:text-emerald-200">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-semibold truncate">
                    Du deler live-posisjon med {activeProfile.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums shrink-0">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {(() => {
                      const rem = Math.max(
                        0,
                        Math.floor(
                          (Date.parse(
                            activeMyLiveLocationMsg.liveLocation.expiresAtIso
                          ) -
                            nowMs) /
                            1000
                        )
                      );
                      const m = String(Math.floor(rem / 60)).padStart(2, '0');
                      const s = String(rem % 60).padStart(2, '0');
                      return `${m}:${s} igjen`;
                    })()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void onStopLiveLocation(
                      activeMatch.id,
                      activeMyLiveLocationMsg.id
                    )
                  }
                  className="min-h-[34px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
                >
                  <Square className="w-3 h-3" fill="currentColor" />
                  <span>Avslutt</span>
                </button>
              </div>
            )}

            {/* Collapsible 3 Curated Icebreakers Panel */}
            <AnimatePresence initial={false}>
              {showIcebreakersDrawer && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="px-4 sm:px-6 py-3.5 bg-zinc-50/90 dark:bg-zinc-950/60 border-b border-zinc-100 dark:border-zinc-800 shrink-0"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
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
                        className="min-h-[48px] text-left p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/30 text-xs text-zinc-800 dark:text-zinc-200 leading-snug flex items-center justify-between gap-2 active:scale-[0.99] transition"
                      >
                        <span>{icebreaker}</span>
                        <Send className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message History */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="text-center py-2">
                <p className="text-xs text-zinc-400 dark:text-zinc-500 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 tabular-nums">
                  <span>
                    Match med {activeProfile.name} opprettet{' '}
                    <time
                      dateTime={activeMatchTime.iso}
                      className="font-medium text-zinc-600 dark:text-zinc-300"
                    >
                      {activeMatchTime.full}
                    </time>
                  </span>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      onRequestReportUser(activeProfile, activeMatch.id)
                    }
                    className="text-zinc-500 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-400 font-medium underline underline-offset-2 transition"
                  >
                    Rapporter bruker
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onRequestBlockUser(activeProfile)}
                    className="text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 font-medium underline underline-offset-2 transition"
                  >
                    Blokker bruker
                  </button>
                </p>
              </div>

              {activeMessages.map((msg) => {
                const isMine = msg.senderId === currentUser.id;
                const isReadVisible =
                  isMine && canShowActiveReadReceipts && Boolean(msg.readAt);

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
                    {msg.liveLocation ? (
                      <LiveLocationMessageCard
                        message={msg}
                        liveLocation={msg.liveLocation}
                        isMine={isMine}
                        recipientName={activeProfile.name}
                        nowMs={nowMs}
                        onStopSharing={(messageId) =>
                          void onStopLiveLocation(activeMatch.id, messageId)
                        }
                      />
                    ) : (
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? 'bg-rose-600 text-white rounded-br-sm'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    )}
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums px-1">
                      <span>
                        {msg.isIcebreaker
                          ? 'Icebreaker · '
                          : msg.liveLocation
                            ? 'Live-posisjon · '
                            : ''}
                        {msg.createdAt}
                      </span>
                      {isMine && (
                        <>
                          <span aria-hidden="true">·</span>
                          {isReadVisible ? (
                            <span className="inline-flex items-center gap-1 font-medium text-sky-600 dark:text-sky-400">
                              <CheckCheck
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span>Lest {msg.readAt}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500">
                              <Check
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span>
                                {canShowActiveReadReceipts ? 'Levert' : 'Sendt'}
                              </span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {!canShowActiveReadReceipts && (
                <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                  {!activeRecipientAllowsRead
                    ? `${activeProfile.name} har deaktivert lesebekreftelser i innstillingene.`
                    : 'Lesebekreftelser er skjult fordi du har deaktivert dem i innstillingene.'}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Inline Geolocation Error Banner (No window.alert) */}
            <AnimatePresence initial={false}>
              {activeLocationError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  role="alert"
                  className="mx-3.5 sm:mx-6 mb-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-3.5 py-2.5 flex items-start justify-between gap-3 shrink-0"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      {activeLocationError}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isRequestingLocationForActive}
                      onClick={() => void handleConfirmStartLocation()}
                      className="min-h-[34px] px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition whitespace-nowrap"
                    >
                      Prøv igjen
                    </button>
                    <button
                      type="button"
                      onClick={() => onClearLocationError(activeMatch.id)}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white"
                      aria-label="Skjul feilmelding"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expandable 30-Minute Live Location Confirmation Sheet */}
            <AnimatePresence initial={false}>
              {showLocationPrompt && !activeMyLiveLocationMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="px-4 sm:px-6 py-3.5 bg-zinc-50 dark:bg-zinc-950/75 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                        Del live-posisjon med {activeProfile.name} i 30 minutter
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        Bruker enhetens GPS (Geolocation API). Delingen stoppes automatisk etter 30 min eller når du trykker avslutt.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowLocationPrompt(false)}
                      disabled={isRequestingLocationForActive}
                      className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition whitespace-nowrap"
                    >
                      Avbryt
                    </button>

                    <button
                      type="button"
                      disabled={isRequestingLocationForActive}
                      onClick={() => void handleConfirmStartLocation()}
                      className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
                    >
                      {isRequestingLocationForActive ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span>Henter posisjon...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5 shrink-0" />
                          <span>Start deling i 30 min</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Composer with Quick Live-Location Trigger */}
            <form
              onSubmit={handleSubmit}
              className="p-3.5 sm:px-6 sm:py-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
            >
              <button
                type="button"
                disabled={isRequestingLocationForActive}
                onClick={() => {
                  if (activeMyLiveLocationMsg) {
                    void onStopLiveLocation(
                      activeMatch.id,
                      activeMyLiveLocationMsg.id
                    );
                  } else {
                    setShowLocationPrompt((v) => !v);
                  }
                }}
                aria-label={
                  activeMyLiveLocationMsg
                    ? 'Avslutt deling av live-posisjon'
                    : 'Del live-posisjon i 30 minutter'
                }
                title={
                  activeMyLiveLocationMsg
                    ? 'Avslutt deling av live-posisjon'
                    : 'Del live-posisjon i 30 minutter'
                }
                className={`min-h-[48px] min-w-[48px] sm:px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                  activeMyLiveLocationMsg
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                    : showLocationPrompt
                      ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {isRequestingLocationForActive ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {activeMyLiveLocationMsg ? 'Stopp posisjon' : 'Del live-posisjon'}
                </span>
              </button>

              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Skriv en melding til ${activeProfile.name}...`}
                className="flex-1 min-h-[48px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-300"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="min-h-[48px] px-4 sm:px-5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-35 transition whitespace-nowrap shrink-0"
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
