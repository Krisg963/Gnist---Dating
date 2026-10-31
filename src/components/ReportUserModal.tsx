import React, { useEffect, useState } from 'react';
import { Flag, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DatingProfile } from '../types';
import { SafeImage } from './CommonUI';

interface ReportUserModalProps {
  profile: DatingProfile | null;
  matchId?: string | null;
  onClose: () => void;
  onSubmitReport: (payload: {
    profile: DatingProfile;
    matchId: string | null;
    reason: string;
    details: string;
    alsoBlock: boolean;
  }) => Promise<void> | void;
}

export const REPORT_REASONS = [
  'Trakassering',
  'Falsk profil',
  'Upassende bilder',
  'Upassende meldinger',
  'Spam eller svindelforsøk',
  'Annet upassende innhold',
] as const;

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  profile,
  matchId = null,
  onClose,
  onSubmitReport,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(
    REPORT_REASONS[0]
  );
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedReason(REPORT_REASONS[0]);
      setDetails('');
      setAlsoBlock(false);
      setSubmitting(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReport({
        profile,
        matchId,
        reason: selectedReason,
        details: details.trim(),
        alsoBlock,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {profile && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-user-modal-title"
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-white dark:bg-zinc-900">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                    <SafeImage
                      src={profile.image}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="report-user-modal-title"
                      className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate"
                    >
                      Rapporter {profile.name}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Rapporten behandles konfidensielt av vårt trygghetsteam
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition"
                  aria-label="Lukk dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Confidentiality Info */}
              <div className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 py-3 border-y border-zinc-100 dark:border-zinc-800 leading-relaxed">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    {profile.name}
                  </strong>{' '}
                  får ikke vite hvem som har sendt inn rapporten. Velg årsaken
                  som passer best nedenfor.
                </p>
              </div>

              {/* Reason Dropdown (<select>) */}
              <div>
                <label
                  htmlFor="report-reason-select"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Årsak til rapportering
                </label>
                <select
                  id="report-reason-select"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 transition-colors"
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Details */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="report-details-input"
                    className="text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    Tilleggsinformasjon (valgfritt)
                  </label>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                    {details.length}/300
                  </span>
                </div>
                <textarea
                  id="report-details-input"
                  rows={3}
                  maxLength={300}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Beskriv kort hva som har skjedd..."
                  className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 leading-relaxed"
                />
              </div>

              {/* Optional Block Checkbox */}
              <label className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 flex items-center justify-between gap-3 cursor-pointer select-none">
                <span className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200">
                  Blokker også {profile.name} og fjern fra matche-lister
                </span>
                <input
                  type="checkbox"
                  checked={alsoBlock}
                  onChange={(e) => setAlsoBlock(e.target.checked)}
                  className="w-4 h-4 rounded accent-rose-600 shrink-0"
                />
              </label>

              {/* Actions */}
              <div className="pt-1 flex items-center gap-2.5 pb-safe">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 active:scale-[0.99] transition whitespace-nowrap"
                >
                  Avbryt
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[1.35] min-h-[48px] px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-55 active:scale-[0.99] inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  <Flag className="w-4 h-4 shrink-0" />
                  <span>{submitting ? 'Sender...' : 'Send rapport'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
