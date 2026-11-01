import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import express from 'express';
import fs from 'fs';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import type { PushSubscription } from 'web-push';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSIST_FILE = '/tmp/gnist-server-state.json';
const VAPID_FILE = '/tmp/gnist-vapid-keys.json';
const PUSH_SUBS_FILE = '/tmp/gnist-push-subscriptions.json';

type EducationLevel =
  | 'Videregående / Fagbrev'
  | 'Bachelorgrad'
  | 'Mastergrad';

type RelationshipGoal =
  | 'Seriøst forhold'
  | 'Åpen for det meste'
  | 'Turvenn & bekjentskap';

interface CurrentUser {
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

interface SwipeHistoryEntry {
  profileId: string;
  direction: 'left' | 'right';
  swipedAt: string;
  matched: boolean;
}

interface SwipeStats {
  rightCount: number;
  leftCount: number;
  dailyGoal: number;
  dailyCount: number;
  dailyDate: string;
}

interface LikeReceived {
  profileId: string;
  likedAt: string;
  note: string;
}

interface MatchRecord {
  id: string;
  profileId: string;
  matchedAt: string;
  matchedAtIso?: string;
  icebreakers: [string, string, string];
  unreadCount: number;
}

interface LiveLocationShare {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  startedAtIso: string;
  expiresAtIso: string;
  updatedAtIso: string;
  stoppedAtIso?: string | null;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isIcebreaker?: boolean;
  readAt?: string | null;
  liveLocation?: LiveLocationShare | null;
}

interface StreamComment {
  id: string;
  streamId: string;
  authorId: string;
  authorName: string;
  authorVerified: boolean;
  text: string;
  createdAt: string;
  deleted?: boolean;
}

interface LiveStreamRoom {
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

interface BlockedUserRecord {
  profileId: string;
  blockedAt: string;
  reason: string;
}

interface ReportedUserRecord {
  id: string;
  profileId: string;
  matchId: string | null;
  reason: string;
  details: string;
  alsoBlocked: boolean;
  reportedAt: string;
}

interface ServerState {
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
}

interface StoredPushSubscription {
  clientId: string;
  subscription: PushSubscription;
  notifyMatches: boolean;
  notifyMessages: boolean;
}

const PROFILE_DISPLAY_NAMES: Record<string, string> = {
  ingrid: 'Ingrid',
  henrik: 'Henrik',
  nora: 'Nora',
  kasper: 'Kasper',
  sofie: 'Sofie',
  emil: 'Emil',
  astrid: 'Astrid',
  sander: 'Sander',
};

const PROFILE_READ_RECEIPTS: Record<string, boolean> = {
  ingrid: true,
  henrik: true,
  nora: true,
  kasper: false,
  sofie: true,
  emil: false,
  astrid: true,
  sander: true,
};

const ICEBREAKERS_BY_PROFILE: Record<string, [string, string, string]> = {
  ingrid: [
    'Hvilken kafé i Oslo lager egentlig byens beste cortado?',
    'Søndagstur i Nordmarka med termos eller lang brunsj på Grünerløkka?',
    'Hva er den siste boka du leste som du fortsatt tenker på?',
  ],
  henrik: [
    'Ærlig spørsmål: regner det virkelig hver dag i Bergen, eller overdriver vi andre?',
    'Hva er din ultimate sjømatrett når du inviterer på middag?',
    'Seiltur langs kysten eller hyttehelg på fjellet?',
  ],
  nora: [
    'Hva er det mest skjeve men sjarmerende du har dreid på keramikkverkstedet?',
    'Hvis vi bygger en spilleliste for en roadtrip, hvilke tre låter må med først?',
    'Grønne planter overalt i leiligheten — hvor mange har du egentlig nå?',
  ],
  kasper: [
    'Hvilken fjelltopp i Nord-Norge har gitt deg den råeste utsikten hittil?',
    'Bålkaffe under nordlyset eller midnattssol ved havet?',
    'Hva pakker du alltid med i sekken som turkameratene dine blir misunnelige på?',
  ],
  sofie: [
    'Hjemmelaget pasta fra bunnen eller tapas i en solrik bakgård?',
    'Hva får deg alltid til å le så mye at du glemmer tiden?',
    'Hvis vi kunne reist hvor som helst neste fredag etter jobb, hvor drar vi?',
  ],
  emil: [
    'Du lager pour-over kaffe på morgenen — hvilke bønner sverger du til akkurat nå?',
    'Hva er signaturretten din når du vil imponere på kjøkkenet?',
    'Rolig vinylkveld hjemme eller intimkonsert på en liten scene i byen?',
  ],
  astrid: [
    'Asfaltløping langs vannet eller bratt sti opp på nærmeste fjelltopp?',
    'Hvilket land på togreisen gjennom Europa hadde den beste maten?',
    'Isbad i fjorden før frokost — ja eller absolutt nei?',
  ],
  sander: [
    'Hva er det fineste møbelet du har bygget fra bunnen av?',
    'Hvilken konsertopplevelse glemmer du aldri?',
    'Nordover eller sørover hvis vi kaster oss i bilen på fredag?',
  ],
};

const MUTUAL_LIKE_IDS = new Set([
  'ingrid',
  'henrik',
  'sofie',
  'nora',
  'emil',
  'astrid',
]);

const swipeHistoryStack: Array<{
  profileId: string;
  direction: 'left' | 'right';
  previousLikeReceived?: LikeReceived;
  createdMatchId?: string;
}> = [];

// Initialize VAPID keys for Web Push API
function loadOrCreateVapidKeys(): { publicKey: string; privateKey: string } {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }
  try {
    if (fs.existsSync(VAPID_FILE)) {
      const saved = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8')) as {
        publicKey?: string;
        privateKey?: string;
      };
      if (saved.publicKey && saved.privateKey) {
        return { publicKey: saved.publicKey, privateKey: saved.privateKey };
      }
    }
  } catch {
    // Generate fresh keys
  }
  const generated = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_FILE, JSON.stringify(generated), 'utf-8');
  } catch {
    // Ignore write failure
  }
  return generated;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:kontakt@gnist.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

function loadPushSubscriptions(): StoredPushSubscription[] {
  try {
    if (fs.existsSync(PUSH_SUBS_FILE)) {
      return JSON.parse(
        fs.readFileSync(PUSH_SUBS_FILE, 'utf-8')
      ) as StoredPushSubscription[];
    }
  } catch {
    // Ignore
  }
  return [];
}

let pushSubscriptions: StoredPushSubscription[] = loadPushSubscriptions();

function persistPushSubscriptions() {
  try {
    fs.writeFileSync(
      PUSH_SUBS_FILE,
      JSON.stringify(pushSubscriptions),
      'utf-8'
    );
  } catch {
    // Ignore
  }
}

function getTodayDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDailyGoal(value: unknown, fallback = 5): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(1, Math.round(parsed)));
}

