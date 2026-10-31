import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { VERIFICATION_POSES } from '../data/profiles';
import type { CurrentUser } from '../types';
import { VerifiedBadge } from './CommonUI';

interface ProfileVerificationModalProps {
  open: boolean;
  currentUser: CurrentUser;
  onClose: () => void;
  onVerify: (pose: string, selfieDataUrl: string) => Promise<boolean>;
}

export const ProfileVerificationModal: React.FC<
  ProfileVerificationModalProps
> = ({ open, currentUser, onClose, onVerify }) => {
  const [poseIndex, setPoseIndex] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(
    currentUser.selfieDataUrl
  );
  const [submitting, setSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentPose = VERIFICATION_POSES[poseIndex];

  useEffect(() => {
    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    if (!open || !cameraOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setCameraUnavailable(false);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCameraUnavailable(true);
          setCameraOpen(false);
        }
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, cameraOpen]);

  if (!open) return null;

  const captureFromVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedSelfie(dataUrl);
    setCameraOpen(false);
  };

  const generateStudioSelfiePreview = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const grad = ctx.createLinearGradient(0, 0, 480, 600);
    grad.addColorStop(0, '#0284C7');
    grad.addColorStop(1, '#18181B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 600);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${currentUser.name} — Pose bekreftet`, 240, 280);
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#E0F2FE';
    ctx.fillText(currentPose.gestureLabel, 240, 330);
    setCapturedSelfie(canvas.toDataURL('image/jpeg', 0.85));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedSelfie(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmVerification = async () => {
    if (!capturedSelfie) return;
    setSubmitting(true);
    const ok = await onVerify(currentPose.title, capturedSelfie);
    setSubmitting(false);
    if (ok) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl pb-safe transition-colors"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verification-modal-title"
      >
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2
              id="verification-modal-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              Selfie-verifisering
            </h2>
            {currentUser.verified && <VerifiedBadge size="md" />}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
            aria-label="Lukk verifisering"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-7 space-y-5">
          {currentUser.verified && (
            <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">
                  Profilen din er offisielt verifisert
                </p>
                <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                  Det blå verifiseringsmerket vises på din offentlige profil ({currentUser.verificationPose}).
                </p>
              </div>
            </div>
          )}

          {/* Pose Instruction Card */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-800/50">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Oppgave: Match denne posen</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setPoseIndex((i) => (i + 1) % VERIFICATION_POSES.length)
                }
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50 inline-flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Bytt pose</span>
              </button>
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-2">
              {currentPose.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
              {currentPose.instruction}
            </p>
          </div>

          {cameraOpen ? (
            <div className="space-y-3">
              <div className="relative aspect-[3/4] max-h-[360px] mx-auto rounded-3xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-6 rounded-full border-2 border-dashed border-white/60 pointer-events-none" />
                <div className="absolute bottom-3 inset-x-0 text-center">
                  <span className="px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
                    {currentPose.gestureLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCameraOpen(false)}
                  className="flex-1 min-h-[48px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={captureFromVideo}
                  className="flex-[1.5] min-h-[48px] rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 inline-flex items-center justify-center gap-2 transition"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ta selfie nå</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {capturedSelfie && (
                <div className="relative w-44 aspect-[3/4] mx-auto rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={capturedSelfie}
                    alt="Tatt verifiseringsselfie"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {cameraUnavailable && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                  Direktekamera ble avvist eller mangler på enheten. Du kan
                  laste opp en selfie fra kamerarullen eller bruke hurtigtest
                  nedenfor.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-white transition whitespace-nowrap"
                >
                  <Camera className="w-4 h-4" />
                  <span>Åpne selfie-kamera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition whitespace-nowrap"
                >
                  <Upload className="w-4 h-4" />
                  <span>Velg / ta bilde</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {!capturedSelfie && (
                <button
                  type="button"
                  onClick={generateStudioSelfiePreview}
                  className="w-full min-h-[44px] rounded-xl text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                >
                  Ingen kamera tilgjengelig? Generer testsammenligning for pose
                </button>
              )}

              {capturedSelfie && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmVerification}
                  className="w-full min-h-[50px] rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Verifiserer pose...'
                      : 'Bekreft selfie og aktiver blått merke'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
