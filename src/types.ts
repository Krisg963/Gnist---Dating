export type NavTab =
  | 'discover'
  | 'swipe'
  | 'likes'
  | 'live'
  | 'messages'
  | 'profile';

export type EducationLevel =
  | 'Videregående / Fagbrev'
  | 'Bachelorgrad'
  | 'Mastergrad';

export type RelationshipGoal =
  | 'Seriøst forhold'
  | 'Åpen for det meste'
  | 'Turvenn & bekjentskap';

export interface ProfilePrompt {
  question: string;
  answer: string;
}

export type AchievementIconKey =
  | 'profile'
  | 'verified'
  | 'icebreaker'
  | 'match'
  | 'streak'
  | 'calendar'
  | 'game'
  | 'swipe';

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  icon: AchievementIconKey;
  xpReward: number;
  progress: number;
  target: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface ProfileAchievementSummary {
  id: string;
  title: string;
  description: string;
  icon: AchievementIconKey;
  unlockedAt?: string;
}

export interface DailyRewardStep {
  day: number;
  label: string;
  xp: number;
  bonusSparks: number;
  claimed: boolean;
  isCurrent: boolean;
}

export interface GamificationState {
  xp: number;
  level: number;
  levelTitle: string;
  currentLevelBaseXp: number;
  nextLevelXp: number;
  superSparks: number;
  loginStreak: number;
  lastClaimedDate: string | null;
  canClaimToday: boolean;
  currentCycleDay: number;
  icebreakersSentCount: number;
  gamesPlayedCount: number;
  datesProposedCount: number;
  dailyRewards: DailyRewardStep[];
  achievements: AchievementBadge[];
}

export interface DatingProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  distanceKm: number;
  occupation: string;
  education: EducationLevel;
  relationshipGoal: RelationshipGoal;
  verified: boolean;
  isOnline: boolean;
  isNew: boolean;
  lastActiveLabel: string;
  bio: string;
  interests: string[];
  prompts: ProfilePrompt[];
  image: string;
  images?: string[];
  videoIntroUrl?: string | null;
  videoIntroDurationSec?: number | null;
  videoIntroPrompt?: string | null;
  icebreakers: [string, string, string];
  readReceiptsEnabled?: boolean;
  achievements?: ProfileAchievementSummary[];
  level?: number;
  levelTitle?: string;
  isCurrentUserPreview?: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  age: number;
  city: string;
  occupation: string;
  education: EducationLevel;
  relationshipGoal: RelationshipGoal;
  bio: string;
  interests: string[];
  photos: string[] | null;
  videoIntroUrl: string | null;
  videoIntroDurationSec: number | null;
  videoIntroPrompt: string | null;
  videoIntroUpdatedAt: string | null;
  verified: boolean;
  verifiedAt: string | null;
  verificationPose: string | null;
  selfieDataUrl: string | null;
  readReceiptsEnabled: boolean;
}

export interface SwipeHistoryEntry {
  profileId: string;
  direction: 'left' | 'right';
  swipedAt: string;
  matched: boolean;
}

export interface SwipeStats {
  rightCount: number;
  leftCount: number;
  dailyGoal: number;
  dailyCount: number;
  dailyDate: string;
}

export interface LikeReceived {
  profileId: string;
  likedAt: string;
  note: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface MatchRecord {
  id: string;
  profileId: string;
  matchedAt: string;
  matchedAtIso?: string;
  icebreakers: [string, string, string];
  unreadCount: number;
}

export interface LiveLocationShare {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  startedAtIso: string;
  expiresAtIso: string;
  updatedAtIso: string;
  stoppedAtIso?: string | null;
  isActive: boolean;
}

export interface CalendarBusyInterval {
  startIso: string;
  endIso: string;
  label?: string;
}

export interface PartnerAvailabilityResponse {
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerCity: string;
  busyIntervals: CalendarBusyInterval[];
  preferredNote: string;
}

export interface ProposedTimeSlot {
  id: string;
  startIso: string;
  endIso: string;
  dayLabel: string;
  timeRangeLabel: string;
  activitySuggestion: string;
}

export interface MeetingProposalShare {
  proposalId: string;
  slots: ProposedTimeSlot[];
  selectedSlotId: string | null;
  selectedById: string | null;
  selectedByName: string | null;
  partnerSuggestedSlotId: string | null;
  userCalendarChecked: boolean;
  note: string | null;
  addedToGoogleCalendarEventId: string | null;
  addedToGoogleCalendarLink: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

export type ChatGameId = 'would_you_rather' | 'this_or_that' | 'spark_quiz';

export interface ChatGameRound {
  roundIndex: number;
  prompt: string;
  options: string[];
  myChoiceIndex: number | null;
  partnerChoiceIndex: number | null;
}

export interface ChatGameSession {
  sessionId: string;
  gameId: ChatGameId;
  gameTitle: string;
  gameSubtitle: string;
  currentRoundIndex: number;
  totalRounds: number;
  rounds: ChatGameRound[];
  matchedChoicesCount: number;
  status: 'active' | 'completed';
  startedByName: string;
  updatedAtIso: string;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isIcebreaker?: boolean;
  readAt?: string | null;
  liveLocation?: LiveLocationShare | null;
  meetingProposal?: MeetingProposalShare | null;
  gameSession?: ChatGameSession | null;
}

export interface StreamComment {
  id: string;
  streamId: string;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  text: string;
  createdAt: string;
  deleted?: boolean;
}

export interface LiveStreamRoom {
  id: string;
  hostProfileId: string;
  hostName: string;
  hostAge: number;
  hostCity: string;
  hostVerified: boolean;
  title: string;
  topic: string;
  viewerCount: number;
  likesCount: number;
  isUserHost: boolean;
  startedAt: string;
  pinnedCommentId: string | null;
  mutedAuthorIds: string[];
  comments: StreamComment[];
}

export interface PushToastNotification {
  id: string;
  kind: 'match' | 'message';
  title: string;
  body: string;
  data: {
    tab: string;
    matchId: string | null;
    url: string;
  };
}

export interface BlockedUserRecord {
  profileId: string;
  blockedAt: string;
  reason: string;
}

export interface ReportedUserRecord {
  id: string;
  profileId: string;
  matchId: string | null;
  reason: string;
  details: string;
  alsoBlocked: boolean;
  reportedAt: string;
}

export interface DatingCoachBioVariant {
  tone: string;
  text: string;
}

export interface DatingCoachAdvice {
  summary: string;
  bioStrengths: string;
  bioTips: string[];
  suggestedBio: string;
  bioVariants?: DatingCoachBioVariant[];
  photoStrengths?: string;
  photoTips: string[];
  nextPhotoIdea: string;
  generatedAt: string;
}

export interface DatingCoachRequestPayload {
  name: string;
  age: number;
  city: string;
  occupation: string;
  education: EducationLevel;
  relationshipGoal: RelationshipGoal;
  bio: string;
  interests: string[];
  photos: string[];
  verified: boolean;
  hasVideoIntro: boolean;
}

export interface ServerState {
  currentUser: CurrentUser;
  swipeStats: SwipeStats;
  swipedRightIds: string[];
  swipedLeftIds: string[];
  swipeHistory: SwipeHistoryEntry[];
  blockedUsers: BlockedUserRecord[];
  reportedUsers: ReportedUserRecord[];
  likesReceived: LikeReceived[];
  matches: MatchRecord[];
  messagesByMatch: Record<string, ChatMessage[]>;
  streams: LiveStreamRoom[];
  gamification: GamificationState;
}
