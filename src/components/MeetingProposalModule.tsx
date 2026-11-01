import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarCheck2,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  computeThreeOpenDateSlots,
  createGoogleCalendarDateEvent,
  disconnectGoogleCalendar,
  fetchUserGoogleCalendarAvailability,
  getGoogleCalendarAuthSnapshot,
  signInWithGoogleCalendar,
  subscribeGoogleCalendarAuth,
} from '../services/googleCalendarService';
import type {
  CalendarBusyInterval,
  ChatMessage,
  DatingProfile,
  MeetingProposalShare,
  PartnerAvailabilityResponse,
  ProposedTimeSlot,
} from '../types';
import { GoogleSignInButton } from './GoogleSignInButton';

interface MeetingProposalDrawerProps {
  matchId: string;
  partner: DatingProfile;
  onFetchPartnerAvailability: (
    matchId: string
  ) => Promise<PartnerAvailabilityResponse | null>;
  onSendMeetingProposal: (params: {
    matchId: string;
    slots: ProposedTimeSlot[];
    userCalendarChecked: boolean;
    note?: string;
  }) => Promise<boolean>;
  onClose: () => void;
}

export const MeetingProposalDrawer: React.FC<MeetingProposalDrawerProps> = ({
  matchId,
  partner,
  onFetchPartnerAvailability,
  onSendMeetingProposal,
  onClose,
}) => {
  const [authState, setAuthState] = useState(() =>
    getGoogleCalendarAuthSnapshot()
  );
  const [signingIn, setSigningIn] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [partnerBusy, setPartnerBusy] = useState<CalendarBusyInterval[]>([]);
  const [partnerNote, setPartnerNote] = useState<string>('');
  const [userBusyCount, setUserBusyCount] = useState<number>(0);
  const [userCalendarChecked, setUserCalendarChecked] =
    useState<boolean>(false);
  const [slots, setSlots] = useState<ProposedTimeSlot[]>([]);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    return subscribeGoogleCalendarAuth((next) => {
      setAuthState(next);
    });
  }, []);

  const runAvailabilityAnalysis = useCallback(
    async (withGoogleCalendar: boolean) => {
      setAnalyzing(true);
      setErrorMsg(null);
      try {
        const partnerData = await onFetchPartnerAvailability(matchId);
        const pBusy = partnerData?.busyIntervals || [];
        setPartnerBusy(pBusy);
        setPartnerNote(
          partnerData?.preferredNote ||
            `${partner.name} foretrekker ettermiddager eller helg i ${partner.city}.`
        );

        let uBusy: CalendarBusyInterval[] = [];
        let checkedGoogle = false;

        if (withGoogleCalendar && getGoogleCalendarAuthSnapshot().connected) {
          const userRes = await fetchUserGoogleCalendarAvailability(7);
          if (userRes.ok) {
            uBusy = userRes.busyIntervals;
            setUserBusyCount(userRes.upcomingCount);
            checkedGoogle = true;
          } else if (userRes.error) {
            setErrorMsg(userRes.error);
          }
        }

        setUserCalendarChecked(checkedGoogle);

        const computed = computeThreeOpenDateSlots({
          userBusyIntervals: uBusy,
          partnerBusyIntervals: pBusy,
          partnerCity: partner.city,
          partnerInterests: partner.interests,
        });
        setSlots(computed);
      } catch {
        setErrorMsg('Kunne ikke analysere tilgjengelighet akkurat nå.');
      } finally {
        setAnalyzing(false);
      }
    },
    [matchId, onFetchPartnerAvailability, partner.city, partner.interests, partner.name]
  );

  useEffect(() => {
    void runAvailabilityAnalysis(authState.connected);
  }, [authState.connected, runAvailabilityAnalysis]);

  const handleConnectGoogle = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    const res = await signInWithGoogleCalendar();
    setSigningIn(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
      return;
    }
    if (res.ok) {
      await runAvailabilityAnalysis(true);
    }
  };

  const handleDisconnectGoogle = async () => {
    await disconnectGoogleCalendar();
    setUserCalendarChecked(false);
    setUserBusyCount(0);
    await runAvailabilityAnalysis(false);
  };

  const handleUpdateSlotActivity = (slotId: string, nextActivity: string) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, activitySuggestion: nextActivity } : s
      )
    );
  };

  const handleSendSlots = async () => {
    if (slots.length === 0 || sending) return;
    setSending(true);
    const ok = await onSendMeetingProposal({
      matchId,
      slots: slots.slice(0, 3),
      userCalendarChecked,
      note: customNote.trim() || undefined,
    });
    setSending(false);
    if (ok) {
      onClose();
    } else {
      setErrorMsg('Kunne ikke sende møteforslaget i samtalen. Prøv igjen.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="px-4 sm:px-6 py-4 bg-zinc-50 dark:bg-zinc-950/85 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3.5 shrink-0 max-h-[380px] overflow-y-auto"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Foreslå møtetidspunkt med {partner.name}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
            {userCalendarChecked ? (
              <>
                Google Calendar tilkoblet
                {authState.email ? ` (${authState.email})` : ''} ·{' '}
                {userBusyCount} egne hendelser og {partnerBusy.length} opptatte
                blokker hos {partner.name} filtrert bort
              </>
            ) : (
              <>
                {partnerBusy.length} opptatte tidspunkter hos {partner.name}{' '}
                analysert · Koble til Google Calendar for å sjekke din egen
                kalender samtidig
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {authState.connected ? (
            <>
              <button
                type="button"
                disabled={analyzing}
                onClick={() => void runAvailabilityAnalysis(true)}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`}
                />
                <span>Oppdater tider</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDisconnectGoogle()}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1 transition whitespace-nowrap"
                title="Koble fra Google Calendar"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Koble fra</span>
              </button>
            </>
          ) : (
            <GoogleSignInButton
              compact
              loading={signingIn}
              label="Logg inn med Google"
              onClick={() => void handleConnectGoogle()}
            />
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition"
            aria-label="Lukk møteforslag"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3 py-2 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs text-amber-900 dark:text-amber-200">
              {errorMsg}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="min-h-[32px] min-w-[32px] flex items-center justify-center text-amber-700 dark:text-amber-300"
            aria-label="Lukk feilmelding"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {partnerNote && (
        <p className="text-xs text-zinc-600 dark:text-zinc-300">
          Tilgjengelighet: {partnerNote}
        </p>
      )}

      {analyzing ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
          <span>Analyserer begge parters kalendere og finner 3 ledige tidsluker...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {slots.slice(0, 3).map((slot, index) => (
            <div
              key={slot.id}
              className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                <span>Forslag {index + 1} · Begge ledige</span>
                <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
                  {slot.dayLabel}
                </p>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                  kl. {slot.timeRangeLabel}
                </p>
              </div>
              <input
                type="text"
                value={slot.activitySuggestion}
                onChange={(e) =>
                  handleUpdateSlotActivity(slot.id, e.target.value)
                }
                aria-label={`Aktivitet for forslag ${index + 1}`}
                className="w-full min-h-[36px] px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
        <input
          type="text"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          placeholder={`Valgfri melding til ${partner.name} (f.eks. «Passer en av disse for en kaffe?»)...`}
          className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
        />

        <button
          type="button"
          disabled={analyzing || sending || slots.length === 0}
          onClick={() => void handleSendSlots()}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-55 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition whitespace-nowrap shrink-0"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sender forslag...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Send 3 tidsluker i chatten</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};

interface MeetingProposalMessageCardProps {
  message: ChatMessage;
  proposal: MeetingProposalShare;
  isMine: boolean;
  partnerName: string;
  partnerCity: string;
  onSelectSlot: (matchId: string, messageId: string, slotId: string) => Promise<void>;
  onRequestAddToGoogleCalendar: (params: {
    matchId: string;
    messageId: string;
    slot: ProposedTimeSlot;
    partnerName: string;
    partnerCity: string;
  }) => void;
}

export const MeetingProposalMessageCard: React.FC<
  MeetingProposalMessageCardProps
> = ({
  message,
  proposal,
  isMine,
  partnerName,
  partnerCity,
  onSelectSlot,
  onRequestAddToGoogleCalendar,
}) => {
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);

  const selectedSlot = proposal.slots.find(
    (s) => s.id === proposal.selectedSlotId
  );

  const handleChoose = async (slotId: string) => {
    setSelectingSlotId(slotId);
    await onSelectSlot(message.matchId, message.id, slotId);
    setSelectingSlotId(null);
  };

  return (
    <div className="w-full max-w-[94%] sm:max-w-[78%] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-50">
            <Calendar className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>
              {isMine
                ? `Du foreslo 3 møtetidspunkter`
                : `${message.senderName} foreslo 3 møtetidspunkter`}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {proposal.userCalendarChecked
              ? `Sjekket mot Google Calendar og ${partnerName}s tilgjengelighet`
              : `Tilpasset ledige tider for deg og ${partnerName}`}
          </p>
        </div>

        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
          {selectedSlot ? 'Avtalt tid' : '3 ledige luker'}
        </span>
      </div>

      {proposal.note && (
        <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed">
          «{proposal.note}»
        </p>
      )}

      <div className="space-y-2">
        {proposal.slots.map((slot) => {
          const isSelected = proposal.selectedSlotId === slot.id;
          const isPartnerPreferred =
            proposal.partnerSuggestedSlotId === slot.id && !isSelected;
          const isBusy = selectingSlotId === slot.id;

          return (
            <button
              key={slot.id}
              type="button"
              disabled={Boolean(selectingSlotId)}
              onClick={() => void handleChoose(slot.id)}
              className={`w-full min-h-[54px] p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition ${
                isSelected
                  ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/70 dark:bg-emerald-950/35'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/60 bg-zinc-50/60 dark:bg-zinc-800/50'
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {slot.dayLabel}
                  </span>
                  <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                    ·
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                    kl. {slot.timeRangeLabel}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 truncate">
                  {slot.activitySuggestion}
                  {isPartnerPreferred
                    ? ` · Passer ekstra godt for ${partnerName}`
                    : ''}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold">
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                ) : isSelected ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    <Check className="w-4 h-4" />
                    <span>Valgt</span>
                  </span>
                ) : (
                  <span className="text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                    Velg
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selectedSlot && (
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
            Bekreftet med {proposal.selectedByName || partnerName}:{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {selectedSlot.dayLabel} kl. {selectedSlot.timeRangeLabel}
            </strong>
          </p>

          {proposal.addedToGoogleCalendarEventId ? (
            <a
              href={
                proposal.addedToGoogleCalendarLink ||
                'https://calendar.google.com'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-xs font-semibold text-emerald-800 dark:text-emerald-200 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span>Lagt til i Google Calendar</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() =>
                onRequestAddToGoogleCalendar({
                  matchId: message.matchId,
                  messageId: message.id,
                  slot: selectedSlot,
                  partnerName,
                  partnerCity,
                })
              }
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Legg til i Google Calendar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

interface CalendarEventConfirmModalProps {
  pendingEvent: {
    matchId: string;
    messageId: string;
    slot: ProposedTimeSlot;
    partnerName: string;
    partnerCity: string;
  } | null;
  onClose: () => void;
  onSynced: (params: {
    matchId: string;
    messageId: string;
    eventId: string;
    htmlLink: string;
  }) => Promise<void>;
}

export const CalendarEventConfirmModal: React.FC<
  CalendarEventConfirmModalProps
> = ({ pendingEvent, onClose, onSynced }) => {
  const [authState, setAuthState] = useState(() =>
    getGoogleCalendarAuthSnapshot()
  );
  const [signingIn, setSigningIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    return subscribeGoogleCalendarAuth((next) => {
      setAuthState(next);
    });
  }, []);

  useEffect(() => {
    setErrorMsg(null);
    setSaving(false);
  }, [pendingEvent]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setErrorMsg(null);
    const res = await signInWithGoogleCalendar();
    setSigningIn(false);
    if (!res.ok && res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleConfirmCreate = async () => {
    if (!pendingEvent || saving) return;
    setSaving(true);
    setErrorMsg(null);

    const title = `Date med ${pendingEvent.partnerName}: ${pendingEvent.slot.activitySuggestion}`;
    const description = `Avtalt date med ${pendingEvent.partnerName} i Gnist (${pendingEvent.slot.dayLabel} kl. ${pendingEvent.slot.timeRangeLabel}).`;

    const result = await createGoogleCalendarDateEvent({
      title,
      description,
      location: pendingEvent.partnerCity,
      startIso: pendingEvent.slot.startIso,
      endIso: pendingEvent.slot.endIso,
    });

    setSaving(false);

    if (!result.ok) {
      setErrorMsg(
        result.error || 'Kunne ikke lagre hendelsen i Google Calendar.'
      );
      return;
    }

    await onSynced({
      matchId: pendingEvent.matchId,
      messageId: pendingEvent.messageId,
      eventId: result.eventId || `evt-${Date.now()}`,
      htmlLink: result.htmlLink || 'https://calendar.google.com',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {pendingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-confirm-title"
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2
                    id="calendar-confirm-title"
                    className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50"
                  >
                    Bekreft opprettelse i Google Calendar
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Kontroller detaljene før avtalen legges til i kalenderen din
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] min-w-[40px] rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center"
                aria-label="Lukk bekreftelse"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700 p-4 space-y-2.5 text-sm">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tittel på kalenderhendelse
                </p>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50 mt-0.5">
                  Date med {pendingEvent.partnerName}:{' '}
                  {pendingEvent.slot.activitySuggestion}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Dato</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {pendingEvent.slot.dayLabel}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tidspunkt
                  </p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums mt-0.5">
                    kl. {pendingEvent.slot.timeRangeLabel}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Sted: {pendingEvent.partnerCity}</span>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
              >
                {errorMsg}
              </div>
            )}

            {!authState.connected ? (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Logg inn med Google for å gi tillatelse til å opprette denne
                  avtalen i din Google Calendar:
                </p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap"
                  >
                    Avbryt
                  </button>
                  <GoogleSignInButton
                    loading={signingIn}
                    label="Logg inn med Google"
                    onClick={() => void handleSignIn()}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={saving}
                  onClick={onClose}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition whitespace-nowrap"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleConfirmCreate()}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Lagrer...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Bekreft og legg til</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
