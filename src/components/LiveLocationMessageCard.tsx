import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  MapPin,
  Navigation,
  Square,
} from 'lucide-react';
import type { ChatMessage, LiveLocationShare } from '../types';

interface LiveLocationMessageCardProps {
  message: ChatMessage;
  liveLocation: LiveLocationShare;
  isMine: boolean;
  recipientName: string;
  nowMs: number;
  onStopSharing: (messageId: string) => void;
}

function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'Ø' : 'V';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

function formatUpdatedClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const LiveLocationMessageCard: React.FC<
  LiveLocationMessageCardProps
> = ({
  message,
  liveLocation,
  isMine,
  recipientName,
  nowMs,
  onStopSharing,
}) => {
  const [copied, setCopied] = useState(false);

  const expiresAtMs = Date.parse(liveLocation.expiresAtIso);
  const remainingSec = Number.isFinite(expiresAtMs)
    ? Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000))
    : 0;
  const isLive = Boolean(liveLocation.isActive && remainingSec > 0);

  const mins = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const secs = String(remainingSec % 60).padStart(2, '0');
  const progressPercent = Math.min(
    100,
    Math.max(0, (remainingSec / (30 * 60)) * 100)
  );

  const coordLabel = formatCoordinates(
    liveLocation.latitude,
    liveLocation.longitude
  );
  const updatedLabel = formatUpdatedClock(liveLocation.updatedAtIso);

  // Deterministic subtle grid shift from fractional coordinates so GPS updates visually shift map lines
  const shiftX = ((Math.abs(liveLocation.longitude) * 10000) % 24) - 12;
  const shiftY = ((Math.abs(liveLocation.latitude) * 10000) % 24) - 12;

  const handleCopyCoords = async () => {
    const raw = `${liveLocation.latitude.toFixed(6)}, ${liveLocation.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`w-full max-w-[330px] sm:max-w-[360px] rounded-2xl overflow-hidden border shadow-xs transition-colors ${
        isLive
          ? 'bg-white dark:bg-zinc-900 border-emerald-300/90 dark:border-emerald-700/70'
          : 'bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800'
      }`}
    >
      {/* Visual SVG Street & Radar Map Canvas */}
      <div className="relative h-36 w-full bg-slate-100 dark:bg-zinc-950 overflow-hidden select-none">
        <svg
          viewBox="0 0 360 144"
          className="w-full h-full block"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id={`grid-${message.id}`}
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${shiftX} ${shiftY})`}
            >
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-300/65 dark:text-zinc-800"
              />
            </pattern>
          </defs>

          <rect width="360" height="144" fill={`url(#grid-${message.id})`} />

          {/* Subtle stylized neighborhood roads */}
          <g
            transform={`translate(${shiftX * 0.6} ${shiftY * 0.6})`}
            fill="none"
            strokeLinecap="round"
          >
            <path
              d="M -20 108 Q 105 84 185 72 T 380 34"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white/90 dark:text-zinc-800/90"
            />
            <path
              d="M 64 -15 Q 138 58 180 72 T 292 160"
              stroke="currentColor"
              strokeWidth="4.5"
              className="text-white/80 dark:text-zinc-800/75"
            />
            <path
              d="M -10 32 L 370 118"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-slate-200 dark:text-zinc-800/60"
            />
          </g>

          {/* GPS Accuracy Halo */}
          <circle
            cx="180"
            cy="72"
            r={isLive ? 32 : 22}
            className={
              isLive
                ? 'fill-emerald-500/15 stroke-emerald-500/45'
                : 'fill-zinc-400/15 stroke-zinc-400/35'
            }
            strokeWidth="1.5"
            strokeDasharray={isLive ? 'none' : '4 3'}
          />
        </svg>

        {/* Center Location Pin */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex items-center justify-center">
            {isLive && (
              <span className="absolute w-11 h-11 rounded-full bg-emerald-500/25 animate-ping" />
            )}
            <span
              className={`relative w-9 h-9 rounded-full flex items-center justify-center shadow-md ring-2 ring-white dark:ring-zinc-900 ${
                isLive
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-600 dark:bg-zinc-700 text-white'
              }`}
            >
              {isLive ? (
                <Navigation className="w-4 h-4" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
            </span>
          </div>
        </div>

        {/* Top-Left Live Status Bar */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/70 dark:border-zinc-700/80 inline-flex items-center gap-1.5 text-[11px] font-semibold">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isLive ? 'bg-emerald-500' : 'bg-zinc-400 dark:bg-zinc-500'
            }`}
            aria-hidden="true"
          />
          <span
            className={
              isLive
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-zinc-600 dark:text-zinc-400'
            }
          >
            {isLive
              ? 'Live-posisjon aktiv'
              : liveLocation.stoppedAtIso
                ? 'Deling avsluttet'
                : 'Utløpt (30 min)'}
          </span>
        </div>

        {/* Top-Right Remaining Timer */}
        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-zinc-900/85 text-white backdrop-blur-md inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums">
          <Clock className="w-3 h-3 text-emerald-300 shrink-0" />
          <span>{isLive ? `${mins}:${secs} igjen` : '00:00'}</span>
        </div>
      </div>

      {/* 30-Minute Countdown Progress Bar */}
      {isLive && (
        <div
          className="h-1 w-full bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full bg-emerald-500 transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Details & Action Controls */}
      <div className="p-3.5 space-y-2.5">
        <div>
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">
            {isMine
              ? isLive
                ? `Du deler live-posisjon med ${recipientName}`
                : 'Din live-posisjonsdeling er avsluttet'
              : isLive
                ? `${message.senderName} deler sin live-posisjon`
                : `${message.senderName} delte live-posisjon`}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {coordLabel}
            </span>
            {liveLocation.accuracyMeters !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span>±{liveLocation.accuracyMeters} m</span>
              </>
            )}
            {updatedLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span>Oppdatert {updatedLabel}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyCoords}
            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Kopier koordinater</span>
              </>
            )}
          </button>

          {isLive && isMine && (
            <button
              type="button"
              onClick={() => onStopSharing(message.id)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition whitespace-nowrap shrink-0"
            >
              <Square className="w-3 h-3" fill="currentColor" />
              <span>Avslutt deling</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
