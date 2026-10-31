import React, { useEffect, useState } from 'react';
import { Ban, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DatingProfile } from '../types';
import { SafeImage } from './CommonUI';

interface BlockUserModalProps {
  profile: DatingProfile | null;
  onClose: () => void;
  onConfirmBlock: (profile: DatingProfile, reason: string) => void;
}

const BLOCK_REASONS = [
  'Uønsket kontakt',
  'Upassende meldinger eller oppførsel',
  'Mistenkelig eller falsk profil',
  'Bare ikke en match for meg',
] as const;

export const BlockUserModal: React.FC<BlockUserModalProps> = ({
  profile,
  onClose,
  onConfirmBlock,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(BLOCK_REASONS[0]);

  useEffect(() => {
    if (profile) {
      setSelectedReason(BLOCK_REASONS[0]);
    }
  }, [profile]);

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
            aria-labelledby="block-user-modal-title"
            className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-white dark:bg-zinc-900">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>

            <div className="p-5 sm:p-6 space-y-5">
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
                      id="block-user-modal-title"
                      className="text-lg font-bold text-zinc-900 dark:text-zinc-50 truncate"
                    >
                      Blokker {profile.name}?
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Personen får ikke varsel om blokkeringen
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] min-w-[40px] -mr-2 -mt-1 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition"
                  aria-label="Lukk dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Consequences Summary */}
              <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 space-y-2 py-3.5 border-y border-zinc-100 dark:border-zinc-800 leading-relaxed">
                <p>
                  • <strong className="text-zinc-900 dark:text-zinc-100">{profile.name}</strong> fjernes umiddelbart fra dine matche-lister og samtaleloggen.
                </p>
                <p>
                  • Profilen skjules fra Utforsk, Sveip, Hvem likte deg og Live-sendinger.
                </p>
                <p>
                  • Du kan når som helst oppheve blokkeringen under Min profil.
                </p>
              </div>

              {/* Reason Selector */}
              <div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Velg årsak (kun synlig for deg)
                </p>
                <div className="space-y-1.5">
                  {BLOCK_REASONS.map((reason) => {
                    const active = selectedReason === reason;
                    return (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setSelectedReason(reason)}
                        aria-pressed={active}
                        className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center justify-between gap-2 text-left transition ${
                          active
                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span>{reason}</span>
                        {active && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  type="button"
                  onClick={() => onConfirmBlock(profile, selectedReason)}
                  className="flex-[1.3] min-h-[48px] px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.99] inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>Blokker {profile.name}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
