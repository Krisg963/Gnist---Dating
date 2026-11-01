import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Gamepad2,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ChatGameId, ChatGameSession, ChatMessage } from '../types';

export const CHAT_GAME_CATALOG: Array<{
  id: ChatGameId;
  title: string;
  subtitle: string;
  roundsLabel: string;
}> = [
  {
    id: 'would_you_rather',
    title: 'Ville du heller',
    subtitle:
      '5 lekne dilemmaer der dere begge velger ett alternativ og ser om dere tenker likt.',
    roundsLabel: '5 runder · Dilemmaer',
  },
  {
    id: 'this_or_that',
    title: 'Enten eller: Date-utgaven',
    subtitle:
      'Raske preferanser om helgeplaner, mat, reise og stemning på første date.',
    roundsLabel: '5 runder · Lynvalg',
  },
  {
    id: 'spark_quiz',
    title: 'Gnist-quizen',
    subtitle:
      'Tre svaralternativer per runde som åpner for morsomme oppfølgingsspørsmål.',
    roundsLabel: '4 runder · Bli kjent',
  },
];

interface ChatGameLibraryDrawerProps {
  matchId: string;
  partnerName: string;
  onStartGame: (matchId: string, gameId: ChatGameId) => Promise<boolean>;
  onClose: () => void;
}

