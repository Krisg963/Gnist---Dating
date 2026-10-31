import React, { useState } from 'react';
import { Check, Download, Share, User, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const VerifiedBadge: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}> = ({ size = 'md', showLabel = false }) => {
  const dims =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'lg'
        ? 'w-6 h-6'
        : 'w-5 h-5';
  const iconDims =
    size === 'sm'
      ? 'w-2.5 h-2.5'
      : size === 'lg'
        ? 'w-3.5 h-3.5'
        : 'w-3 h-3';

  return (
    <span
      className="inline-flex items-center gap-1.5 shrink-0"
      title="Verifisert profil"
      aria-label="Verifisert profil"
    >
      <span
        className={`${dims} inline-flex items-center justify-center rounded-full bg-sky-500 text-white shadow-xs ring-2 ring-white/90`}
      >
        <Check className={iconDims} strokeWidth={3} />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-sky-700 whitespace-nowrap">
          Verifisert profil
        </span>
      )}
    </span>
  );
};

export const SafeImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}> = ({ src, alt, className = '', fallbackLabel }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-200 via-zinc-100 to-rose-50 text-zinc-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <User className="w-10 h-10 mb-2 text-zinc-400" />
        {fallbackLabel && (
          <span className="text-xs font-medium text-zinc-600 px-3 text-center">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      loading="lazy"
    />
  );
};

export const PWAInstallControl: React.FC<{ compact?: boolean }> = ({
  compact = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? 'min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium inline-flex items-center gap-2 hover:bg-zinc-800 active:scale-[0.98] transition whitespace-nowrap shrink-0'
            : 'w-full min-h-[48px] px-4 py-3 rounded-xl bg-zinc-900 text-white text-sm font-medium inline-flex items-center justify-center gap-2.5 hover:bg-zinc-800 active:scale-[0.98] transition whitespace-nowrap'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Installer Gnist på hjemskjerm</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'min-h-[44px] px-3.5 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-xs font-medium inline-flex items-center gap-2 hover:bg-zinc-50 active:scale-[0.98] transition whitespace-nowrap shrink-0'
              : 'w-full min-h-[48px] px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-zinc-50 active:scale-[0.98] transition whitespace-nowrap'
          }
        >
          <Share className="w-4 h-4 shrink-0" />
          <span>Legg til på Hjem-skjerm</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-zinc-900">
                  Installer Gnist som app
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-zinc-500 hover:text-zinc-900"
                  aria-label="Lukk"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-zinc-600 leading-relaxed">
                1. Trykk på <strong>Del-ikonet</strong> nederst i nettleseren.
                <br />
                2. Velg <strong>Legg til på Hjem-skjerm</strong> for fullskjermsopplevelse.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition"
              >
                Skjønner
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-6 left-4 z-50 flex items-center gap-2 rounded-xl bg-zinc-900 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Frakoblet modus — bufrede profiler vises</span>
    </div>
  );
};
