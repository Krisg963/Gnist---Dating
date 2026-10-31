import React, { useEffect, useRef, useState } from 'react';
import {
  Eye,
  Heart,
  Mic,
  MicOff,
  Pin,
  Radio,
  Send,
  ShieldAlert,
  Trash2,
  Video,
  VideoOff,
  VolumeX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DEFAULT_USER_PHOTOS } from '../data/profiles';
import type { CurrentUser, DatingProfile, LiveStreamRoom } from '../types';
import { SafeImage, VerifiedBadge } from './CommonUI';

interface LiveStreamViewProps {
  streams: LiveStreamRoom[];
  profileMap: Record<string, DatingProfile>;
  currentUser: CurrentUser;
  onStartStream: (title: string, topic: string) => Promise<LiveStreamRoom | null>;
  onStopStream: () => Promise<void>;
  onSendComment: (streamId: string, text: string) => void;
  onSendLike: (streamId: string) => void;
  onModerate: (
    streamId: string,
    action: 'delete' | 'pin' | 'mute',
    target: { commentId?: string; authorId?: string }
  ) => void;
}

interface FloatingHeart {
  id: number;
  offsetX: number;
}

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  streams,
  profileMap,
  currentUser,
  onStartStream,
  onStopStream,
  onSendComment,
  onSendLike,
  onModerate,
}) => {
  const [selectedStreamId, setSelectedStreamId] = useState<string>(
    streams[0]?.id || 'stream-nora'
  );
  const [commentText, setCommentText] = useState('');
  const [showGoLiveModal, setShowGoLiveModal] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState(
    'Kveldsprat fra stua — kom inn og si hei!'
  );
  const [newStreamTopic, setNewStreamTopic] = useState('Åpen prat · Bli kjent');
  const [hostModerationEnabled, setHostModerationEnabled] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);

  // Local WebRTC media state when user hosts a live stream
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [cameraError, setCameraError] = useState(false);

  const activeStream =
    streams.find((s) => s.id === selectedStreamId) || streams[0] || null;

  const isEffectiveModerator = Boolean(
    activeStream?.isUserHost || hostModerationEnabled
  );

  // Manage local WebRTC camera stream when user's own live room is selected
  useEffect(() => {
    const stopTracks = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };

    if (activeStream?.isUserHost && cameraActive) {
      let cancelled = false;
      navigator.mediaDevices
        ?.getUserMedia({ video: { facingMode: 'user' }, audio: true })
        .then((stream) => {
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          mediaStreamRef.current = stream;
          setCameraError(false);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          if (!cancelled) setCameraError(true);
        });

      return () => {
        cancelled = true;
        stopTracks();
      };
    } else {
      stopTracks();
    }
  }, [activeStream?.isUserHost, cameraActive]);

  const toggleMic = () => {
    const next = !micActive;
    setMicActive(next);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  };

  const handleHeartTap = () => {
    if (!activeStream) return;
    onSendLike(activeStream.id);
    const id = Date.now() + Math.random();
    const offsetX = Math.round((Math.random() - 0.5) * 44);
    setFloatingHearts((prev) => [...prev.slice(-8), { id, offsetX }]);
    window.setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== id));
    }, 950);
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStream || !commentText.trim()) return;
    onSendComment(activeStream.id, commentText.trim());
    setCommentText('');
  };

  const handleConfirmGoLive = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await onStartStream(newStreamTitle, newStreamTopic);
    setShowGoLiveModal(false);
    if (created) {
      setSelectedStreamId(created.id);
      setCameraActive(true);
    }
  };

  const hostProfile = activeStream
    ? profileMap[activeStream.hostProfileId]
    : undefined;

  const pinnedComment = activeStream?.pinnedCommentId
    ? activeStream.comments.find(
        (c) => c.id === activeStream.pinnedCommentId && !c.deleted
      )
    : null;

  const visibleComments = activeStream
    ? activeStream.comments.filter((c) => !c.deleted)
    : [];

  const userIsMutedInRoom = activeStream
    ? activeStream.mutedAuthorIds.includes(currentUser.id)
    : false;

  const myLiveRoom = streams.find((s) => s.isUserHost);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      {/* Header & Stream Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Live-strømming
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Møt folk i sanntid gjennom direktesendinger og åpen chat
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {myLiveRoom ? (
            <button
              type="button"
              onClick={async () => {
                await onStopStream();
                const fallback = streams.find((s) => !s.isUserHost);
                if (fallback) setSelectedStreamId(fallback.id);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold inline-flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-white transition whitespace-nowrap shrink-0"
            >
              <VideoOff className="w-4 h-4 text-rose-400 dark:text-rose-600" />
              <span>Avslutt min sending</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGoLiveModal(true)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-rose-700 active:scale-[0.98] transition whitespace-nowrap shrink-0"
            >
              <Radio className="w-4 h-4" />
              <span>Start live-sending</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Active Streams Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-5">
        {streams.map((room) => {
          const roomHost = profileMap[room.hostProfileId];
          const isSelected = activeStream?.id === room.id;

          return (
            <button
              key={room.id}
              type="button"
              onClick={() => setSelectedStreamId(room.id)}
              className={`min-h-[56px] px-3.5 py-2 rounded-2xl border flex items-center gap-3 text-left shrink-0 transition ${
                isSelected
                  ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 hover:bg-white dark:hover:bg-zinc-900'
              }`}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 ring-2 ring-rose-500">
                {room.isUserHost ? (
                  <SafeImage
                    src={
                      (currentUser.photos !== null
                        ? currentUser.photos[0]
                        : DEFAULT_USER_PHOTOS[0]) ||
                      currentUser.selfieDataUrl ||
                      ''
                    }
                    alt={room.hostName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <SafeImage
                    src={roomHost?.image || ''}
                    alt={room.hostName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                    {room.hostName}
                    {room.isUserHost ? ' (Deg)' : ''}
                  </span>
                  {room.hostVerified && <VerifiedBadge size="sm" />}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                  Direkte · {room.viewerCount} ser nå
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Live Stage + Real-time Chat Split */}
      {activeStream && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left: Video Area */}
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden bg-zinc-950 aspect-[4/5] sm:aspect-[16/11] lg:aspect-auto lg:min-h-[560px] flex flex-col justify-between border border-zinc-900">
            {activeStream.isUserHost ? (
              cameraActive && !cameraError ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-rose-950/60 text-white p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-3 text-2xl font-display font-bold">
                    {currentUser.name.charAt(0)}
                  </div>
                  <p className="text-base font-semibold">
                    {cameraError
                      ? 'Kamera er ikke tilgjengelig i forhåndsvisningen — lyd/studio-modus aktiv'
                      : 'Kamera er skrudd av'}
                  </p>
                  <p className="text-xs text-white/70 mt-1 max-w-xs">
                    Sendingen din er aktiv og chatten oppdateres i sanntid for alle seere.
                  </p>
                </div>
              )
            ) : (
              <motion.div
                key={activeStream.id}
                initial={{ opacity: 0.85, scale: 1 }}
                animate={{ opacity: 1, scale: 1.03 }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }}
                className="absolute inset-0"
              >
                <SafeImage
                  src={hostProfile?.image || ''}
                  alt={activeStream.hostName}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}

            {/* Measured Video Scrims */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/85 pointer-events-none" />

            {/* Top Video Overlay */}
            <div className="relative z-10 p-4 sm:p-5 flex items-start justify-between gap-3 text-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-rose-600 text-[11px] font-bold tracking-wide text-white whitespace-nowrap">
                    DIREKTE
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white/90 tabular-nums whitespace-nowrap">
                    <Eye className="w-3.5 h-3.5" />
                    {activeStream.viewerCount} seere
                  </span>
                </div>
                <h2 className="mt-2 text-lg sm:text-xl font-bold leading-snug text-balance">
                  {activeStream.title}
                </h2>
                <p className="text-xs text-white/80 mt-0.5">
                  {activeStream.hostName}, {activeStream.hostAge} ·{' '}
                  {activeStream.hostCity} · {activeStream.topic}
                </p>
              </div>

              {/* Host Camera/Mic Controls when User is Broadcasting */}
              {activeStream.isUserHost && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCameraActive((v) => !v)}
                    className="min-h-[44px] min-w-[44px] rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition"
                    aria-label={cameraActive ? 'Skru av kamera' : 'Skru på kamera'}
                  >
                    {cameraActive ? (
                      <Video className="w-4 h-4" />
                    ) : (
                      <VideoOff className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleMic}
                    className="min-h-[44px] min-w-[44px] rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/70 transition"
                    aria-label={micActive ? 'Demp mikrofon' : 'Aktiver mikrofon'}
                  >
                    {micActive ? (
                      <Mic className="w-4 h-4" />
                    ) : (
                      <MicOff className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Video Overlay: Pinned Message + Floating Hearts Button */}
            <div className="relative z-10 p-4 sm:p-5 flex items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                {pinnedComment && (
                  <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/15 px-3.5 py-2.5 text-white max-w-md">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-300">
                      <Pin className="w-3 h-3" />
                      <span>Festet av vert · {pinnedComment.authorName}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-white/95 mt-0.5 leading-snug">
                      {pinnedComment.text}
                    </p>
                  </div>
                )}
              </div>

              {/* Floating Hearts + Like Action */}
              <div className="relative flex flex-col items-center shrink-0">
                <div className="pointer-events-none absolute bottom-16 inset-x-0 flex justify-center">
                  <AnimatePresence>
                    {floatingHearts.map((h) => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 1, y: 0, x: h.offsetX, scale: 0.85 }}
                        animate={{ opacity: 0, y: -115, x: h.offsetX, scale: 1.25 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                        className="absolute text-rose-500"
                      >
                        <Heart className="w-6 h-6" fill="currentColor" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <button
                  type="button"
                  onClick={handleHeartTap}
                  className="min-h-[52px] min-w-[52px] rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg hover:bg-rose-500 active:scale-90 transition"
                  aria-label="Send hjerte til direktesendingen"
                >
                  <Heart className="w-6 h-6" fill="currentColor" />
                </button>
                <span className="mt-1.5 text-xs font-semibold text-white tabular-nums">
                  {activeStream.likesCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Real-time Chat & Host Moderation Panel */}
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col h-[460px] lg:h-[560px] shadow-xs overflow-hidden">
            {/* Chat Header + Moderator Switch */}
            <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Direktechat
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {activeStream.isUserHost
                    ? 'Du er vert — modereringsverktøy er aktive'
                    : isEffectiveModerator
                      ? 'Moderator-visning aktivert'
                      : 'Sanntidsmeldinger i strømmen'}
                </p>
              </div>

              {!activeStream.isUserHost && (
                <button
                  type="button"
                  onClick={() => setHostModerationEnabled((v) => !v)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition whitespace-nowrap shrink-0 ${
                    hostModerationEnabled
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Moderering</span>
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {visibleComments.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">
                  Ingen kommentarer ennå. Vær den første til å hilse!
                </p>
              ) : (
                visibleComments.map((comment) => {
                  const isPinned = activeStream.pinnedCommentId === comment.id;
                  const isAuthorMuted = activeStream.mutedAuthorIds.includes(
                    comment.authorId
                  );

                  return (
                    <div
                      key={comment.id}
                      className={`rounded-2xl p-3 transition ${
                        isPinned
                          ? 'bg-rose-50/70 dark:bg-rose-950/35 border border-rose-100 dark:border-rose-900/60'
                          : 'bg-zinc-50 dark:bg-zinc-800/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {comment.authorName}
                          </span>
                          {comment.authorVerified && <VerifiedBadge size="sm" />}
                          {isAuthorMuted && (
                            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                              · Dempet
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                          {comment.createdAt}
                        </span>
                      </div>

                      <p className="text-sm text-zinc-700 dark:text-zinc-200 mt-1 leading-snug break-words">
                        {comment.text}
                      </p>

                      {/* Host Moderation Controls */}
                      {isEffectiveModerator && (
                        <div className="mt-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-700/80 flex items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              onModerate(activeStream.id, 'pin', {
                                commentId: comment.id,
                              })
                            }
                            className="min-h-[32px] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white font-medium inline-flex items-center gap-1"
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>{isPinned ? 'Løsne' : 'Fest'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onModerate(activeStream.id, 'delete', {
                                commentId: comment.id,
                              })
                            }
                            className="min-h-[32px] text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Slett</span>
                          </button>

                          {comment.authorId !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() =>
                                onModerate(activeStream.id, 'mute', {
                                  authorId: comment.authorId,
                                })
                              }
                              className="min-h-[32px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium inline-flex items-center gap-1"
                            >
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>{isAuthorMuted ? 'Opphev demping' : 'Demp'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Composer */}
            <form
              onSubmit={handleCommentSubmit}
              className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                disabled={userIsMutedInRoom}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={
                  userIsMutedInRoom
                    ? 'Du er dempet i denne chatten'
                    : 'Skriv en kommentar i sanntid...'
                }
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-900 dark:focus:border-zinc-300"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || userIsMutedInRoom}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-white disabled:opacity-35 transition shrink-0"
                aria-label="Send kommentar"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Go Live Modal */}
      {showGoLiveModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setShowGoLiveModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl pb-safe"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Start egen live-sending
              </h2>
              <button
                type="button"
                onClick={() => setShowGoLiveModal(false)}
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center text-zinc-400 hover:text-zinc-800 dark:hover:text-white"
                aria-label="Lukk"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGoLive} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Tittel på sendingen
                </label>
                <input
                  type="text"
                  required
                  value={newStreamTitle}
                  onChange={(e) => setNewStreamTitle(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Tema
                </label>
                <input
                  type="text"
                  required
                  value={newStreamTopic}
                  onChange={(e) => setNewStreamTopic(e.target.value)}
                  className="w-full min-h-[46px] px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
                />
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Som vert kan du feste hyggelige meldinger, slette uønskede kommentarer
                og dempe brukere direkte i sanntidschatten.
              </p>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition"
              >
                Gå direkte nå
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
