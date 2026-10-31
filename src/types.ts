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
}

export interface LikeReceived {
  profileId: string;
  likedAt: string;
  note: string;
}

export interface MatchRecord {
  id: string;
  profileId: string;
  matchedAt: string;
  icebreakers: [string, string, string];
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isIcebreaker?: boolean;
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

export interface ServerState {
  currentUser: CurrentUser;
  swipeStats: SwipeStats;
  swipedRightIds: string[];
  swipedLeftIds: string[];
  swipeHistory: SwipeHistoryEntry[];
  blockedUsers: BlockedUserRecord[];
  likesReceived: LikeReceived[];
  matches: MatchRecord[];
  messagesByMatch: Record<string, ChatMessage[]>;
  streams: LiveStreamRoom[];
}

