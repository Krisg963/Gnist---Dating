import React, { useCallback, useMemo, useState } from 'react';
import {
  Ban,
  Bell,
  Compass,
  Flame,
  Heart,
  MessageCircle,
  Radio,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { BlockUserModal } from './components/BlockUserModal';
import {
  OfflineIndicator,
  PWAInstallControl,
  SafeImage,
  VerifiedBadge,
} from './components/CommonUI';
import { DiscoverView } from './components/DiscoverView';
import { LikesYouView } from './components/LikesYouView';
import { LiveStreamView } from './components/LiveStreamView';
import { MatchModal } from './components/MatchModal';
import { MessagesView } from './components/MessagesView';
import { MyProfileView } from './components/MyProfileView';
import { ProfileDetailModal } from './components/ProfileDetailModal';
import { ProfileVerificationModal } from './components/ProfileVerificationModal';
import { SwipeView } from './components/SwipeView';
import { VideoIntroRecorderModal } from './components/VideoIntroRecorderModal';
import { DEFAULT_USER_PHOTOS, PROFILE_MAP, PROFILES } from './data/profiles';
import { usePWAInstall } from './hooks/usePWAInstall';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useRealtimeApp } from './hooks/useRealtimeApp';
import type { DatingProfile, NavTab } from './types';

const TAB_ORDER: Record<NavTab, number> = {
  discover: 0,
  swipe: 1,
  likes: 2,
  live: 3,
  messages: 4,
  profile: 5,
};