function createInitialState(): ServerState {
  const todayKey = getTodayDateKey();
  return {
    currentUser: {
      id: 'me',
      name: 'Maja',
      age: 27,
      city: 'Oslo',
      occupation: 'Produktdesigner',
      education: 'Mastergrad',
      relationshipGoal: 'Seriøst forhold',
      bio: 'Glad i morgenkaffe i solen, helgeturer i marka, god mat med venner og ekte samtaler uten filter.',
      interests: ['Kunst & design', 'Friluftsliv', 'Mat & kaffe', 'Reiser'],
      photos: null,
      videoIntroUrl: null,
      videoIntroDurationSec: null,
      videoIntroPrompt: null,
      videoIntroUpdatedAt: null,
      verified: false,
      verifiedAt: null,
      verificationPose: null,
      selfieDataUrl: null,
      readReceiptsEnabled: true,
    },
    swipeStats: {
      rightCount: 5,
      leftCount: 3,
      dailyGoal: 5,
      dailyCount: 1,
      dailyDate: todayKey,
    },
    swipedRightIds: ['ingrid'],
    swipedLeftIds: [],
    swipeHistory: [
      {
        profileId: 'ingrid',
        direction: 'right',
        swipedAt: 'I dag, 19:20',
        matched: true,
      },
    ],
    blockedUsers: [],
    reportedUsers: [],
    likesReceived: [
      {
        profileId: 'henrik',
        likedAt: 'For 12 min siden',
        note: 'Likte profilen din — kaffe ved sjøen høres helt perfekt ut!',
      },
      {
        profileId: 'sofie',
        likedAt: 'For 38 min siden',
        note: 'Elsker energien din! Vi burde teste den nye vinbaren i sentrum.',
      },
      {
        profileId: 'nora',
        likedAt: 'I dag, 18:15',
        note: 'Så gøy at du også driver med design — lyst til å slå av en prat?',
      },
    ],
    matches: [
      {
        id: 'match-ingrid',
        profileId: 'ingrid',
        matchedAt: formatExactDateTime(new Date(Date.now() - 42 * 60 * 1000)),
        matchedAtIso: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        icebreakers: ICEBREAKERS_BY_PROFILE.ingrid,
        unreadCount: 1,
      },
    ],
    messagesByMatch: {
      'match-ingrid': [
        {
          id: 'msg-seed-0',
          matchId: 'match-ingrid',
          senderId: 'me',
          senderName: 'Maja',
          text: 'Søndagstur i Nordmarka med termos eller lang brunsj på Grünerløkka?',
          createdAt: '19:21',
          isIcebreaker: true,
          readAt: '19:21',
        },
        {
          id: 'msg-seed-1',
          matchId: 'match-ingrid',
          senderId: 'ingrid',
          senderName: 'Ingrid',
          text: 'Hei! Så hyggelig at vi matchet — ja takk, gjerne begge deler! Håper uken din har startet bra!',
          createdAt: '19:22',
          readAt: null,
        },
      ],
    },
    streams: [
      {
        id: 'stream-nora',
        hostProfileId: 'nora',
        hostName: 'Nora',
        hostAge: 25,
        hostCity: 'Trondheim',
        hostVerified: true,
        title: 'Kveldskaffe og dreiing på keramikkverkstedet',
        topic: 'Kreativt verksted · Spør meg om alt',
        viewerCount: 142,
        likesCount: 684,
        isUserHost: false,
        startedAt: 'Direkte nå',
        pinnedCommentId: 'c-nora-1',
        mutedAuthorIds: [],
        comments: [
          {
            id: 'c-nora-1',
            streamId: 'stream-nora',
            authorId: 'nora',
            authorName: 'Nora',
            authorVerified: true,
            text: 'Velkommen inn i verkstedet! Skriv gjerne hvor i landet dere ser fra.',
            createdAt: '20:10',
          },
          {
            id: 'c-nora-2',
            streamId: 'stream-nora',
            authorId: 'kasper',
            authorName: 'Kasper',
            authorVerified: true,
            text: 'Ser helt nydelig ut! Hilsen fra Tromsø etter dagens fjelltur.',
            createdAt: '20:14',
          },
          {
            id: 'c-nora-3',
            streamId: 'stream-nora',
            authorId: 'ingrid',
            authorName: 'Ingrid',
            authorVerified: true,
            text: 'Den koppen får så fin form — hvilken glasur skal du bruke?',
            createdAt: '20:16',
          },
        ],
      },
      {
        id: 'stream-henrik',
        hostProfileId: 'henrik',
        hostName: 'Henrik',
        hostAge: 29,
        hostCity: 'Bergen',
        hostVerified: true,
        title: 'Gyllen time langs Bryggen og helgeplaner',
        topic: 'Kveldsprat · Musikk & reisetips',
        viewerCount: 89,
        likesCount: 412,
        isUserHost: false,
        startedAt: 'Direkte nå',
        pinnedCommentId: null,
        mutedAuthorIds: [],
        comments: [
          {
            id: 'c-henrik-1',
            streamId: 'stream-henrik',
            authorId: 'sofie',
            authorName: 'Sofie',
            authorVerified: true,
            text: 'Sol i Bergen?! Dette må dokumenteres skikkelig.',
            createdAt: '20:05',
          },
          {
            id: 'c-henrik-2',
            streamId: 'stream-henrik',
            authorId: 'emil',
            authorName: 'Emil',
            authorVerified: false,
            text: 'Hvilken konsert skal du på til helgen?',
            createdAt: '20:12',
          },
        ],
      },
      {
        id: 'stream-sofie',
        hostProfileId: 'sofie',
        hostName: 'Sofie',
        hostAge: 26,
        hostCity: 'Stavanger',
        hostVerified: true,
        title: 'Vi lager fersk pasta og diskuterer første-date-tabber',
        topic: 'Matlaging · Humor & dating',
        viewerCount: 64,
        likesCount: 295,
        isUserHost: false,
        startedAt: 'Direkte nå',
        pinnedCommentId: null,
        mutedAuthorIds: [],
        comments: [
          {
            id: 'c-sofie-1',
            streamId: 'stream-sofie',
            authorId: 'ingrid',
            authorName: 'Ingrid',
            authorVerified: true,
            text: 'Hjemmelaget ravioli vinner hver eneste gang!',
            createdAt: '20:18',
          },
        ],
      },
    ],
  };
}

function loadState(): ServerState {
  const defaults = createInitialState();
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = JSON.parse(
        fs.readFileSync(PERSIST_FILE, 'utf-8')
      ) as Partial<ServerState>;
      const migratedMatches = Array.isArray(raw.matches)
        ? raw.matches.map((m, idx) => {
            const hasExactDate =
              Boolean(m.matchedAtIso) &&
              typeof m.matchedAt === 'string' &&
              !m.matchedAt.startsWith('I dag');
            if (hasExactDate) return m;
            const fallbackDate = new Date(
              Date.now() - (idx + 1) * 42 * 60 * 1000
            );
            const timePartMatch =
              typeof m.matchedAt === 'string'
                ? m.matchedAt.match(/(\d{1,2}:\d{2})/)
                : null;
            if (timePartMatch) {
              const [hh, mm] = timePartMatch[1].split(':').map(Number);
              if (Number.isFinite(hh) && Number.isFinite(mm)) {
                fallbackDate.setHours(hh, mm, 0, 0);
              }
            }
            return {
              ...m,
              matchedAt: formatExactDateTime(fallbackDate),
              matchedAtIso: m.matchedAtIso || fallbackDate.toISOString(),
            };
          })
        : defaults.matches;

      const rawMessagesByMatch =
        raw.messagesByMatch && typeof raw.messagesByMatch === 'object'
          ? { ...raw.messagesByMatch }
          : { ...defaults.messagesByMatch };

      // Migrate match-ingrid seed thread and existing outgoing messages with readAt metadata
      for (const [mId, msgs] of Object.entries(rawMessagesByMatch)) {
        if (!Array.isArray(msgs)) continue;
        const matchObj = migratedMatches.find((m) => m.id === mId);
        const profileId = matchObj?.profileId || mId.replace(/^match-/, '');
        const recipientAllowsRead = PROFILE_READ_RECEIPTS[profileId] !== false;

        let updatedMsgs = msgs.map((msg) => {
          if (
            msg.senderId === 'me' &&
            msg.readAt === undefined &&
            recipientAllowsRead
          ) {
            return { ...msg, readAt: msg.createdAt };
          }
          return msg;
        });

        if (
          mId === 'match-ingrid' &&
          updatedMsgs.length === 1 &&
          updatedMsgs[0].id === 'msg-seed-1'
        ) {
          updatedMsgs = [
            {
              id: 'msg-seed-0',
              matchId: 'match-ingrid',
              senderId: 'me',
              senderName: raw.currentUser?.name || defaults.currentUser.name,
              text: 'Søndagstur i Nordmarka med termos eller lang brunsj på Grünerløkka?',
              createdAt: '19:21',
              isIcebreaker: true,
              readAt: '19:21',
            },
            updatedMsgs[0],
          ];
        }

        rawMessagesByMatch[mId] = updatedMsgs;
      }

      const migratedHistory = Array.isArray(raw.swipeHistory)
        ? raw.swipeHistory.slice(0, 10)
        : defaults.swipeHistory;

      const todayKey = getTodayDateKey();
      const rawStats = (raw.swipeStats || {}) as Partial<SwipeStats>;
      const resolvedDailyGoal = clampDailyGoal(
        rawStats.dailyGoal,
        defaults.swipeStats.dailyGoal
      );

      let resolvedDailyCount = defaults.swipeStats.dailyCount;
      if (rawStats.dailyDate === todayKey && typeof rawStats.dailyCount === 'number' && Number.isFinite(rawStats.dailyCount)) {
        resolvedDailyCount = Math.max(0, Math.round(rawStats.dailyCount));
      } else if (typeof rawStats.dailyDate === 'string' && rawStats.dailyDate !== todayKey) {
        resolvedDailyCount = 0;
      } else {
        resolvedDailyCount = migratedHistory.filter(
          (entry) =>
            typeof entry.swipedAt === 'string' &&
            entry.swipedAt.startsWith('I dag')
        ).length;
      }

      return {
        ...defaults,
        ...raw,
        matches: migratedMatches,
        messagesByMatch: rawMessagesByMatch,
        currentUser: {
          ...defaults.currentUser,
          ...(raw.currentUser || {}),
          readReceiptsEnabled:
            typeof raw.currentUser?.readReceiptsEnabled === 'boolean'
              ? raw.currentUser.readReceiptsEnabled
              : true,
        },
        swipeStats: {
          ...defaults.swipeStats,
          ...rawStats,
          dailyGoal: resolvedDailyGoal,
          dailyCount: resolvedDailyCount,
          dailyDate: todayKey,
        },
        swipeHistory: migratedHistory,
        blockedUsers: Array.isArray(raw.blockedUsers) ? raw.blockedUsers : [],
        reportedUsers: Array.isArray(raw.reportedUsers)
          ? raw.reportedUsers
          : [],
      };
    }
  } catch {
    // Fallback to clean initial state
  }
  return defaults;
}

const state: ServerState = loadState();

function syncDailySwipeRollover(): boolean {
  const todayKey = getTodayDateKey();
  if (state.swipeStats.dailyDate !== todayKey) {
    state.swipeStats.dailyDate = todayKey;
    state.swipeStats.dailyCount = 0;
    return true;
  }
  return false;
}

function persistState() {
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(state), 'utf-8');
  } catch {
    // Ignore disk write issues
  }
}

function formatNowTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