export const ChatGameLibraryDrawer: React.FC<ChatGameLibraryDrawerProps> = ({
  matchId,
  partnerName,
  onStartGame,
  onClose,
}) => {
  const [startingGameId, setStartingGameId] = useState<ChatGameId | null>(null);

  const handleLaunch = async (gameId: ChatGameId) => {
    if (startingGameId) return;
    setStartingGameId(gameId);
    const ok = await onStartGame(matchId, gameId);
    setStartingGameId(null);
    if (ok) {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="px-4 sm:px-6 py-4 bg-zinc-50 dark:bg-zinc-950/85 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3 shrink-0"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Spill-bibliotek — start et spill med {partnerName}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Velg et interaktivt spørsmålsspill for å gjøre samtalen mer levende
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] min-w-[40px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition"
          aria-label="Lukk spill-bibliotek"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {CHAT_GAME_CATALOG.map((game) => {
          const isStarting = startingGameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              disabled={Boolean(startingGameId)}
              onClick={() => void handleLaunch(game.id)}
              className="text-left rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 dark:hover:border-rose-500/60 p-3.5 flex flex-col justify-between gap-3 transition active:scale-[0.99] disabled:opacity-60"
            >
              <div className="space-y-1">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {game.roundsLabel}
                </p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {game.title}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug">
                  {game.subtitle}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span>{isStarting ? 'Starter spill...' : 'Start i chatten'}</span>
                {isStarting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

interface ChatGameMessageCardProps {
  message: ChatMessage;
  session: ChatGameSession;
  partnerName: string;
  onAnswerRound: (params: {
    matchId: string;
    messageId: string;
    roundIndex: number;
    choiceIndex: number;
  }) => Promise<void>;
  onNextRound: (matchId: string, messageId: string) => Promise<void>;
  onStartNewGame: (matchId: string, gameId: ChatGameId) => Promise<boolean>;
}

export const ChatGameMessageCard: React.FC<ChatGameMessageCardProps> = ({
  message,
  session,
  partnerName,
  onAnswerRound,
  onNextRound,
  onStartNewGame,
}) => {
  const [busyChoice, setBusyChoice] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const activeRound =
    session.rounds[session.currentRoundIndex] || session.rounds[0];

  if (!activeRound) return null;

  const hasAnsweredCurrent = activeRound.myChoiceIndex !== null;
  const bothAnsweredCurrent =
    activeRound.myChoiceIndex !== null &&
    activeRound.partnerChoiceIndex !== null;
  const sameChoiceThisRound =
    bothAnsweredCurrent &&
    activeRound.myChoiceIndex === activeRound.partnerChoiceIndex;
  const isLastRound = session.currentRoundIndex >= session.totalRounds - 1;
  const answeredRoundsCount = session.rounds.filter(
    (r) => r.myChoiceIndex !== null && r.partnerChoiceIndex !== null
  ).length;

  const handlePickOption = async (idx: number) => {
    if (hasAnsweredCurrent || busyChoice !== null) return;
    setBusyChoice(idx);
    await onAnswerRound({
      matchId: message.matchId,
      messageId: message.id,
      roundIndex: activeRound.roundIndex,
      choiceIndex: idx,
    });
    setBusyChoice(null);
  };

  const handleAdvance = async () => {
    if (advancing) return;
    setAdvancing(true);
    await onNextRound(message.matchId, message.id);
    setAdvancing(false);
  };

  return (
    <div className="w-full max-w-[94%] sm:max-w-[78%] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Gamepad2 className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {session.gameTitle}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              {session.status === 'completed'
                ? `Fullført · ${session.matchedChoicesCount} av ${session.totalRounds} felles svar`
                : `Runde ${session.currentRoundIndex + 1} av ${session.totalRounds} · Felles svar: ${session.matchedChoicesCount}/${Math.max(1, answeredRoundsCount)}`}
            </p>
          </div>
        </div>
      </div>

      {session.status === 'completed' ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/70 p-3.5 space-y-1.5">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
              Dere valgte likt på {session.matchedChoicesCount} av{' '}
              {session.totalRounds} spørsmål!
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {session.matchedChoicesCount >= Math.ceil(session.totalRounds / 2)
                ? `Sterk kjemi med ${partnerName} — dere tenker overraskende likt. Perfekt utgangspunkt for å avtale en date!`
                : `Morsomme kontraster mellom deg og ${partnerName} — spør gjerne hvorfor ${partnerName} valgte som hen gjorde!`}
            </p>
          </div>

          <div className="space-y-1.5">
            {session.rounds.map((r, i) => (
              <div
                key={r.roundIndex}
                className="text-xs text-zinc-600 dark:text-zinc-300 flex items-baseline justify-between gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800/70 last:border-b-0"
              >
                <span className="truncate">
                  <span className="tabular-nums text-zinc-400 mr-1">
                    {i + 1}.
                  </span>
                  {r.prompt}
                </span>
                <span className="shrink-0 font-medium text-zinc-800 dark:text-zinc-200">
                  {r.myChoiceIndex === r.partnerChoiceIndex ? 'Likt valg' : 'Ulikt'}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void onStartNewGame(message.matchId, session.gameId)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Spill en ny runde</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug">
            {activeRound.prompt}
          </p>

          <div className="space-y-2">
            {activeRound.options.map((optionText, idx) => {
              const isMine = activeRound.myChoiceIndex === idx;
              const isPartners =
                bothAnsweredCurrent && activeRound.partnerChoiceIndex === idx;
              const isLoading = busyChoice === idx;

              return (
                <button
                  key={`${activeRound.roundIndex}-${idx}`}
                  type="button"
                  disabled={hasAnsweredCurrent || busyChoice !== null}
                  onClick={() => void handlePickOption(idx)}
                  className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm transition flex items-center justify-between gap-3 ${
                    isMine && isPartners
                      ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-zinc-900 dark:text-zinc-50 font-semibold'
                      : isMine
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/35 text-zinc-900 dark:text-zinc-50 font-semibold'
                        : isPartners
                          ? 'border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 hover:border-rose-300 dark:hover:border-rose-500/60 text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <span className="leading-snug">{optionText}</span>

                  <span className="shrink-0 flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : bothAnsweredCurrent ? (
                      <>
                        {isMine && isPartners && (
                          <span className="text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 font-semibold">
                            <Sparkles className="w-3.5 h-3.5" />
                            Begge
                          </span>
                        )}
                        {isMine && !isPartners && (
                          <span className="text-rose-600 dark:text-rose-400 inline-flex items-center gap-1 font-semibold">
                            <Check className="w-3.5 h-3.5" />
                            Deg
                          </span>
                        )}
                        {!isMine && isPartners && <span>{partnerName}</span>}
                      </>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          {bothAnsweredCurrent && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {sameChoiceThisRound
                  ? `Full klaff! Både du og ${partnerName} valgte det samme.`
                  : `Du og ${partnerName} valgte ulikt denne runden.`}
              </p>

              <button
                type="button"
                disabled={advancing}
                onClick={() => void handleAdvance()}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0"
              >
                {advancing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>
                      {isLastRound ? 'Se sluttresultat' : 'Neste spørsmål'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