const tabTransitionVariants: Variants = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir === 0 ? 0 : dir > 0 ? 18 : -18,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.18,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir === 0 ? 0 : dir > 0 ? -18 : 18,
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export default function App() {
  const {
    serverState,
    celebratingMatch,
    setCelebratingMatch,
    activePushToast,
    setActivePushToast,
    swipeProfile,
    rewindSwipe,
    markMatchRead,
    sendMessage,
    verifyProfile,
    updateProfile,
    saveVideoIntro,
    startMyStream,
    stopMyStream,
    sendStreamComment,
    sendStreamLike,
    moderateStream,
    blockUser,
    unblockUser,
  } = useRealtimeApp();

  const { isInstallable, isIOS, isInstalled } = usePWAInstall();
  const prefersReducedMotion = Boolean(useReducedMotion());

  const [activeTab, setActiveTab] = useState<NavTab>('discover');
  const [tabDirection, setTabDirection] = useState<number>(0);
  const [selectedProfile, setSelectedProfile] = useState<DatingProfile | null>(
    null
  );
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    'match-ingrid'
  );
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [videoIntroModalOpen, setVideoIntroModalOpen] = useState(false);
  const [blockTargetProfile, setBlockTargetProfile] =
    useState<DatingProfile | null>(null);
  const [blockedFeedback, setBlockedFeedback] = useState<{
    profileId: string;
    name: string;
  } | null>(null);

  const navigateToTab = useCallback(
    (nextTab: NavTab) => {
      setActiveTab((prev) => {
        if (prev === nextTab) return prev;
        const delta = TAB_ORDER[nextTab] - TAB_ORDER[prev];
        setTabDirection(prefersReducedMotion ? 0 : delta > 0 ? 1 : -1);
        return nextTab;
      });
    },
    [prefersReducedMotion]
  );

  const handleOpenChat = useCallback(
    (matchId: string) => {
      setSelectedMatchId(matchId);
      setCelebratingMatch(null);
      setActivePushToast(null);
      markMatchRead(matchId);
      navigateToTab('messages');
    },
    [markMatchRead, navigateToTab, setActivePushToast, setCelebratingMatch]
  );

  const handlePushClickNavigate = useCallback(
    (target: { tab: string; matchId: string | null }) => {
      if (target.matchId) {
        handleOpenChat(target.matchId);
      } else if (
        target.tab === 'discover' ||
        target.tab === 'swipe' ||
        target.tab === 'likes' ||
        target.tab === 'live' ||
        target.tab === 'messages' ||
        target.tab === 'profile'
      ) {
        navigateToTab(target.tab);
      }
    },
    [handleOpenChat, navigateToTab]
  );

  const pushState = usePushNotifications(handlePushClickNavigate);

  const blockedIdSet = useMemo(
    () => new Set(serverState.blockedUsers.map((b) => b.profileId)),
    [serverState.blockedUsers]
  );

  const visibleProfiles = useMemo(
    () => PROFILES.filter((p) => !blockedIdSet.has(p.id)),
    [blockedIdSet]
  );

  const deckProfiles = useMemo(() => {
    const seen = new Set([
      ...serverState.swipedRightIds,
      ...serverState.swipedLeftIds,
    ]);
    return visibleProfiles.filter((p) => !seen.has(p.id));
  }, [
    visibleProfiles,
    serverState.swipedRightIds,
    serverState.swipedLeftIds,
  ]);

  const visibleLikesReceived = useMemo(
    () =>
      serverState.likesReceived.filter((l) => !blockedIdSet.has(l.profileId)),
    [serverState.likesReceived, blockedIdSet]
  );

  const visibleMatches = useMemo(
    () => serverState.matches.filter((m) => !blockedIdSet.has(m.profileId)),
    [serverState.matches, blockedIdSet]
  );

  const visibleStreams = useMemo(
    () =>
      serverState.streams
        .filter((s) => !blockedIdSet.has(s.hostProfileId))
        .map((s) => ({
          ...s,
          comments: s.comments.filter((c) => !blockedIdSet.has(c.authorId)),
        })),
    [serverState.streams, blockedIdSet]
  );

  const visibleSwipeHistory = useMemo(
    () =>
      serverState.swipeHistory
        .filter((entry) => !blockedIdSet.has(entry.profileId))
        .slice(0, 10),
    [serverState.swipeHistory, blockedIdSet]
  );

  const handleConfirmBlock = useCallback(
    async (profile: DatingProfile, reason: string) => {
      setBlockTargetProfile(null);
      if (selectedProfile?.id === profile.id) {
        setSelectedProfile(null);
      }

      // If the currently open conversation belongs to the blocked user, switch cleanly
      const remainingMatches = visibleMatches.filter(
        (m) => m.profileId !== profile.id
      );
      const currentSelectedMatch = visibleMatches.find(
        (m) => m.id === selectedMatchId
      );
      if (currentSelectedMatch?.profileId === profile.id) {
        setSelectedMatchId(remainingMatches[0]?.id || null);
      }

      await blockUser(profile.id, reason);
      setBlockedFeedback({ profileId: profile.id, name: profile.name });
    },
    [blockUser, selectedMatchId, selectedProfile?.id, visibleMatches]
  );

  const canRewind =
    serverState.swipedRightIds.length > 1 ||
    serverState.swipedLeftIds.length > 0;

  const totalUnreadMessages = useMemo(
    () => visibleMatches.reduce((acc, m) => acc + (m.unreadCount || 0), 0),
    [visibleMatches]
  );

  const likesCount = visibleLikesReceived.length;

  const userAvatar =
    (serverState.currentUser.photos !== null
      ? serverState.currentUser.photos[0]
      : DEFAULT_USER_PHOTOS[0]) || serverState.currentUser.selfieDataUrl;

  const handleSendMatchIcebreaker = (matchId: string, text: string) => {
    sendMessage(matchId, text, true);
    setCelebratingMatch(null);
    setSelectedMatchId(matchId);
    markMatchRead(matchId);
    navigateToTab('messages');
  };

  // Determine whether incoming toast should display based on user's push channel toggles
  const shouldShowPushToast = Boolean(
    activePushToast &&
      !celebratingMatch &&
      ((activePushToast.kind === 'match' && pushState.notifyMatches) ||
        (activePushToast.kind === 'message' && pushState.notifyMessages))
  );

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badgeCount?: number;
  }> = [
    { id: 'discover', label: 'Utforsk', icon: Compass },
    { id: 'swipe', label: 'Sveip', icon: Flame },
    {
      id: 'likes',
      label: 'Likte deg',
      icon: Heart,
      badgeCount: likesCount,
    },
    { id: 'live', label: 'Live', icon: Radio },
    {
      id: 'messages',
      label: 'Meldinger',
      icon: MessageCircle,
      badgeCount: totalUnreadMessages,
    },
  ];

  const selectedProfileMatch = selectedProfile
    ? visibleMatches.find((m) => m.profileId === selectedProfile.id)
    : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 pb-16 lg:pb-0 overflow-x-clip">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 h-13 lg:h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8 pt-safe">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#utforsk"
          onClick={(e) => {
            e.preventDefault();
            navigateToTab('discover');
          }}
          className="font-display text-xl font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
        >
          Gnist
        </a>

        {/* Zone 2: 5 Concise Single-Line Desktop Navigation Links with Framer Motion Sliding Underline */}
        <nav
          aria-label="Hovedmeny"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-600 h-full"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToTab(item.id)}
                className={`relative h-full min-h-[44px] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-zinc-900 font-semibold'
                    : 'hover:text-zinc-900'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                  <span className="text-xs font-semibold text-rose-600 tabular-nums">
                    ({item.badgeCount})
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="desktop-nav-underline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-rose-600 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Single Primary Action (My Profile Page) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => navigateToTab('profile')}
            className={`min-h-[40px] lg:min-h-[42px] pl-2 pr-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition whitespace-nowrap shrink-0 ${
              activeTab === 'profile'
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <span className="w-6 h-6 rounded-full overflow-hidden bg-zinc-200 flex items-center justify-center shrink-0">
              {userAvatar ? (
                <SafeImage
                  src={userAvatar}
                  alt={serverState.currentUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-3.5 h-3.5 text-zinc-600" />
              )}
            </span>
            <span>{serverState.currentUser.name}</span>
            {serverState.currentUser.verified && <VerifiedBadge size="sm" />}
          </button>
        </div>
      </header>

      {/* Animated Real-Time Push Notification Banner (In-App + Web Push Companion) */}
      <AnimatePresence>
        {shouldShowPushToast && activePushToast && (
          <motion.div
            key={activePushToast.id}
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 rounded-2xl bg-zinc-900 text-white p-4 shadow-xl border border-white/10 flex items-start gap-3"
            role="status"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              {activePushToast.kind === 'match' ? (
                <Heart className="w-4 h-4" fill="currentColor" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>

            <button
              type="button"
              onClick={() => handlePushClickNavigate(activePushToast.data)}
              className="flex-1 text-left min-w-0"
            >
              <p className="text-sm font-bold text-white truncate">
                {activePushToast.title}
              </p>
              <p className="text-xs text-zinc-300 mt-0.5 line-clamp-2 leading-snug">
                {activePushToast.body}
              </p>
              <span className="inline-block mt-1.5 text-[11px] font-semibold text-rose-300">
                Trykk for å åpne samtale →
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActivePushToast(null)}
              className="min-h-[36px] min-w-[36px] -mr-1 -mt-1 flex items-center justify-center text-zinc-400 hover:text-white"
              aria-label="Lukk varsel"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Block User Confirmation Toast with Undo */}
      <AnimatePresence>
        {blockedFeedback && (
          <motion.div
            key={blockedFeedback.profileId}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-40 rounded-2xl bg-zinc-900 text-white px-4 py-3.5 shadow-xl border border-white/10 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <p className="text-xs sm:text-sm text-white truncate">
                <strong>{blockedFeedback.name}</strong> er blokkert og fjernet fra matchene dine.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  void unblockUser(blockedFeedback.profileId);
                  setBlockedFeedback(null);
                }}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition whitespace-nowrap"
              >
                Angre
              </button>
              <button
                type="button"
                onClick={() => setBlockedFeedback(null)}
                className="min-h-[34px] min-w-[34px] flex items-center justify-center text-zinc-400 hover:text-white"
                aria-label="Lukk melding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-sticky In-App PWA Install Strip when Installable */}
      {!isInstalled && (isInstallable || isIOS) && activeTab === 'discover' && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Få Gnist som app på hjemskjermen din
              </p>
              <p className="text-xs text-zinc-500">
                Optimalisert for Android med fullskjermsvisning, push-varsler og rask tilgang uten nettleserfelt.
              </p>
            </div>
            <PWAInstallControl compact />
          </div>
        </div>
      )}

      {/* Framer Motion Directional Tab Content Workspace */}
      <main className="flex-1 w-full">
        <AnimatePresence mode="wait" custom={tabDirection} initial={false}>
          <motion.div
            key={activeTab}
            custom={tabDirection}
            variants={tabTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {activeTab === 'discover' && (
              <DiscoverView
                profiles={visibleProfiles}
                matches={visibleMatches}
                swipedRightIds={serverState.swipedRightIds}
                onSelectProfile={(p) => setSelectedProfile(p)}
                onQuickLike={(profileId) => swipeProfile(profileId, 'right')}
                onOpenChat={handleOpenChat}
              />
            )}

            {activeTab === 'swipe' && (
              <SwipeView
                deckProfiles={deckProfiles}
                canRewind={canRewind}
                likesYouCount={likesCount}
                onSwipe={(profileId, dir) => swipeProfile(profileId, dir)}
                onRewind={rewindSwipe}
                onSelectProfile={(p) => setSelectedProfile(p)}
                onGoToLikes={() => navigateToTab('likes')}
                onGoToDiscover={() => navigateToTab('discover')}
              />
            )}

            {activeTab === 'likes' && (
              <LikesYouView
                likesReceived={visibleLikesReceived}
                profileMap={PROFILE_MAP}
                onMatchBack={(profileId) => swipeProfile(profileId, 'right')}
                onDismissLike={(profileId) => swipeProfile(profileId, 'left')}
                onSelectProfile={(p) => setSelectedProfile(p)}
                onGoToMessages={() => navigateToTab('messages')}
                onGoToSwipe={() => navigateToTab('swipe')}
              />
            )}

            {activeTab === 'live' && (
              <LiveStreamView
                streams={visibleStreams}
                profileMap={PROFILE_MAP}
                currentUser={serverState.currentUser}
                onStartStream={startMyStream}
                onStopStream={stopMyStream}
                onSendComment={sendStreamComment}
                onSendLike={sendStreamLike}
                onModerate={moderateStream}
              />
            )}

            {activeTab === 'messages' && (
              <MessagesView
                matches={visibleMatches}
                messagesByMatch={serverState.messagesByMatch}
                profileMap={PROFILE_MAP}
                currentUser={serverState.currentUser}
                selectedMatchId={selectedMatchId}
                onSelectMatch={(matchId) => {
                  setSelectedMatchId(matchId);
                  if (matchId) markMatchRead(matchId);
                }}
                onSendMessage={sendMessage}
                onSelectProfile={(p) => setSelectedProfile(p)}
                onRequestBlockUser={(p) => setBlockTargetProfile(p)}
                onGoToSwipe={() => navigateToTab('swipe')}
              />
            )}

            {activeTab === 'profile' && (
              <MyProfileView
                currentUser={serverState.currentUser}
                swipeStats={serverState.swipeStats}
                swipeHistory={visibleSwipeHistory}
                matchesCount={visibleMatches.length}
                blockedUsers={serverState.blockedUsers}
                profileMap={PROFILE_MAP}
                pushControls={{
                  isSubscribed: pushState.isSubscribed,
                  inAppFallbackActive: pushState.inAppFallbackActive,
                  notifyMatches: pushState.notifyMatches,
                  notifyMessages: pushState.notifyMessages,
                  busy: pushState.busy,
                  statusNote: pushState.statusNote,
                  onSubscribe: pushState.subscribeToPush,
                  onUnsubscribe: pushState.unsubscribeFromPush,
                  onUpdatePreferences: pushState.updatePreferences,
                  onSendTestPush: pushState.sendTestPush,
                }}
                onSaveProfile={updateProfile}
                onUnblockUser={unblockUser}
                onSelectHistoryProfile={(p) => setSelectedProfile(p)}
                onOpenVideoIntroModal={() => setVideoIntroModalOpen(true)}
                onDeleteVideoIntro={() =>
                  saveVideoIntro({
                    videoIntroUrl: null,
                    videoIntroDurationSec: null,
                    videoIntroPrompt: null,
                  })
                }
                onOpenVerificationModal={() => setVerificationModalOpen(true)}
                onPreviewPublicModal={(pubProfile) =>
                  setSelectedProfile(pubProfile)
                }
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Fixed Mobile Bottom Navigation Bar with Framer Motion Sliding Active Indicator */}
      <nav
        aria-label="Mobilmeny"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={`mob-${item.id}`}
                type="button"
                onClick={() => navigateToTab(item.id)}
                className={`relative h-full min-h-[44px] flex flex-col items-center justify-center transition-colors ${
                  isActive
                    ? 'text-rose-600'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-indicator"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute top-0 w-8 h-0.5 bg-rose-600 rounded-full"
                  />
                )}
                <div className="relative">
                  <Icon className="w-[21px] h-[21px]" />
                  {typeof item.badgeCount === 'number' &&
                    item.badgeCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                        {item.badgeCount}
                      </span>
                    )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-1 whitespace-nowrap">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Modals & Sheets */}
      <ProfileDetailModal
        profile={selectedProfile}
        match={selectedProfileMatch}
        alreadyLiked={
          selectedProfile
            ? serverState.swipedRightIds.includes(selectedProfile.id)
            : false
        }
        alreadyPassed={
          selectedProfile
            ? serverState.swipedLeftIds.includes(selectedProfile.id)
            : false
        }
        onClose={() => setSelectedProfile(null)}
        onLike={(profileId) => swipeProfile(profileId, 'right')}
        onPass={(profileId) => swipeProfile(profileId, 'left')}
        onOpenChat={handleOpenChat}
        onRequestBlockUser={(p) => setBlockTargetProfile(p)}
      />

      <BlockUserModal
        profile={blockTargetProfile}
        onClose={() => setBlockTargetProfile(null)}
        onConfirmBlock={handleConfirmBlock}
      />

      <MatchModal
        match={celebratingMatch}
        profile={
          celebratingMatch
            ? PROFILE_MAP[celebratingMatch.profileId]
            : undefined
        }
        currentUser={serverState.currentUser}
        onClose={() => setCelebratingMatch(null)}
        onSendIcebreaker={handleSendMatchIcebreaker}
        onOpenChat={handleOpenChat}
      />

      <ProfileVerificationModal
        open={verificationModalOpen}
        currentUser={serverState.currentUser}
        onClose={() => setVerificationModalOpen(false)}
        onVerify={verifyProfile}
      />

      <VideoIntroRecorderModal
        open={videoIntroModalOpen}
        existingVideoUrl={serverState.currentUser.videoIntroUrl}
        existingPrompt={serverState.currentUser.videoIntroPrompt}
        onClose={() => setVideoIntroModalOpen(false)}
        onSaveVideo={saveVideoIntro}
      />

      <OfflineIndicator />
    </div>
  );
}