function formatExactDateTime(date: Date = new Date()): string {
  const datePart = date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} kl. ${timePart}`;
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseInlineImageDataUrl(
  rawUrl: string
): { mimeType: string; data: string } | null {
  const match = rawUrl.match(
    /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i
  );
  if (!match) return null;
  const normalizedMime =
    match[1].toLowerCase() === 'image/jpg'
      ? 'image/jpeg'
      : match[1].toLowerCase();
  return {
    mimeType: normalizedMime,
    data: match[2],
  };
}

const LOCAL_IMAGES_DIR = path.join(__dirname, 'src', 'assets', 'images');

function resolvePhotoToInlineData(
  rawUrl: string
): { mimeType: string; data: string } | null {
  const inline = parseInlineImageDataUrl(rawUrl);
  if (inline) return inline;

  if (!rawUrl || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return null;
  }

  try {
    if (!fs.existsSync(LOCAL_IMAGES_DIR)) return null;
    const cleanPath = rawUrl.split('?')[0].split('#')[0];
    const baseName = path.basename(cleanPath);
    if (!baseName) return null;

    const files = fs.readdirSync(LOCAL_IMAGES_DIR);
    // Match exact filename or Vite hashed asset filename (e.g. user_maja_main_1793260548621-AbCd12.jpg)
    const stemWithoutExt = baseName
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .replace(/-[A-Za-z0-9_-]{6,}$/, '');

    const matchedFile = files.find(
      (f) => f === baseName || (stemWithoutExt.length >= 8 && f.startsWith(stemWithoutExt))
    );
    if (!matchedFile) return null;

    const ext = path.extname(matchedFile).toLowerCase();
    const mimeType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';

    const fullPath = path.join(LOCAL_IMAGES_DIR, matchedFile);
    const buffer = fs.readFileSync(fullPath);
    if (buffer.byteLength > 4 * 1024 * 1024) return null;

    return {
      mimeType,
      data: buffer.toString('base64'),
    };
  } catch {
    return null;
  }
}

function mapGeminiErrorToNorwegian(err: unknown): {
  status: number;
  message: string;
} {
  const rawMsg = err instanceof Error ? err.message : String(err || '');
  const status =
    (err as { status?: number })?.status ||
    (rawMsg.includes('429') ? 429 : rawMsg.includes('403') ? 403 : 500);

  if (
    rawMsg.includes('MISSING_GEMINI_API_KEY') ||
    rawMsg.includes('API_KEY_INVALID') ||
    rawMsg.includes('API key not valid') ||
    status === 401 ||
    status === 403
  ) {
    return {
      status: 403,
      message:
        'Kunne ikke koble til språkmodellen. Kontroller at GEMINI_API_KEY er lagt inn under Settings > Secrets.',
    };
  }

  if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message:
        'Tjenesten har mottatt mange forespørsler på kort tid. Vent et lite øyeblikk og prøv igjen.',
    };
  }

  return {
    status: 500,
    message:
      'Kunne ikke generere svar akkurat nå. Prøv gjerne igjen om et par sekunder.',
  };
}

async function dispatchWebPush(
  kind: 'match' | 'message',
  notificationPayload: {
    title: string;
    body: string;
    tag: string;
    data: { tab: string; matchId: string | null; url: string };
  },
  excludeClientId?: string
): Promise<number> {
  let deliveredCount = 0;
  const staleEndpoints = new Set<string>();

  await Promise.all(
    pushSubscriptions.map(async (entry) => {
      if (excludeClientId && entry.clientId === excludeClientId) return;
      if (kind === 'match' && !entry.notifyMatches) return;
      if (kind === 'message' && !entry.notifyMessages) return;

      try {
        await webpush.sendNotification(
          entry.subscription,
          JSON.stringify(notificationPayload)
        );
        deliveredCount += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.add(entry.subscription.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.size > 0) {
    pushSubscriptions = pushSubscriptions.filter(
      (s) => !staleEndpoints.has(s.subscription.endpoint)
    );
    persistPushSubscriptions();
  }

  return deliveredCount;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '35mb' }));

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
      // Leave all other upgrade paths (such as Vite HMR 'vite-hmr') untouched for Vite
    } catch {
      // Ignore malformed upgrade URLs
    }
  });

  function broadcast(event: string, payload: unknown) {
    const raw = JSON.stringify({ event, payload });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    });
  }

  function isProfileBlocked(profileId: string): boolean {
    return state.blockedUsers.some((b) => b.profileId === profileId);
  }

  function handleBlockUser(profileId: string, reason?: string) {
    const cleanId = profileId.trim();
    if (!cleanId || cleanId === state.currentUser.id) {
      return state;
    }

    const cleanReason =
      typeof reason === 'string' && reason.trim()
        ? reason.trim()
        : 'Uønsket kontakt';

    const existingIdx = state.blockedUsers.findIndex(
      (b) => b.profileId === cleanId
    );
    const record: BlockedUserRecord = {
      profileId: cleanId,
      blockedAt: `I dag, ${formatNowTime()}`,
      reason: cleanReason,
    };

    if (existingIdx >= 0) {
      state.blockedUsers[existingIdx] = record;
    } else {
      state.blockedUsers.unshift(record);
    }

    // Remove any active matches and conversation logs with the blocked user
    const removedMatchIds = state.matches
      .filter((m) => m.profileId === cleanId)
      .map((m) => m.id);

    state.matches = state.matches.filter((m) => m.profileId !== cleanId);
    for (const mId of removedMatchIds) {
      delete state.messagesByMatch[mId];
    }
    delete state.messagesByMatch[`match-${cleanId}`];

    // Remove from Likes You queue and Swipe History
    state.likesReceived = state.likesReceived.filter(
      (l) => l.profileId !== cleanId
    );
    state.swipeHistory = state.swipeHistory.filter(
      (h) => h.profileId !== cleanId
    );

    // Purge from rewind stack so rewinding never restores a blocked user
    for (let i = swipeHistoryStack.length - 1; i >= 0; i -= 1) {
      if (swipeHistoryStack[i].profileId === cleanId) {
        swipeHistoryStack.splice(i, 1);
      }
    }

    persistState();
    broadcast('state:sync', state);
    return state;
  }

  function handleUnblockUser(profileId: string) {
    const cleanId = profileId.trim();
    if (!cleanId) return state;

    state.blockedUsers = state.blockedUsers.filter(
      (b) => b.profileId !== cleanId
    );
    state.swipedRightIds = state.swipedRightIds.filter((id) => id !== cleanId);
    state.swipedLeftIds = state.swipedLeftIds.filter((id) => id !== cleanId);
    persistState();
    broadcast('state:sync', state);
    return state;
  }

  function handleReportUser(input: {
    profileId: string;
    matchId?: string | null;
    reason?: string;
    details?: string;
    blockUser?: boolean;
  }): { report: ReportedUserRecord | null; state: ServerState } {
    const cleanId = input.profileId.trim();
    if (!cleanId || cleanId === state.currentUser.id) {
      return { report: null, state };
    }

    const cleanReason =
      typeof input.reason === 'string' && input.reason.trim()
        ? input.reason.trim().slice(0, 80)
        : 'Upassende innhold';
    const cleanDetails =
      typeof input.details === 'string' ? input.details.trim().slice(0, 300) : '';
    const shouldBlock = Boolean(input.blockUser);

    const report: ReportedUserRecord = {
      id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      profileId: cleanId,
      matchId: input.matchId || null,
      reason: cleanReason,
      details: cleanDetails,
      alsoBlocked: shouldBlock,
      reportedAt: formatExactDateTime(new Date()),
    };

    state.reportedUsers = [report, ...state.reportedUsers].slice(0, 50);

    if (shouldBlock) {
      handleBlockUser(cleanId, `Rapportert: ${cleanReason}`);
    } else {
      persistState();
      broadcast('state:sync', state);
    }

    return { report, state };
  }

  function recordSwipeHistory(entry: SwipeHistoryEntry) {
    state.swipeHistory = [
      entry,
      ...state.swipeHistory.filter((h) => h.profileId !== entry.profileId),
    ].slice(0, 10);
  }

  async function handleSwipe(profileId: string, direction: 'left' | 'right') {
    syncDailySwipeRollover();

    if (isProfileBlocked(profileId)) {
      return { matched: false, match: null };
    }

    // Already swiped right: preserve existing decision/match
    if (state.swipedRightIds.includes(profileId)) {
      const existingMatch =
        state.matches.find((m) => m.profileId === profileId) || null;
      return { matched: Boolean(existingMatch), match: existingMatch };
    }

    const wasPreviouslySwipedLeft = state.swipedLeftIds.includes(profileId);

    // Already swiped left: if passing again, no-op; if liking now (fixing a feilsveip from Sveipe-historikk!), allow changing to right!
    if (wasPreviouslySwipedLeft) {
      if (direction === 'left') {
        return { matched: false, match: null };
      }
      state.swipedLeftIds = state.swipedLeftIds.filter(
        (id) => id !== profileId
      );
      if (state.swipeStats.leftCount > 0) {
        state.swipeStats.leftCount -= 1;
      }
    }

    const prevLikeIdx = state.likesReceived.findIndex(
      (l) => l.profileId === profileId
    );
    const previousLikeReceived =
      prevLikeIdx >= 0 ? state.likesReceived[prevLikeIdx] : undefined;

    if (prevLikeIdx >= 0) {
      state.likesReceived.splice(prevLikeIdx, 1);
    }

    if (!wasPreviouslySwipedLeft) {
      state.swipeStats.dailyCount += 1;
    }

    if (direction === 'left') {
      state.swipedLeftIds.push(profileId);
      state.swipeStats.leftCount += 1;
      recordSwipeHistory({
        profileId,
        direction: 'left',
        swipedAt: `I dag, ${formatNowTime()}`,
        matched: false,
      });
      swipeHistoryStack.push({
        profileId,
        direction: 'left',
        previousLikeReceived,
      });
      persistState();
      broadcast('state:sync', state);
      return { matched: false, match: null };
    }

    state.swipedRightIds.push(profileId);
    state.swipeStats.rightCount += 1;
    const isMatch =
      Boolean(previousLikeReceived) || MUTUAL_LIKE_IDS.has(profileId);

    if (isMatch) {
      const matchId = `match-${profileId}`;
      let match = state.matches.find((m) => m.id === matchId);
      const isNewlyCreated = !match;
      if (!match) {
        const now = new Date();
        match = {
          id: matchId,
          profileId,
          matchedAt: formatExactDateTime(now),
          matchedAtIso: now.toISOString(),
          icebreakers: ICEBREAKERS_BY_PROFILE[profileId] || [
            'Hva er det beste som har skjedd deg denne uken?',
            'Kaffe på formiddagen eller et glass vin på kvelden?',
            'Hvilket reisemål står øverst på ønskelisten din nå?',
          ],
          unreadCount: 0,
        };
        state.matches.unshift(match);
        if (!state.messagesByMatch[matchId]) {
          state.messagesByMatch[matchId] = [];
        }
      }
      recordSwipeHistory({
        profileId,
        direction: 'right',
        swipedAt: `I dag, ${formatNowTime()}`,
        matched: true,
      });
      swipeHistoryStack.push({
        profileId,
        direction: 'right',
        previousLikeReceived,
        createdMatchId: matchId,
      });
      persistState();
      broadcast('state:sync', state);

      if (isNewlyCreated) {
        const displayName = PROFILE_DISPLAY_NAMES[profileId] || 'en profil';
        const pushPayload = {
          title: `Ny match med ${displayName}!`,
          body: `Dere likte hverandre på Gnist. Trykk for å sende en samtalestarter!`,
          tag: `match-${matchId}`,
          data: { tab: 'messages', matchId, url: '/' },
        };
        void dispatchWebPush('match', pushPayload);
        broadcast('push:notification', {
          id: `notif-${Date.now()}`,
          kind: 'match',
          ...pushPayload,
        });
      }

      return { matched: true, match };
    }

    recordSwipeHistory({
      profileId,
      direction: 'right',
      swipedAt: `I dag, ${formatNowTime()}`,
      matched: false,
    });
    swipeHistoryStack.push({
      profileId,
      direction: 'right',
      previousLikeReceived,
    });
    persistState();
    broadcast('state:sync', state);
    return { matched: false, match: null };
  }

  function handleSendMessage(msgInput: {
    id: string;
    matchId: string;
    text: string;
    isIcebreaker?: boolean;
    senderId?: string;
    senderName?: string;
    originClientId?: string;
  }) {
    const {
      id,
      matchId,
      text,
      isIcebreaker,
      senderId,
      senderName,
      originClientId,
    } = msgInput;
    if (!text || !text.trim()) return null;
    const targetMatch = state.matches.find((m) => m.id === matchId);
    if (!targetMatch || isProfileBlocked(targetMatch.profileId)) {
      return null;
    }
    if (!state.messagesByMatch[matchId]) {
      state.messagesByMatch[matchId] = [];
    }
    const exists = state.messagesByMatch[matchId].some((m) => m.id === id);
    if (exists) {
      return state.messagesByMatch[matchId].find((m) => m.id === id) || null;
    }

    const actualSenderId = senderId || state.currentUser.id;
    const actualSenderName = senderName || state.currentUser.name;

    const message: ChatMessage = {
      id,
      matchId,
      senderId: actualSenderId,
      senderName: actualSenderName,
      text: text.trim(),
      createdAt: formatNowTime(),
      isIcebreaker: Boolean(isIcebreaker),
      readAt: null,
    };
    state.messagesByMatch[matchId].push(message);

    const match = state.matches.find((m) => m.id === matchId);
    if (match) {
      if (actualSenderId !== state.currentUser.id) {
        match.unreadCount = (match.unreadCount || 0) + 1;
      } else {
        match.unreadCount = 0;
      }
    }

    persistState();
    broadcast('chat:message', { matchId, message });
    if (actualSenderId !== state.currentUser.id) {
      broadcast('state:sync', state);
    } else {
      // Simulate the match opening the message shortly after delivery if recipient has not disabled read receipts
      const recipientId = targetMatch.profileId;
      if (PROFILE_READ_RECEIPTS[recipientId] !== false) {
        setTimeout(() => {
          const activeMatch = state.matches.find((m) => m.id === matchId);
          if (!activeMatch || isProfileBlocked(recipientId)) return;
          if (PROFILE_READ_RECEIPTS[recipientId] === false) return;

          const thread = state.messagesByMatch[matchId] || [];
          const readTimestamp = formatNowTime();
          const updatedIds: string[] = [];

          for (const msg of thread) {
            if (msg.senderId === state.currentUser.id && !msg.readAt) {
              msg.readAt = readTimestamp;
              updatedIds.push(msg.id);
            }
          }

          if (updatedIds.length > 0) {
            persistState();
            broadcast('chat:read', {
              matchId,
              readAt: readTimestamp,
              messageIds: updatedIds,
            });
          }
        }, 1350);
      }
    }

    // Dispatch Web Push notification to other connected devices/tabs (or all if incoming from match)
    const pushPayload = {
      title: `Ny melding fra ${actualSenderName}`,
      body: message.text,
      tag: `msg-${matchId}`,
      data: { tab: 'messages', matchId, url: '/' },
    };
    void dispatchWebPush(
      'message',
      pushPayload,
      actualSenderId === state.currentUser.id ? originClientId : undefined
    );

    if (actualSenderId !== state.currentUser.id) {
      broadcast('push:notification', {
        id: `notif-${Date.now()}`,
        kind: 'message',
        ...pushPayload,
      });
    }

    return message;
  }

  const LIVE_LOCATION_DURATION_MS = 30 * 60 * 1000;

  function pruneExpiredLiveLocations(): boolean {
    const nowMs = Date.now();
    let changed = false;
    for (const msgs of Object.values(state.messagesByMatch)) {
      if (!Array.isArray(msgs)) continue;
      for (const msg of msgs) {
        if (msg.liveLocation && msg.liveLocation.isActive) {
          const expMs = Date.parse(msg.liveLocation.expiresAtIso);
          if (!Number.isFinite(expMs) || nowMs >= expMs) {
            msg.liveLocation = {
              ...msg.liveLocation,
              isActive: false,
            };
            changed = true;
          }
        }
      }
    }
    if (changed) {
      persistState();
    }
    return changed;
  }

  function handleStartLiveLocation(input: {
    id?: string;
    matchId: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    originClientId?: string;
  }): ChatMessage | null {
    const { matchId, latitude, longitude, accuracyMeters, originClientId } =
      input;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    const targetMatch = state.matches.find((m) => m.id === matchId);
    if (!targetMatch || isProfileBlocked(targetMatch.profileId)) {
      return null;
    }

    if (!state.messagesByMatch[matchId]) {
      state.messagesByMatch[matchId] = [];
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(
      now.getTime() + LIVE_LOCATION_DURATION_MS
    ).toISOString();

    // Stop any previous active live-location share from currentUser in this conversation
    for (const prevMsg of state.messagesByMatch[matchId]) {
      if (
        prevMsg.senderId === state.currentUser.id &&
        prevMsg.liveLocation?.isActive
      ) {
        prevMsg.liveLocation = {
          ...prevMsg.liveLocation,
          isActive: false,
          stoppedAtIso: nowIso,
          updatedAtIso: nowIso,
        };
        broadcast('location:updated', {
          matchId,
          messageId: prevMsg.id,
          liveLocation: prevMsg.liveLocation,
        });
      }
    }

    const messageId =
      input.id && input.id.trim()
        ? input.id.trim()
        : `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const existing = state.messagesByMatch[matchId].find(
      (m) => m.id === messageId
    );
    if (existing) return existing;

    const cleanAccuracy =
      typeof accuracyMeters === 'number' &&
      Number.isFinite(accuracyMeters) &&
      accuracyMeters >= 0
        ? Math.round(accuracyMeters)
        : null;

    const liveLocation: LiveLocationShare = {
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracyMeters: cleanAccuracy,
      startedAtIso: nowIso,
      expiresAtIso: expiresIso,
      updatedAtIso: nowIso,
      stoppedAtIso: null,
      isActive: true,
    };

    const message: ChatMessage = {
      id: messageId,
      matchId,
      senderId: state.currentUser.id,
      senderName: state.currentUser.name,
      text: 'Deler live-posisjon i 30 minutter',
      createdAt: formatNowTime(),
      readAt: null,
      liveLocation,
    };

    state.messagesByMatch[matchId].push(message);
    targetMatch.unreadCount = 0;

    persistState();
    broadcast('chat:message', { matchId, message });

    // Simulate read receipt from match if enabled
    const recipientId = targetMatch.profileId;
    if (PROFILE_READ_RECEIPTS[recipientId] !== false) {
      setTimeout(() => {
        const activeMatch = state.matches.find((m) => m.id === matchId);
        if (!activeMatch || isProfileBlocked(recipientId)) return;
        if (PROFILE_READ_RECEIPTS[recipientId] === false) return;

        const thread = state.messagesByMatch[matchId] || [];
        const readTimestamp = formatNowTime();
        const updatedIds: string[] = [];

        for (const msg of thread) {
          if (msg.senderId === state.currentUser.id && !msg.readAt) {
            msg.readAt = readTimestamp;
            updatedIds.push(msg.id);
          }
        }

        if (updatedIds.length > 0) {
          persistState();
          broadcast('chat:read', {
            matchId,
            readAt: readTimestamp,
            messageIds: updatedIds,
          });
        }
      }, 1350);
    }

    const pushPayload = {
      title: `${state.currentUser.name} deler live-posisjon`,
      body: 'Live-posisjon er delt i 30 minutter i samtalen.',
      tag: `loc-${matchId}`,
      data: { tab: 'messages', matchId, url: '/' },
    };
    void dispatchWebPush('message', pushPayload, originClientId);

    return message;
  }

  function handleUpdateLiveLocation(input: {
    matchId: string;
    messageId?: string;
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
  }): ChatMessage | null {
    const { matchId, messageId, latitude, longitude, accuracyMeters } = input;
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    const thread = state.messagesByMatch[matchId];
    if (!Array.isArray(thread)) return null;

    const target = messageId
      ? thread.find((m) => m.id === messageId && m.liveLocation)
      : [...thread]
          .reverse()
          .find(
            (m) =>
              m.senderId === state.currentUser.id && m.liveLocation?.isActive
          );

    if (!target || !target.liveLocation) return null;

    const nowMs = Date.now();
    const expMs = Date.parse(target.liveLocation.expiresAtIso);
    if (!target.liveLocation.isActive || nowMs >= expMs) {
      if (target.liveLocation.isActive) {
        target.liveLocation = {
          ...target.liveLocation,
          isActive: false,
        };
        persistState();
        broadcast('location:updated', {
          matchId,
          messageId: target.id,
          liveLocation: target.liveLocation,
        });
      }
      return target;
    }

    const cleanAccuracy =
      typeof accuracyMeters === 'number' &&
      Number.isFinite(accuracyMeters) &&
      accuracyMeters >= 0
        ? Math.round(accuracyMeters)
        : target.liveLocation.accuracyMeters;

    target.liveLocation = {
      ...target.liveLocation,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      accuracyMeters: cleanAccuracy,
      updatedAtIso: new Date(nowMs).toISOString(),
    };

    persistState();
    broadcast('location:updated', {
      matchId,
      messageId: target.id,
      liveLocation: target.liveLocation,
    });
    return target;
  }

  function handleStopLiveLocation(input: {
    matchId: string;
    messageId?: string;
  }): ChatMessage | null {
    const { matchId, messageId } = input;
    const thread = state.messagesByMatch[matchId];
    if (!Array.isArray(thread)) return null;

    const nowIso = new Date().toISOString();
    let updatedMsg: ChatMessage | null = null;

    for (const msg of thread) {
      if (!msg.liveLocation || !msg.liveLocation.isActive) continue;
      if (messageId && msg.id !== messageId) continue;
      if (!messageId && msg.senderId !== state.currentUser.id) continue;

      msg.liveLocation = {
        ...msg.liveLocation,
        isActive: false,
        stoppedAtIso: nowIso,
        updatedAtIso: nowIso,
      };
      updatedMsg = msg;
      broadcast('location:updated', {
        matchId,
        messageId: msg.id,
        liveLocation: msg.liveLocation,
      });
    }

    if (updatedMsg) {
      persistState();
    }
    return updatedMsg;
  }

  // Web Push API Routes
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const {
      clientId,
      subscription,
      notifyMatches = true,
      notifyMessages = true,
    } = req.body as {
      clientId?: string;
      subscription?: PushSubscription;
      notifyMatches?: boolean;
      notifyMessages?: boolean;
    };

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ error: 'Ugyldig PushSubscription' });
      return;
    }

    const idx = pushSubscriptions.findIndex(
      (s) => s.subscription.endpoint === subscription.endpoint
    );
    const record: StoredPushSubscription = {
      clientId: clientId || 'default-client',
      subscription,
      notifyMatches: Boolean(notifyMatches),
      notifyMessages: Boolean(notifyMessages),
    };

    if (idx >= 0) {
      pushSubscriptions[idx] = record;
    } else {
      pushSubscriptions.push(record);
    }
    persistPushSubscriptions();
    res.json({ ok: true, count: pushSubscriptions.length });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body as { endpoint?: string };
    if (endpoint) {
      pushSubscriptions = pushSubscriptions.filter(
        (s) => s.subscription.endpoint !== endpoint
      );
      persistPushSubscriptions();
    }
    res.json({ ok: true });
  });

  app.post('/api/push/preferences', (req, res) => {
    const { endpoint, notifyMatches, notifyMessages } = req.body as {
      endpoint?: string;
      notifyMatches?: boolean;
      notifyMessages?: boolean;
    };
    if (endpoint) {
      const target = pushSubscriptions.find(
        (s) => s.subscription.endpoint === endpoint
      );
      if (target) {
        if (typeof notifyMatches === 'boolean') {
          target.notifyMatches = notifyMatches;
        }
        if (typeof notifyMessages === 'boolean') {
          target.notifyMessages = notifyMessages;
        }
        persistPushSubscriptions();
      }
    }
    res.json({ ok: true });
  });

  app.post('/api/push/test', async (req, res) => {
    const { kind = 'message' } = req.body as { kind?: 'match' | 'message' };
    const firstMatch = state.matches[0];
    const matchId = firstMatch ? firstMatch.id : 'match-ingrid';
    const profileId = firstMatch ? firstMatch.profileId : 'ingrid';
    const partnerName = PROFILE_DISPLAY_NAMES[profileId] || 'Ingrid';

    if (kind === 'match') {
      const payload = {
        title: `Ny match med ${partnerName}!`,
        body: 'Dere har begge sveipet høyre — åpne samtalen og send en icebreaker.',
        tag: `test-match-${Date.now()}`,
        data: { tab: 'messages', matchId, url: '/' },
      };
      const delivered = await dispatchWebPush('match', payload);
      broadcast('push:notification', {
        id: `notif-${Date.now()}`,
        kind: 'match',
        ...payload,
      });
      res.json({ ok: true, delivered });
      return;
    }

    // Also add an authentic incoming message in the active match so opening the notification shows a real message!
    const incomingText =
      'Hei! Hadde du lyst til å ta en kaffe i solen en av dagene denne uken?';
    handleSendMessage({
      id: `msg-incoming-${Date.now()}`,
      matchId,
      text: incomingText,
      senderId: profileId,
      senderName: partnerName,
    });

    res.json({ ok: true });
  });

  // Standard App Routes
  app.get('/api/state', (_req, res) => {
    const rolledOver = syncDailySwipeRollover();
    const pruned = pruneExpiredLiveLocations();
    if (rolledOver && !pruned) {
      persistState();
    }
    res.json(state);
  });

  app.post('/api/swipe', async (req, res) => {
    const { profileId, direction } = req.body as {
      profileId?: string;
      direction?: 'left' | 'right';
    };
    if (!profileId || (direction !== 'left' && direction !== 'right')) {
      res.status(400).json({ error: 'Ugyldig sveip-forespørsel' });
      return;
    }
    const result = await handleSwipe(profileId, direction);
    res.json({ ...result, state });
  });

  app.post('/api/swipe-goal', (req, res) => {
    syncDailySwipeRollover();
    const { dailyGoal } = req.body as { dailyGoal?: number };
    if (typeof dailyGoal !== 'number' || !Number.isFinite(dailyGoal)) {
      res.status(400).json({ error: 'Ugyldig daglig sveipe-mål' });
      return;
    }
    state.swipeStats.dailyGoal = clampDailyGoal(
      dailyGoal,
      state.swipeStats.dailyGoal
    );
    persistState();
    broadcast('state:sync', state);
    res.json({ ok: true, swipeStats: state.swipeStats, state });
  });

  app.post('/api/rewind', (_req, res) => {
    syncDailySwipeRollover();
    const last = swipeHistoryStack.pop();
    if (!last) {
      res.json({ rewound: false, state });
      return;
    }
    state.swipedLeftIds = state.swipedLeftIds.filter(
      (id) => id !== last.profileId
    );
    state.swipedRightIds = state.swipedRightIds.filter(
      (id) => id !== last.profileId
    );
    state.swipeHistory = state.swipeHistory.filter(
      (h) => h.profileId !== last.profileId
    );
    if (last.direction === 'right' && state.swipeStats.rightCount > 0) {
      state.swipeStats.rightCount -= 1;
    } else if (last.direction === 'left' && state.swipeStats.leftCount > 0) {
      state.swipeStats.leftCount -= 1;
    }
    if (state.swipeStats.dailyCount > 0) {
      state.swipeStats.dailyCount -= 1;
    }

    if (last.previousLikeReceived) {
      const alreadyBack = state.likesReceived.some(
        (l) => l.profileId === last.previousLikeReceived?.profileId
      );
      if (!alreadyBack) {
        state.likesReceived.unshift(last.previousLikeReceived);
      }
    }
    if (last.createdMatchId) {
      state.matches = state.matches.filter((m) => m.id !== last.createdMatchId);
    }
    persistState();
    broadcast('state:sync', state);
    res.json({ rewound: true, profileId: last.profileId, state });
  });

  app.post('/api/matches/:matchId/read', (req, res) => {
    const match = state.matches.find((m) => m.id === req.params.matchId);
    if (match) {
      match.unreadCount = 0;
      if (state.currentUser.readReceiptsEnabled !== false) {
        const nowTime = formatNowTime();
        const thread = state.messagesByMatch[match.id] || [];
        for (const msg of thread) {
          if (msg.senderId !== state.currentUser.id && !msg.readAt) {
            msg.readAt = nowTime;
          }
        }
      }
      persistState();
      broadcast('state:sync', state);
    }
    res.json({ ok: true });
  });

  app.post('/api/messages', (req, res) => {
    const { id, matchId, text, isIcebreaker, clientId } = req.body as {
      id?: string;
      matchId?: string;
      text?: string;
      isIcebreaker?: boolean;
      clientId?: string;
    };
    if (!id || !matchId || !text) {
      res.status(400).json({ error: 'Mangler meldingsdata' });
      return;
    }
    const message = handleSendMessage({
      id,
      matchId,
      text,
      isIcebreaker,
      originClientId: clientId,
    });
    res.json({ message, state });
  });

  app.post('/api/matches/:matchId/live-location/start', (req, res) => {
    const { matchId } = req.params;
    const { id, latitude, longitude, accuracyMeters, clientId } = req.body as {
      id?: string;
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number | null;
      clientId?: string;
    };
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ error: 'Ugyldige GPS-koordinater' });
      return;
    }
    const message = handleStartLiveLocation({
      id,
      matchId,
      latitude,
      longitude,
      accuracyMeters,
      originClientId: clientId,
    });
    if (!message) {
      res.status(404).json({ error: 'Fant ikke gyldig samtale for posisjonsdeling' });
      return;
    }
    res.json({ ok: true, message, state });
  });

  app.post('/api/matches/:matchId/live-location/update', (req, res) => {
    const { matchId } = req.params;
    const { messageId, latitude, longitude, accuracyMeters } = req.body as {
      messageId?: string;
      latitude?: number;
      longitude?: number;
      accuracyMeters?: number | null;
    };
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ error: 'Ugyldige GPS-koordinater' });
      return;
    }
    const message = handleUpdateLiveLocation({
      matchId,
      messageId,
      latitude,
      longitude,
      accuracyMeters,
    });
    res.json({ ok: Boolean(message), message, state });
  });

  app.post('/api/matches/:matchId/live-location/stop', (req, res) => {
    const { matchId } = req.params;
    const { messageId } = req.body as { messageId?: string };
    const message = handleStopLiveLocation({ matchId, messageId });
    res.json({ ok: Boolean(message), message, state });
  });

  app.post('/api/users/block', (req, res) => {
    const { profileId, reason } = req.body as {
      profileId?: string;
      reason?: string;
    };
    if (!profileId || !profileId.trim()) {
      res.status(400).json({ error: 'Mangler bruker-ID for blokkering' });
      return;
    }
    const updatedState = handleBlockUser(profileId, reason);
    res.json({ ok: true, state: updatedState });
  });

  app.post('/api/users/unblock', (req, res) => {
    const { profileId } = req.body as { profileId?: string };
    if (!profileId || !profileId.trim()) {
      res.status(400).json({ error: 'Mangler bruker-ID' });
      return;
    }
    const updatedState = handleUnblockUser(profileId);
    res.json({ ok: true, state: updatedState });
  });

  app.post('/api/users/report', (req, res) => {
    const { profileId, matchId, reason, details, blockUser } = req.body as {
      profileId?: string;
      matchId?: string | null;
      reason?: string;
      details?: string;
      blockUser?: boolean;
    };
    if (!profileId || !profileId.trim()) {
      res.status(400).json({ error: 'Mangler bruker-ID for rapportering' });
      return;
    }
    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'Mangler årsak for rapportering' });
      return;
    }
    const result = handleReportUser({
      profileId,
      matchId,
      reason,
      details,
      blockUser,
    });
    res.json({ ok: true, report: result.report, state: result.state });
  });

  app.post('/api/verify', (req, res) => {
    const { pose, selfieDataUrl } = req.body as {
      pose?: string;
      selfieDataUrl?: string;
    };
    state.currentUser.verified = true;
    state.currentUser.verifiedAt = formatNowTime();
    state.currentUser.verificationPose = pose || 'Fredstegn ved ansiktet';
    if (selfieDataUrl) {
      state.currentUser.selfieDataUrl = selfieDataUrl;
    }
    const myStream = state.streams.find((s) => s.id === 'stream-me');
    if (myStream) {
      myStream.hostVerified = true;
    }
    persistState();
    broadcast('state:sync', state);
    res.json({ currentUser: state.currentUser, state });
  });

  app.post('/api/profile', (req, res) => {
    const {
      name,
      age,
      city,
      occupation,
      education,
      relationshipGoal,
      bio,
      interests,
      photos,
      readReceiptsEnabled,
    } = req.body as Partial<CurrentUser>;

    if (typeof name === 'string' && name.trim()) {
      state.currentUser.name = name.trim();
    }
    if (typeof age === 'number' && !Number.isNaN(age) && age >= 18 && age <= 99) {
      state.currentUser.age = Math.round(age);
    }
    if (typeof city === 'string' && city.trim()) {
      state.currentUser.city = city.trim();
    }
    if (typeof occupation === 'string') {
      state.currentUser.occupation = occupation.trim();
    }
    if (
      education === 'Videregående / Fagbrev' ||
      education === 'Bachelorgrad' ||
      education === 'Mastergrad'
    ) {
      state.currentUser.education = education;
    }
    if (
      relationshipGoal === 'Seriøst forhold' ||
      relationshipGoal === 'Åpen for det meste' ||
      relationshipGoal === 'Turvenn & bekjentskap'
    ) {
      state.currentUser.relationshipGoal = relationshipGoal;
    }
    if (typeof bio === 'string') {
      state.currentUser.bio = bio.trim();
    }
    if (Array.isArray(interests)) {
      state.currentUser.interests = interests
        .map((i) => String(i).trim())
        .filter(Boolean);
    }
    if (Array.isArray(photos)) {
      state.currentUser.photos = photos
        .map((p) => String(p))
        .filter(Boolean)
        .slice(0, 6);
    }
    if (typeof readReceiptsEnabled === 'boolean') {
      state.currentUser.readReceiptsEnabled = readReceiptsEnabled;
    }

    const myStream = state.streams.find((s) => s.id === 'stream-me');
    if (myStream) {
      myStream.hostName = state.currentUser.name;
      myStream.hostAge = state.currentUser.age;
      myStream.hostCity = state.currentUser.city;
    }

    persistState();
    broadcast('state:sync', state);
    res.json({ currentUser: state.currentUser, state });
  });

  app.post('/api/profile/video-intro', (req, res) => {
    const { videoIntroUrl, videoIntroDurationSec, videoIntroPrompt } =
      req.body as {
        videoIntroUrl?: string | null;
        videoIntroDurationSec?: number | null;
        videoIntroPrompt?: string | null;
      };

    if (!videoIntroUrl) {
      state.currentUser.videoIntroUrl = null;
      state.currentUser.videoIntroDurationSec = null;
      state.currentUser.videoIntroPrompt = null;
      state.currentUser.videoIntroUpdatedAt = null;
    } else {
      state.currentUser.videoIntroUrl = String(videoIntroUrl);
      const clampedDuration =
        typeof videoIntroDurationSec === 'number' &&
        !Number.isNaN(videoIntroDurationSec)
          ? Math.min(15, Math.max(1, Math.round(videoIntroDurationSec)))
          : 15;
      state.currentUser.videoIntroDurationSec = clampedDuration;
      state.currentUser.videoIntroPrompt =
        typeof videoIntroPrompt === 'string' && videoIntroPrompt.trim()
          ? videoIntroPrompt.trim().slice(0, 120)
          : null;
      state.currentUser.videoIntroUpdatedAt = `I dag, ${formatNowTime()}`;
    }

    persistState();
    broadcast('state:sync', state);
    res.json({ ok: true, currentUser: state.currentUser, state });
  });

  app.post('/api/ai/dating-coach', async (req, res) => {
    try {
      const {
        name,
        age,
        city,
        occupation,
        education,
        relationshipGoal,
        bio,
        interests,
        photos,
        verified,
        hasVideoIntro,
      } = (req.body || {}) as {
        name?: string;
        age?: number;
        city?: string;
        occupation?: string;
        education?: string;
        relationshipGoal?: string;
        bio?: string;
        interests?: string[];
        photos?: string[];
        verified?: boolean;
        hasVideoIntro?: boolean;
      };

      const ai = getGenAIClient();

      const cleanName =
        typeof name === 'string' && name.trim()
          ? name.trim()
          : state.currentUser.name;
      const cleanAge =
        typeof age === 'number' && Number.isFinite(age)
          ? age
          : state.currentUser.age;
      const cleanCity =
        typeof city === 'string' && city.trim()
          ? city.trim()
          : state.currentUser.city;
      const cleanOccupation =
        typeof occupation === 'string'
          ? occupation.trim()
          : state.currentUser.occupation;
      const cleanEducation =
        typeof education === 'string' && education.trim()
          ? education.trim()
          : state.currentUser.education;
      const cleanGoal =
        typeof relationshipGoal === 'string' && relationshipGoal.trim()
          ? relationshipGoal.trim()
          : state.currentUser.relationshipGoal;
      const cleanBio =
        typeof bio === 'string' ? bio.trim() : state.currentUser.bio;
      const cleanInterests = Array.isArray(interests)
        ? interests.map((item) => String(item).trim()).filter(Boolean)
        : state.currentUser.interests;
      const rawPhotos = Array.isArray(photos) ? photos.slice(0, 6) : [];
      const photoCount = rawPhotos.length;
      const isVerified =
        typeof verified === 'boolean' ? verified : state.currentUser.verified;
      const videoActive =
        typeof hasVideoIntro === 'boolean'
          ? hasVideoIntro
          : Boolean(state.currentUser.videoIntroUrl);

      const inlineImageParts = rawPhotos
        .map((src) =>
          typeof src === 'string' ? resolvePhotoToInlineData(src) : null
        )
        .filter((item): item is { mimeType: string; data: string } => Boolean(item))
        .slice(0, 3)
        .map((img) => ({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        }));

      const promptText = [
        'Analyser følgende brukerprofil for en moderne norsk dating-app og gi konstruktive, konkrete råd basert på beste praksis for dating-apper:',
        `- Navn og alder: ${cleanName}, ${cleanAge} år`,
        `- By: ${cleanCity}`,
        `- Yrke/studier: ${cleanOccupation || 'Ikke oppgitt'}`,
        `- Utdanning: ${cleanEducation}`,
        `- Relasjonsmål: ${cleanGoal}`,
        `- Interesser (${cleanInterests.length}): ${
          cleanInterests.length > 0 ? cleanInterests.join(', ') : 'Ingen valgt ennå'
        }`,
        `- Nåværende biografi (${cleanBio.length} tegn): "${
          cleanBio || '(Tom biografi)'
        }"`,
        `- Antall profilbilder lagt inn: ${photoCount} av maks 6${
          inlineImageParts.length > 0
            ? ` (${inlineImageParts.length} profilbilder er lagt ved visuelt i rekkefølge fra bilde 1 — vurder lys, utsnitt, blikkontakt, smil, variasjon og rekkefølge konkret og vennlig)`
            : ' (gi konkrete råd basert på antall bilder, rekkefølge og hvordan bildene bør speile interessene)'
        }`,
        `- Selfie-verifisert: ${isVerified ? 'Ja' : 'Nei'}`,
        `- 15-sekunders video-intro: ${videoActive ? 'Ja' : 'Nei'}`,
        '',
        'Beste praksis du skal vurdere etter:',
        '1. Biografi: Vis frem personlighet med spesifikke hverdagsdetaljer («vis, ikke bare fortell») fremfor generelle klisjeer, match tonen med relasjonsmålet, hold lengden rundt 120–280 tegn, og avslutt med en konkret krok eller et spørsmål som gjør det lett å starte en samtale.',
        '2. Profilbilder: Hovedbildet (bilde 1) bør være et klart portrett i godt dagslys med ekte smil og direkte øyekontakt uten solbriller. Ideelt sett 4–6 varierte bilder som viser helfigur, ekte øyeblikk fra hobbyer/interesser og varme omgivelser uten forvirrende gruppebilder først.',
        'Svar kun på naturlig, vennlig og konkret norsk (bokmål) uten emojier.',
      ].join('\n');

      const contents =
        inlineImageParts.length > 0
          ? { parts: [...inlineImageParts, { text: promptText }] }
          : promptText;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          systemInstruction:
            'Du er en erfaren, varm og konstruktiv norsk dating-coach. Du gir presise, oppmuntrende og praktiske forbedringsråd for biografi og profilbilder basert på beste praksis for dating-apper, uten klisjeer eller emojier.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  'Kort, varm og ærlig oppsummering på 1–2 setninger om profilens helhetsinntrykk og viktigste løft.',
              },
              bioStrengths: {
                type: Type.STRING,
                description:
                  '1 konkret setning om hva som allerede fungerer bra i biografien (eller hvilke interesser brukeren bør bygge på dersom bioen er kort).',
              },
              bioTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Nøyaktig 3 konkrete og handlingsrettede råd for å forbedre biografien etter beste praksis.',
              },
              bioVariants: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tone: {
                      type: Type.STRING,
                      description:
                        'Kort navn på stilen, f.eks. "Varm og personlig" eller "Leken og nysgjerrig".',
                    },
                    text: {
                      type: Type.STRING,
                      description:
                        'Ferdigskrevet norsk biografi (130–270 tegn) tilpasset brukerens interesser, yrke og relasjonsmål, avsluttet med en naturlig samtalestarter.',
                    },
                  },
                  required: ['tone', 'text'],
                },
                description:
                  'Nøyaktig 2 ulike forslag til forbedret biografi med ulik tone.',
              },
              photoStrengths: {
                type: Type.STRING,
                description:
                  '1 konkret setning om hva som allerede fungerer fint med nåværende profilbilder eller visuelt uttrykk.',
              },
              photoTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Nøyaktig 3 konkrete råd for utvalg, rekkefølge, blikkontakt/lys og variasjon i profilbildene basert på beste praksis.',
              },
              nextPhotoIdea: {
                type: Type.STRING,
                description:
                  '1 spesifikk og enkel idé til et nytt profilbilde brukeren bør legge til, direkte knyttet til interessene deres.',
              },
            },
            required: [
              'summary',
              'bioStrengths',
              'bioTips',
              'bioVariants',
              'photoStrengths',
              'photoTips',
              'nextPhotoIdea',
            ],
          },
        },
      });

      const rawJson = response.text || '{}';
      const parsed = JSON.parse(rawJson) as {
        summary?: string;
        bioStrengths?: string;
        bioTips?: string[];
        suggestedBio?: string;
        bioVariants?: Array<{ tone?: string; text?: string }>;
        photoStrengths?: string;
        photoTips?: string[];
        nextPhotoIdea?: string;
      };

      const cleanedVariants = Array.isArray(parsed.bioVariants)
        ? parsed.bioVariants
            .map((v) => ({
              tone:
                typeof v?.tone === 'string' && v.tone.trim()
                  ? v.tone.trim().slice(0, 40)
                  : 'Forslag',
              text:
                typeof v?.text === 'string' && v.text.trim()
                  ? v.text.trim().slice(0, 400)
                  : '',
            }))
            .filter((v) => Boolean(v.text))
            .slice(0, 2)
        : [];

      const primarySuggestedBio =
        cleanedVariants[0]?.text ||
        (typeof parsed.suggestedBio === 'string' && parsed.suggestedBio.trim()
          ? parsed.suggestedBio.trim().slice(0, 400)
          : cleanBio);

      const advice = {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : 'Profilen din har et varmt utgangspunkt, og med litt mer konkrete detaljer i bio og bildevariasjon blir det enda enklere å starte gode samtaler.',
        bioStrengths:
          typeof parsed.bioStrengths === 'string' && parsed.bioStrengths.trim()
            ? parsed.bioStrengths.trim()
            : 'Interessene dine gir et tydelig bilde av hva du trives med i hverdagen.',
        bioTips: Array.isArray(parsed.bioTips)
          ? parsed.bioTips
              .map((t) => String(t).trim())
              .filter(Boolean)
              .slice(0, 3)
          : [],
        suggestedBio: primarySuggestedBio,
        bioVariants:
          cleanedVariants.length > 0
            ? cleanedVariants
            : primarySuggestedBio
              ? [{ tone: 'Varm og personlig', text: primarySuggestedBio }]
              : [],
        photoStrengths:
          typeof parsed.photoStrengths === 'string' &&
          parsed.photoStrengths.trim()
            ? parsed.photoStrengths.trim()
            : 'Bildene dine formidler naturlig lys og en imøtekommende stemning.',
        photoTips: Array.isArray(parsed.photoTips)
          ? parsed.photoTips
              .map((t) => String(t).trim())
              .filter(Boolean)
              .slice(0, 3)
          : [],
        nextPhotoIdea:
          typeof parsed.nextPhotoIdea === 'string' && parsed.nextPhotoIdea.trim()
            ? parsed.nextPhotoIdea.trim()
            : 'Et naturlig bilde i dagslys der du holder på med en av favorittinteressene dine.',
        generatedAt: formatNowTime(),
      };

      res.json({ ok: true, advice });
    } catch (err) {
      const mapped = mapGeminiErrorToNorwegian(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/ai/icebreakers', async (req, res) => {
    try {
      const { matchId, partner, previousIcebreakers } = (req.body || {}) as {
        matchId?: string;
        partner?: {
          id?: string;
          name?: string;
          age?: number;
          city?: string;
          occupation?: string;
          relationshipGoal?: string;
          bio?: string;
          interests?: string[];
        };
        previousIcebreakers?: string[];
      };

      if (!partner || !partner.name) {
        res.status(400).json({ error: 'Mangler informasjon om matchen.' });
        return;
      }

      const ai = getGenAIClient();

      const partnerInterests = Array.isArray(partner.interests)
        ? partner.interests.map((i) => String(i).trim()).filter(Boolean)
        : [];
      const myInterests = state.currentUser.interests || [];
      const sharedInterests = partnerInterests.filter((pi) =>
        myInterests.some((mi) => mi.toLowerCase() === pi.toLowerCase())
      );
      const prevList = Array.isArray(previousIcebreakers)
        ? previousIcebreakers.map((s) => String(s).trim()).filter(Boolean)
        : [];

      const prompt = [
        `Lag nøyaktig 3 kreative, sjarmerende og naturlige samtalestartere (icebreakers) på norsk til en ny match i en dating-app.`,
        '',
        `Om matchen (${partner.name}):`,
        `- Alder og by: ${partner.age || ''} år, ${partner.city || ''}`,
        `- Yrke/studier: ${partner.occupation || 'Ikke oppgitt'}`,
        `- Ser etter: ${partner.relationshipGoal || 'Ikke oppgitt'}`,
        `- Matchens interesser: ${
          partnerInterests.length > 0
            ? partnerInterests.join(', ')
            : 'Generelle fritidsinteresser'
        }`,
        `- Matchens biografi: "${partner.bio || ''}"`,
        '',
        `Om avsenderen (${state.currentUser.name}):`,
        `- Egne interesser: ${myInterests.join(', ')}`,
        sharedInterests.length > 0
          ? `- Felles interesser mellom dem: ${sharedInterests.join(', ')}`
          : '',
        prevList.length > 0
          ? `- Unngå å gjenta disse tidligere forslagene: ${prevList
              .map((q) => `"${q}"`)
              .join(' | ')}`
          : '',
        '',
        'Krav til de 3 forslagene:',
        '- Hvert forslag MÅ ta utgangspunkt i matchens spesifikke interesser (og gjerne koble inn biografi eller felles interesser der det passer naturlig).',
        '- Varier vinklingen mellom de 3 forslagene (f.eks. ett lekent enten/eller-spørsmål, ett nysgjerrig spørsmål om en konkret interesse, og ett forslag med et lite glimt i øyet om en ideell aktivitet).',
        '- Hold hvert forslag kort og lettlest (1 setning, maks 125 tegn) uten klisjeer og uten emojier.',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          systemInstruction:
            'Du lager treffsikre, varme og kreative norske samtalestartere for en dating-app basert på matchens interesser. Ingen emojier, ingen generiske høflighetsfraser.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              icebreakers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Nøyaktig 3 kreative norske samtalestartere tilpasset matchens interesser.',
              },
            },
            required: ['icebreakers'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}') as {
        icebreakers?: string[];
      };

      const cleaned = Array.isArray(parsed.icebreakers)
        ? parsed.icebreakers
            .map((item) => String(item).trim())
            .filter(Boolean)
            .slice(0, 3)
        : [];

      if (cleaned.length < 3) {
        throw new Error('Fikk for få forslag fra modellen.');
      }

      const nextTuple: [string, string, string] = [
        cleaned[0],
        cleaned[1],
        cleaned[2],
      ];

      if (matchId) {
        const targetMatch = state.matches.find((m) => m.id === matchId);
        if (targetMatch) {
          targetMatch.icebreakers = nextTuple;
          persistState();
          broadcast('state:sync', state);
        }
      }

      res.json({ ok: true, icebreakers: nextTuple, state });
    } catch (err) {
      const mapped = mapGeminiErrorToNorwegian(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  app.post('/api/streams/start', (req, res) => {
    const { title, topic } = req.body as { title?: string; topic?: string };
    const existingIdx = state.streams.findIndex((s) => s.id === 'stream-me');
    const newRoom: LiveStreamRoom = {
      id: 'stream-me',
      hostProfileId: 'me',
      hostName: state.currentUser.name,
      hostAge: state.currentUser.age,
      hostCity: state.currentUser.city,
      hostVerified: state.currentUser.verified,
      title: (title && title.trim()) || 'Direktesending — kom inn og si hei!',
      topic: (topic && topic.trim()) || 'Åpen prat · Bli kjent',
      viewerCount: 18,
      likesCount: 24,
      isUserHost: true,
      startedAt: 'Direkte nå',
      pinnedCommentId: null,
      mutedAuthorIds: [],
      comments: [
        {
          id: `c-me-welcome-${Date.now()}`,
          streamId: 'stream-me',
          authorId: 'me',
          authorName: state.currentUser.name,
          authorVerified: state.currentUser.verified,
          text: 'Sendingen er i gang! Hyggelig at du titter innom.',
          createdAt: formatNowTime(),
        },
      ],
    };
    if (existingIdx >= 0) {
      state.streams[existingIdx] = newRoom;
    } else {
      state.streams.unshift(newRoom);
    }
    persistState();
    broadcast('state:sync', state);
    res.json({ stream: newRoom, state });
  });

  app.post('/api/streams/stop', (_req, res) => {
    state.streams = state.streams.filter((s) => s.id !== 'stream-me');
    persistState();
    broadcast('state:sync', state);
    res.json({ ok: true, state });
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ event: 'state:sync', payload: state }));

    ws.on('message', (rawBuffer) => {
      try {
        const parsed = JSON.parse(rawBuffer.toString()) as {
          event: string;
          payload: Record<string, unknown>;
        };

        switch (parsed.event) {
          case 'chat:send': {
            const id = String(parsed.payload.id || '');
            const matchId = String(parsed.payload.matchId || '');
            const text = String(parsed.payload.text || '');
            const isIcebreaker = Boolean(parsed.payload.isIcebreaker);
            const originClientId = String(parsed.payload.clientId || '');
            if (id && matchId && text) {
              handleSendMessage({
                id,
                matchId,
                text,
                isIcebreaker,
                originClientId,
              });
            }
            break;
          }

          case 'location:update': {
            const matchId = String(parsed.payload.matchId || '');
            const messageId = parsed.payload.messageId
              ? String(parsed.payload.messageId)
              : undefined;
            const latitude = Number(parsed.payload.latitude);
            const longitude = Number(parsed.payload.longitude);
            const accuracyMeters =
              typeof parsed.payload.accuracyMeters === 'number'
                ? parsed.payload.accuracyMeters
                : null;
            if (matchId && Number.isFinite(latitude) && Number.isFinite(longitude)) {
              handleUpdateLiveLocation({
                matchId,
                messageId,
                latitude,
                longitude,
                accuracyMeters,
              });
            }
            break;
          }

          case 'location:stop': {
            const matchId = String(parsed.payload.matchId || '');
            const messageId = parsed.payload.messageId
              ? String(parsed.payload.messageId)
              : undefined;
            if (matchId) {
              handleStopLiveLocation({ matchId, messageId });
            }
            break;
          }

          case 'user:block': {
            const profileId = String(parsed.payload.profileId || '');
            const reason = String(parsed.payload.reason || '');
            if (profileId) {
              handleBlockUser(profileId, reason);
            }
            break;
          }

          case 'user:unblock': {
            const profileId = String(parsed.payload.profileId || '');
            if (profileId) {
              handleUnblockUser(profileId);
            }
            break;
          }

          case 'user:report': {
            const profileId = String(parsed.payload.profileId || '');
            const matchId = parsed.payload.matchId
              ? String(parsed.payload.matchId)
              : null;
            const reason = String(parsed.payload.reason || '');
            const details = String(parsed.payload.details || '');
            const blockUser = Boolean(parsed.payload.blockUser);
            if (profileId && reason) {
              handleReportUser({
                profileId,
                matchId,
                reason,
                details,
                blockUser,
              });
            }
            break;
          }

          case 'stream:comment': {
            const id = String(parsed.payload.id || '');
            const streamId = String(parsed.payload.streamId || '');
            const text = String(parsed.payload.text || '').trim();
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream || !id || !text) break;
            if (stream.mutedAuthorIds.includes(state.currentUser.id)) break;
            if (stream.comments.some((c) => c.id === id)) break;

            const comment: StreamComment = {
              id,
              streamId,
              authorId: state.currentUser.id,
              authorName: state.currentUser.name,
              authorVerified: state.currentUser.verified,
              text,
              createdAt: formatNowTime(),
            };
            stream.comments.push(comment);
            persistState();
            broadcast('stream:comment_added', { streamId, comment });
            break;
          }

          case 'stream:like': {
            const streamId = String(parsed.payload.streamId || '');
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) break;
            stream.likesCount += 1;
            persistState();
            broadcast('stream:liked', {
              streamId,
              likesCount: stream.likesCount,
            });
            break;
          }

          case 'stream:moderate': {
            const streamId = String(parsed.payload.streamId || '');
            const action = String(parsed.payload.action || '');
            const commentId = String(parsed.payload.commentId || '');
            const authorId = String(parsed.payload.authorId || '');
            const stream = state.streams.find((s) => s.id === streamId);
            if (!stream) break;

            if (action === 'delete' && commentId) {
              const target = stream.comments.find((c) => c.id === commentId);
              if (target) target.deleted = true;
              if (stream.pinnedCommentId === commentId) {
                stream.pinnedCommentId = null;
              }
            } else if (action === 'pin' && commentId) {
              stream.pinnedCommentId =
                stream.pinnedCommentId === commentId ? null : commentId;
            } else if (action === 'mute' && authorId) {
              if (stream.mutedAuthorIds.includes(authorId)) {
                stream.mutedAuthorIds = stream.mutedAuthorIds.filter(
                  (a) => a !== authorId
                );
              } else {
                stream.mutedAuthorIds.push(authorId);
              }
            }
            persistState();
            broadcast('stream:moderated', { streamId, stream });
            break;
          }

          default:
            break;
        }
      } catch {
        // Ignore malformed socket frames
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Gnist server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
