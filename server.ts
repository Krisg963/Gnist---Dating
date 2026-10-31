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
  icebreakers: [string, string, string];
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  isIcebreaker?: boolean;
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

interface ServerState {
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

function createInitialState(): ServerState {
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
    },
    swipeStats: {
      rightCount: 5,
      leftCount: 3,
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
        matchedAt: 'I dag, 19:20',
        icebreakers: ICEBREAKERS_BY_PROFILE.ingrid,
        unreadCount: 1,
      },
    ],
    messagesByMatch: {
      'match-ingrid': [
        {
          id: 'msg-seed-1',
          matchId: 'match-ingrid',
          senderId: 'ingrid',
          senderName: 'Ingrid',
          text: 'Hei! Så hyggelig at vi matchet. Håper uken din har startet bra!',
          createdAt: '19:22',
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
      return {
        ...defaults,
        ...raw,
        currentUser: {
          ...defaults.currentUser,
          ...(raw.currentUser || {}),
        },
        swipeStats: {
          ...defaults.swipeStats,
          ...(raw.swipeStats || {}),
        },
        swipeHistory: Array.isArray(raw.swipeHistory)
          ? raw.swipeHistory.slice(0, 10)
          : defaults.swipeHistory,
        blockedUsers: Array.isArray(raw.blockedUsers) ? raw.blockedUsers : [],
      };
    }
  } catch {
    // Fallback to clean initial state
  }
  return defaults;
}

const state: ServerState = loadState();

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
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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

  function recordSwipeHistory(entry: SwipeHistoryEntry) {
    state.swipeHistory = [
      entry,
      ...state.swipeHistory.filter((h) => h.profileId !== entry.profileId),
    ].slice(0, 10);
  }

  async function handleSwipe(profileId: string, direction: 'left' | 'right') {
    if (isProfileBlocked(profileId)) {
      return { matched: false, match: null };
    }

    // Already swiped right: preserve existing decision/match
    if (state.swipedRightIds.includes(profileId)) {
      const existingMatch =
        state.matches.find((m) => m.profileId === profileId) || null;
      return { matched: Boolean(existingMatch), match: existingMatch };
    }

    // Already swiped left: if passing again, no-op; if liking now (fixing a feilsveip from Sveipe-historikk!), allow changing to right!
    if (state.swipedLeftIds.includes(profileId)) {
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
        match = {
          id: matchId,
          profileId,
          matchedAt: `I dag, ${formatNowTime()}`,
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

  app.post('/api/rewind', (_req, res) => {
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
      server: { middlewareMode: true },
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
