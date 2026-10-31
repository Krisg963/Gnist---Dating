import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Mic,
  RefreshCw,
  RotateCcw,
  Square,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface VideoIntroRecorderModalProps {
  open: boolean;
  existingVideoUrl: string | null;
  existingPrompt: string | null;
  onClose: () => void;
  onSaveVideo: (payload: {
    videoIntroUrl: string | null;
    videoIntroDurationSec: number | null;
    videoIntroPrompt: string | null;
  }) => Promise<boolean>;
}

const MAX_DURATION_SEC = 15;

const INTRO_PROMPTS = [
  'Fri introduksjon — si hei med egne ord',
  'En perfekt søndag for meg ser slik ut...',
  'Tre ting som alltid får meg i godt humør',
  'Dette foreslår jeg gjerne på en første date',
] as const;

function getSupportedRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunne ikke lese videoopptak'));
    reader.onloadend = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export const VideoIntroRecorderModal: React.FC<
  VideoIntroRecorderModalProps
> = ({ open, existingVideoUrl, existingPrompt, onClose, onSaveVideo }) => {
  const [selectedPrompt, setSelectedPrompt] = useState<string>(
    existingPrompt || INTRO_PROMPTS[0]
  );
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [streamReady, setStreamReady] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  const [recordedDataUrl, setRecordedDataUrl] = useState<string | null>(null);
  const [recordedDurationSec, setRecordedDurationSec] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartMsRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopMediaEverything = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    recorderRef.current = null;

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setStreamReady(false);
    setMicLevel(0);
  }, []);

  const initCameraAndMic = useCallback(
    async (mode: 'user' | 'environment') => {
      stopMediaEverything();
      setPermissionError(null);
      setUploadError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionError(
          'Nettleseren din støtter ikke direkte kamera- og mikrofonopptak her. Du kan også velge et kort videoklipp fra enheten din.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 720 },
            height: { ideal: 960 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        mediaStreamRef.current = stream;
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
        }
        setStreamReady(true);

        // Live microphone meter using Web Audio API
        try {
          const AudioContextClass =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (AudioContextClass && stream.getAudioTracks().length > 0) {
            const ctx = new AudioContextClass();
            audioCtxRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const tick = () => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i += 1) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setMicLevel(Math.min(100, Math.round((avg / 90) * 100)));
              rafRef.current = window.requestAnimationFrame(tick);
            };
            rafRef.current = window.requestAnimationFrame(tick);
          }
        } catch {
          // Audio meter is optional enhancement
        }
      } catch {
        setPermissionError(
          'Kunne ikke åpne kamera og mikrofon. Kontroller at nettleseren har tillatelse til kamera og mikrofon, eller last opp en kort video på maks 15 sekunder.'
        );
      }
    },
    [stopMediaEverything]
  );

  useEffect(() => {
    if (open) {
      setSelectedPrompt(existingPrompt || INTRO_PROMPTS[0]);
      setRecordedDataUrl(null);
      setRecordedDurationSec(0);
      setElapsedSec(0);
      void initCameraAndMic(facingMode);
    } else {
      stopMediaEverything();
    }

    return () => {
      stopMediaEverything();
    };
  }, [open, existingPrompt, facingMode, initCameraAndMic, stopMediaEverything]);

  // Re-attach stream if liveVideoRef mounts after recordedDataUrl is cleared
  useEffect(() => {
    if (!recordedDataUrl && liveVideoRef.current && mediaStreamRef.current) {
      liveVideoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [recordedDataUrl, streamReady]);

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const startRecording = () => {
    const stream = mediaStreamRef.current;
    if (!stream || typeof MediaRecorder === 'undefined') return;

    chunksRef.current = [];
    setUploadError(null);
    setElapsedSec(0);
    recordStartMsRef.current = Date.now();

    const mimeType = getSupportedRecorderMimeType();
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: 650_000,
      audioBitsPerSecond: 64_000,
    };
    if (mimeType) {
      options.mimeType = mimeType;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, options);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = (evt) => {
      if (evt.data && evt.data.size > 0) {
        chunksRef.current.push(evt.data);
      }
    };

    recorder.onstop = async () => {
      const duration = Math.min(
        MAX_DURATION_SEC,
        Math.max(1, Math.round((Date.now() - recordStartMsRef.current) / 1000))
      );
      const finalType = recorder.mimeType || mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: finalType });
      try {
        const dataUrl = await blobToDataUrl(blob);
        setRecordedDataUrl(dataUrl);
        setRecordedDurationSec(duration);
      } catch {
        setUploadError('Kunne ikke klargjøre opptaket. Prøv gjerne igjen.');
      }
    };

    recorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);

    timerIntervalRef.current = window.setInterval(() => {
      const sec = (Date.now() - recordStartMsRef.current) / 1000;
      if (sec >= MAX_DURATION_SEC) {
        setElapsedSec(MAX_DURATION_SEC);
        stopRecording();
      } else {
        setElapsedSec(sec);
      }
    }, 100);
  };

  const handleRetake = () => {
    setRecordedDataUrl(null);
    setRecordedDurationSec(0);
    setElapsedSec(0);
    if (!mediaStreamRef.current) {
      void initCameraAndMic(facingMode);
    }
  };

  const handleSwitchCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
  };

  const handleFileFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > 16 * 1024 * 1024) {
      setUploadError(
        'Videofilen er for stor (maks 16 MB). Spill inn direkte eller velg et kortere klipp.'
      );
      e.target.value = '';
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    const probeVideo = document.createElement('video');
    probeVideo.preload = 'metadata';
    probeVideo.onloadedmetadata = async () => {
      const rawDuration = probeVideo.duration;
      URL.revokeObjectURL(tempUrl);

      if (Number.isFinite(rawDuration) && rawDuration > 16.2) {
        setUploadError(
          `Videoen er ${Math.round(rawDuration)} sekunder lang. Velg eller spill inn en video på maks 15 sekunder.`
        );
        return;
      }

      try {
        const dataUrl = await blobToDataUrl(file);
        setRecordedDataUrl(dataUrl);
        setRecordedDurationSec(
          Number.isFinite(rawDuration)
            ? Math.min(15, Math.max(1, Math.round(rawDuration)))
            : 15
        );
      } catch {
        setUploadError('Kunne ikke lese videofilen.');
      }
    };
    probeVideo.onerror = () => {
      URL.revokeObjectURL(tempUrl);
      setUploadError('Ugyldig videoformat. Prøv MP4 eller WebM.');
    };
    probeVideo.src = tempUrl;
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!recordedDataUrl) return;
    setSaving(true);
    const promptToSave =
      selectedPrompt === INTRO_PROMPTS[0] ? null : selectedPrompt.trim();
    const ok = await onSaveVideo({
      videoIntroUrl: recordedDataUrl,
      videoIntroDurationSec: recordedDurationSec || MAX_DURATION_SEC,
      videoIntroPrompt: promptToSave,
    });
    setSaving(false);
    if (ok) {
      onClose();
    }
  };

  const progressRatio = Math.min(1, elapsedSec / MAX_DURATION_SEC);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs sm:p-4"
          onClick={() => {
            if (!isRecording) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 22, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-intro-modal-title"
            className="w-full sm:max-w-lg max-h-[94vh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-zinc-200"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between gap-3 shrink-0">
              <div>
                <h2
                  id="video-intro-modal-title"
                  className="text-base sm:text-lg font-bold text-zinc-900"
                >
                  15-sekunders video-introduksjon
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Vis stemmen og energien din med kamera og mikrofon
                </p>
              </div>

              <button
                type="button"
                disabled={isRecording}
                onClick={onClose}
                className="min-h-[42px] min-w-[42px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-900 disabled:opacity-40 rounded-full"
                aria-label="Lukk videoopptaker"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {/* Optional Topic Prompt Selector */}
              <div>
                <label
                  htmlFor="video-intro-prompt"
                  className="block text-xs font-semibold text-zinc-700 mb-1.5"
                >
                  Velg tema for introduksjonen
                </label>
                <select
                  id="video-intro-prompt"
                  disabled={isRecording}
                  value={selectedPrompt}
                  onChange={(e) => setSelectedPrompt(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs sm:text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  {INTRO_PROMPTS.map((prompt) => (
                    <option key={prompt} value={prompt}>
                      {prompt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera / Playback Stage */}
              <div className="relative aspect-[3/4] max-h-[390px] w-full mx-auto rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center">
                {recordedDataUrl ? (
                  <video
                    key="recorded-preview"
                    src={recordedDataUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : permissionError ? (
                  <div className="p-6 text-center text-white space-y-3 max-w-xs">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6 text-rose-400" />
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                      {permissionError}
                    </p>
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void initCameraAndMic(facingMode)}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-white text-zinc-900 text-xs font-semibold hover:bg-zinc-100 inline-flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Prøv kamera og mikrofon på nytt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-white/15 text-white text-xs font-semibold hover:bg-white/25 inline-flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Last opp video (maks 15 sek)</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={liveVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        facingMode === 'user' ? '-scale-x-100' : ''
                      }`}
                    />

                    {/* Top Overlay: Timer + Flip Camera */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-black/55 backdrop-blur-md text-white text-xs font-semibold tabular-nums inline-flex items-center gap-2">
                        {isRecording && (
                          <span
                            className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"
                            aria-hidden="true"
                          />
                        )}
                        <span>
                          {Math.floor(elapsedSec).toString().padStart(2, '0')}s
                          {' / '}15s
                        </span>
                      </div>

                      {!isRecording && streamReady && (
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-black/55 backdrop-blur-md text-white text-xs font-medium hover:bg-black/75 inline-flex items-center gap-1.5 transition"
                          aria-label="Bytt kamera"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Snu kamera</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Overlay: Live Microphone Level + Recording Progress Bar */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/80 via-black/35 to-transparent text-white space-y-2.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-white/90">
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Mikrofon aktiv</span>
                        </span>
                        <div
                          className="w-24 h-1.5 rounded-full bg-white/25 overflow-hidden"
                          aria-label="Lydnivå mikrofon"
                        >
                          <div
                            style={{
                              transform: `scaleX(${Math.max(0.08, micLevel / 100)})`,
                              transformOrigin: 'left',
                            }}
                            className="h-full w-full bg-emerald-400 transition-transform duration-75"
                          />
                        </div>
                      </div>

                      {/* 15s Countdown Progress Track */}
                      <div className="h-1.5 w-full rounded-full bg-white/25 overflow-hidden">
                        <div
                          style={{
                            transform: `scaleX(${progressRatio})`,
                            transformOrigin: 'left',
                          }}
                          className="h-full w-full bg-rose-500 transition-transform duration-100"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {uploadError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
                >
                  {uploadError}
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                onChange={handleFileFallback}
                className="hidden"
              />

              {/* Secondary File Upload Escape Hatch when not recording */}
              {!recordedDataUrl && !permissionError && !isRecording && (
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-0.5">
                  <span>
                    {existingVideoUrl
                      ? 'Nytt opptak erstatter nåværende video-intro.'
                      : 'Opptaket stopper automatisk etter 15 sekunder.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-semibold text-zinc-700 hover:text-zinc-900 underline underline-offset-2 whitespace-nowrap ml-2"
                  >
                    Eller velg videofil
                  </button>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="p-4 sm:px-5 sm:py-4 border-t border-zinc-100 bg-white flex items-center gap-2.5 shrink-0 pb-safe">
              {recordedDataUrl ? (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleRetake}
                    className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 text-sm font-semibold hover:bg-zinc-50 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Spill inn på nytt</span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSave}
                    className="flex-[1.35] min-h-[48px] px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {saving
                        ? 'Lagrer video...'
                        : `Lagre på profil (${recordedDurationSec}s)`}
                    </span>
                  </button>
                </>
              ) : isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                >
                  <Square className="w-4 h-4 text-rose-500" fill="currentColor" />
                  <span className="tabular-nums">
                    Stopp opptak ({Math.max(1, Math.ceil(elapsedSec))}s / 15s)
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[48px] px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-sm font-semibold hover:bg-zinc-50 transition whitespace-nowrap"
                  >
                    Avbryt
                  </button>

                  <button
                    type="button"
                    disabled={!streamReady}
                    onClick={startRecording}
                    className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-45 inline-flex items-center justify-center gap-2 transition whitespace-nowrap"
                  >
                    <Video className="w-4 h-4" />
                    <span>Start 15-sekunders opptak</span>
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
