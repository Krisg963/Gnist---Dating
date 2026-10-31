import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateClientId } from './usePushNotifications';
import type {
  ChatMessage,
  CurrentUser,
  LiveLocationShare,
  LiveStreamRoom,
  MatchRecord,
  PushToastNotification,
  ServerState,
  StreamComment,
} from '../types';

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const INITIAL_FALLBACK_STATE: ServerState = {
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
    dailyDate: getTodayDateKey(),
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
      matchedAt: `${new Date().toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })} kl. 19:20`,
      matchedAtIso: new Date().toISOString(),
      icebreakers: [
        'Hvilken kafé i Oslo lager egentlig byens beste cortado?',
        'Søndagstur i Nordmarka med termos eller lang brunsj på Grünerløkka?',
        'Hva er den siste boka du leste som du fortsatt tenker på?',
      ],
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
  streams: [],
};

export function useRealtimeApp() {
  const [serverState, setServerState] = useState<ServerState>(
    INITIAL_FALLBACK_STATE
  );
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [celebratingMatch, setCelebratingMatch] = useState<MatchRecord | null>(
    null
  );
  const [activePushToast, setActivePushToast] =
    useState<PushToastNotification | null>(null);
  const [locationRequestingMatchId, setLocationRequestingMatchId] = useState<
    string | null
  >(null);
  const [locationErrorByMatch, setLocationErrorByMatch] = useState<
    Record<string, string | null>
  >({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const locationWatchersRef = useRef<
    Record<
      string,
      {
        watchId: number;
        expiryTimer: number;
        messageId: string;
        lastSentAt: number;
      }
    >
  >({});

  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = (await res.json()) as ServerState;
        setServerState((prev) => ({
          ...prev,
          ...data,
          currentUser: { ...prev.currentUser, ...data.currentUser },
          swipeStats: data.swipeStats || prev.swipeStats,
          swipeHistory: Array.isArray(data.swipeHistory)
            ? data.swipeHistory.slice(0, 10)
            : prev.swipeHistory,
          blockedUsers: Array.isArray(data.blockedUsers)
            ? data.blockedUsers
            : prev.blockedUsers,
          reportedUsers: Array.isArray(data.reportedUsers)
            ? data.reportedUsers
            : prev.reportedUsers,
        }));
      }
    } catch {
      // Offline mode uses cached/local state gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServerState();

    let unmounted = false;

    const connectWs = () => {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (unmounted) {
          socket.close();
          return;
        }
        setWsConnected(true);
      };

      socket.onerror = () => {
        // Handled via onclose reconnect backoff
      };

      socket.onmessage = (evt) => {
        try {
          const { event, payload } = JSON.parse(evt.data) as {
            event: string;
            payload: unknown;
          };

          if (event === 'state:sync') {
            const incoming = payload as ServerState;
            setServerState((prev) => ({
              ...prev,
              ...incoming,
              currentUser: { ...prev.currentUser, ...incoming.currentUser },
              swipeStats: incoming.swipeStats || prev.swipeStats,
              swipeHistory: Array.isArray(incoming.swipeHistory)
                ? incoming.swipeHistory.slice(0, 10)
                : prev.swipeHistory,
              blockedUsers: Array.isArray(incoming.blockedUsers)
                ? incoming.blockedUsers
                : prev.blockedUsers,
              reportedUsers: Array.isArray(incoming.reportedUsers)
                ? incoming.reportedUsers
                : prev.reportedUsers,
            }));
            setLoading(false);
          } else if (event === 'chat:message') {
            const { matchId, message } = payload as {
              matchId: string;
              message: ChatMessage;
            };
            setServerState((prev) => {
              const existing = prev.messagesByMatch[matchId] || [];
              if (existing.some((m) => m.id === message.id)) {
                return {
                  ...prev,
                  messagesByMatch: {
                    ...prev.messagesByMatch,
                    [matchId]: existing.map((m) =>
                      m.id === message.id ? { ...m, ...message } : m
                    ),
                  },
                };
              }
              return {
                ...prev,
                messagesByMatch: {
                  ...prev.messagesByMatch,
                  [matchId]: [...existing, message],
                },
              };
            });
          } else if (event === 'chat:read') {
            const { matchId, readAt, messageIds } = payload as {
              matchId: string;
              readAt: string;
              messageIds: string[];
            };
            const idSet = new Set(messageIds);
            setServerState((prev) => {
              const existing = prev.messagesByMatch[matchId];
              if (!existing) return prev;
              return {
                ...prev,
                messagesByMatch: {
                  ...prev.messagesByMatch,
                  [matchId]: existing.map((m) =>
                    idSet.has(m.id) ? { ...m, readAt } : m
                  ),
                },
              };
            });
          } else if (event === 'location:updated') {
            const { matchId, messageId, liveLocation } = payload as {
              matchId: string;
              messageId: string;
              liveLocation: LiveLocationShare;
            };
            if (!liveLocation.isActive) {
              const watcher = locationWatchersRef.current[matchId];
              if (watcher && watcher.messageId === messageId) {
                if ('geolocation' in navigator && navigator.geolocation) {
                  navigator.geolocation.clearWatch(watcher.watchId);
                }
                clearTimeout(watcher.expiryTimer);
                delete locationWatchersRef.current[matchId];
              }
            }
            setServerState((prev) => {
              const existing = prev.messagesByMatch[matchId];
              if (!existing) return prev;
              return {
                ...prev,
                messagesByMatch: {
                  ...prev.messagesByMatch,
                  [matchId]: existing.map((m) =>
                    m.id === messageId ? { ...m, liveLocation } : m
                  ),
                },
              };
            });
          } else if (event === 'push:notification') {
            const notif = payload as PushToastNotification;
            setActivePushToast(notif);
            if (toastTimerRef.current) {
              clearTimeout(toastTimerRef.current);
            }
            toastTimerRef.current = window.setTimeout(() => {
              setActivePushToast((current) =>
                current?.id === notif.id ? null : current
              );
            }, 5200);
          } else if (event === 'stream:comment_added') {
            const { streamId, comment } = payload as {
              streamId: string;
              comment: StreamComment;
            };
            setServerState((prev) => ({
              ...prev,
              streams: prev.streams.map((s) => {
                if (s.id !== streamId) return s;
                if (s.comments.some((c) => c.id === comment.id)) return s;
                return { ...s, comments: [...s.comments, comment] };
              }),
            }));
          } else if (event === 'stream:liked') {
            const { streamId, likesCount } = payload as {
              streamId: string;
              likesCount: number;
            };
            setServerState((prev) => ({
              ...prev,
              streams: prev.streams.map((s) =>
                s.id === streamId ? { ...s, likesCount } : s
              ),
            }));
          } else if (event === 'stream:moderated') {
            const { streamId, stream } = payload as {
              streamId: string;
              stream: LiveStreamRoom;
            };
            setServerState((prev) => ({
              ...prev,
              streams: prev.streams.map((s) => (s.id === streamId ? stream : s)),
            }));
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        if (!unmounted) {
          reconnectTimerRef.current = window.setTimeout(connectWs, 2500);
        }
      };
    };

    connectWs();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      for (const watcher of Object.values(locationWatchersRef.current)) {
        if ('geolocation' in navigator && navigator.geolocation) {
          navigator.geolocation.clearWatch(watcher.watchId);
        }
        clearTimeout(watcher.expiryTimer);
      }
      locationWatchersRef.current = {};
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        wsRef.current.close();
      }
    };
  }, [fetchServerState]);

  const swipeProfile = useCallback(
    async (profileId: string, direction: 'left' | 'right') => {
      try {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, direction }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            matched: boolean;
            match: MatchRecord | null;
            state: ServerState;
          };
          setServerState(data.state);
          if (data.matched && data.match) {
            setCelebratingMatch(data.match);
          }
          return data;
        }
      } catch {
        const nowTime = new Date().toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setServerState((prev) => {
          const wasLeft = prev.swipedLeftIds.includes(profileId);
          const wasRight = prev.swipedRightIds.includes(profileId);
          const todayKey = getTodayDateKey();
          const baseDailyCount =
            prev.swipeStats.dailyDate === todayKey
              ? prev.swipeStats.dailyCount
              : 0;
          const isNewDailySwipe = !wasLeft && !wasRight;
          return {
            ...prev,
            swipedRightIds:
              direction === 'right' && !wasRight
                ? [...prev.swipedRightIds, profileId]
                : prev.swipedRightIds,
            swipedLeftIds:
              direction === 'left' && !wasLeft
                ? [...prev.swipedLeftIds, profileId]
                : direction === 'right'
                  ? prev.swipedLeftIds.filter((id) => id !== profileId)
                  : prev.swipedLeftIds,
            swipeHistory: [
              {
                profileId,
                direction,
                swipedAt: `I dag, ${nowTime}`,
                matched: false,
              },
              ...prev.swipeHistory.filter((h) => h.profileId !== profileId),
            ].slice(0, 10),
            swipeStats: {
              ...prev.swipeStats,
              rightCount:
                prev.swipeStats.rightCount +
                (direction === 'right' && !wasRight ? 1 : 0),
              leftCount: Math.max(
                0,
                prev.swipeStats.leftCount +
                  (direction === 'left' && !wasLeft ? 1 : wasLeft ? -1 : 0)
              ),
              dailyCount: baseDailyCount + (isNewDailySwipe ? 1 : 0),
              dailyDate: todayKey,
            },
          };
        });
      }
      return { matched: false, match: null };
    },
    []
  );

  const rewindSwipe = useCallback(async () => {
    try {
      const res = await fetch('/api/rewind', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { rewound: boolean; state: ServerState };
        setServerState(data.state);
        return data.rewound;
      }
    } catch {
      // Ignore
    }
    return false;
  }, []);

  const markMatchRead = useCallback(async (matchId: string) => {
    setServerState((prev) => ({
      ...prev,
      matches: prev.matches.map((m) =>
        m.id === matchId ? { ...m, unreadCount: 0 } : m
      ),
    }));
    try {
      await fetch(`/api/matches/${encodeURIComponent(matchId)}/read`, {
        method: 'POST',
      });
    } catch {
      // Ignore offline error
    }
  }, []);

  const sendMessage = useCallback(
    async (matchId: string, text: string, isIcebreaker = false) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const clientId = getOrCreateClientId();
      const nowTime = new Date().toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const optimisticMessage: ChatMessage = {
        id,
        matchId,
        senderId: serverState.currentUser.id,
        senderName: serverState.currentUser.name,
        text: trimmed,
        createdAt: nowTime,
        isIcebreaker,
        readAt: null,
      };

      setServerState((prev) => {
        const existing = prev.messagesByMatch[matchId] || [];
        if (existing.some((m) => m.id === id)) return prev;
        return {
          ...prev,
          messagesByMatch: {
            ...prev.messagesByMatch,
            [matchId]: [...existing, optimisticMessage],
          },
        };
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'chat:send',
            payload: { id, matchId, text: trimmed, isIcebreaker, clientId },
          })
        );
      } else {
        try {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              matchId,
              text: trimmed,
              isIcebreaker,
              clientId,
            }),
          });
        } catch {
          // Offline mode keeps optimistic message
        }
      }
    },
    [serverState.currentUser.id, serverState.currentUser.name]
  );

  const clearLocationWatcherForMatch = useCallback((matchId: string) => {
    const existingWatcher = locationWatchersRef.current[matchId];
    if (existingWatcher) {
      if ('geolocation' in navigator && navigator.geolocation) {
        navigator.geolocation.clearWatch(existingWatcher.watchId);
      }
      clearTimeout(existingWatcher.expiryTimer);
      delete locationWatchersRef.current[matchId];
    }
  }, []);

  const clearLocationError = useCallback((matchId: string) => {
    setLocationErrorByMatch((prev) => ({ ...prev, [matchId]: null }));
  }, []);

  const stopLiveLocation = useCallback(
    async (matchId: string, messageId?: string) => {
      clearLocationWatcherForMatch(matchId);
      const nowIso = new Date().toISOString();

      setServerState((prev) => {
        const thread = prev.messagesByMatch[matchId];
        if (!thread) return prev;
        return {
          ...prev,
          messagesByMatch: {
            ...prev.messagesByMatch,
            [matchId]: thread.map((msg) => {
              if (!msg.liveLocation || !msg.liveLocation.isActive) return msg;
              if (messageId && msg.id !== messageId) return msg;
              if (!messageId && msg.senderId !== prev.currentUser.id) return msg;
              return {
                ...msg,
                liveLocation: {
                  ...msg.liveLocation,
                  isActive: false,
                  stoppedAtIso: nowIso,
                  updatedAtIso: nowIso,
                },
              };
            }),
          },
        };
      });

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'location:stop',
            payload: { matchId, messageId },
          })
        );
      } else {
        try {
          await fetch(
            `/api/matches/${encodeURIComponent(matchId)}/live-location/stop`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId }),
            }
          );
        } catch {
          // Offline mode keeps local stopped state
        }
      }
    },
    [clearLocationWatcherForMatch]
  );

  const startLiveLocation = useCallback(
    async (matchId: string): Promise<boolean> => {
      if (
        typeof navigator === 'undefined' ||
        !('geolocation' in navigator) ||
        !navigator.geolocation
      ) {
        setLocationErrorByMatch((prev) => ({
          ...prev,
          [matchId]:
            'Nettleseren din støtter ikke Geolocation API for deling av live-posisjon.',
        }));
        return false;
      }

      setLocationErrorByMatch((prev) => ({ ...prev, [matchId]: null }));
      setLocationRequestingMatchId(matchId);

      const getInitialPosition = (): Promise<GeolocationPosition> =>
        new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            (firstErr) => {
              if (firstErr.code === 3) {
                // Retry once with standard accuracy if high-accuracy GPS timed out indoors
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  enableHighAccuracy: false,
                  timeout: 10000,
                  maximumAge: 30000,
                });
              } else {
                reject(firstErr);
              }
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 10000,
            }
          );
        });

      let position: GeolocationPosition;
      try {
        position = await getInitialPosition();
      } catch (err: unknown) {
        const geoErr = err as { code?: number };
        let errorMsg =
          'Kunne ikke hente nåværende posisjon. Kontroller at posisjonstjenester er påslått.';
        if (geoErr?.code === 1) {
          errorMsg =
            'Tilgang til posisjon ble avslått. Tillat posisjonstilgang i nettleseren for å dele live-posisjon i 30 minutter.';
        } else if (geoErr?.code === 2) {
          errorMsg =
            'Posisjonen din er ikke tilgjengelig akkurat nå. Sjekk GPS- eller nettverksdekning.';
        } else if (geoErr?.code === 3) {
          errorMsg =
            'Tidsavbrudd ved innhenting av posisjon. Prøv igjen et sted med bedre dekning.';
        }
        setLocationErrorByMatch((prev) => ({
          ...prev,
          [matchId]: errorMsg,
        }));
        setLocationRequestingMatchId((curr) =>
          curr === matchId ? null : curr
        );
        return false;
      }

      clearLocationWatcherForMatch(matchId);

      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const accuracyMeters =
        typeof position.coords.accuracy === 'number' &&
        Number.isFinite(position.coords.accuracy)
          ? Math.round(position.coords.accuracy)
          : null;

      const messageId = `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const clientId = getOrCreateClientId();
      const now = new Date();
      const nowIso = now.toISOString();
      const durationMs = 30 * 60 * 1000;
      let expiresAtIso = new Date(now.getTime() + durationMs).toISOString();

      try {
        const res = await fetch(
          `/api/matches/${encodeURIComponent(matchId)}/live-location/start`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: messageId,
              latitude,
              longitude,
              accuracyMeters,
              clientId,
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as {
            message?: ChatMessage;
            state?: ServerState;
          };
          if (data.state) {
            setServerState(data.state);
          }
          if (data.message?.liveLocation?.expiresAtIso) {
            expiresAtIso = data.message.liveLocation.expiresAtIso;
          }
        }
      } catch {
        // Offline fallback: insert optimistic 30-min live location message
        const nowTime = now.toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const fallbackMsg: ChatMessage = {
          id: messageId,
          matchId,
          senderId: serverState.currentUser.id,
          senderName: serverState.currentUser.name,
          text: 'Deler live-posisjon i 30 minutter',
          createdAt: nowTime,
          readAt: null,
          liveLocation: {
            latitude,
            longitude,
            accuracyMeters,
            startedAtIso: nowIso,
            expiresAtIso,
            updatedAtIso: nowIso,
            stoppedAtIso: null,
            isActive: true,
          },
        };
        setServerState((prev) => {
          const existing = prev.messagesByMatch[matchId] || [];
          return {
            ...prev,
            messagesByMatch: {
              ...prev.messagesByMatch,
              [matchId]: [...existing, fallbackMsg],
            },
          };
        });
      } finally {
        setLocationRequestingMatchId((curr) =>
          curr === matchId ? null : curr
        );
      }

      const remainingMs = Math.max(
        1000,
        Date.parse(expiresAtIso) - Date.now()
      );

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const watcherEntry = locationWatchersRef.current[matchId];
          if (!watcherEntry) return;
          const nowTick = Date.now();
          if (nowTick - watcherEntry.lastSentAt < 4000) return;
          watcherEntry.lastSentAt = nowTick;

          const nextLat = Number(pos.coords.latitude.toFixed(6));
          const nextLng = Number(pos.coords.longitude.toFixed(6));
          const nextAcc =
            typeof pos.coords.accuracy === 'number' &&
            Number.isFinite(pos.coords.accuracy)
              ? Math.round(pos.coords.accuracy)
              : null;
          const updatedIso = new Date(nowTick).toISOString();

          setServerState((prev) => {
            const thread = prev.messagesByMatch[matchId];
            if (!thread) return prev;
            return {
              ...prev,
              messagesByMatch: {
                ...prev.messagesByMatch,
                [matchId]: thread.map((m) =>
                  m.id === messageId && m.liveLocation?.isActive
                    ? {
                        ...m,
                        liveLocation: {
                          ...m.liveLocation,
                          latitude: nextLat,
                          longitude: nextLng,
                          accuracyMeters: nextAcc,
                          updatedAtIso: updatedIso,
                        },
                      }
                    : m
                ),
              },
            };
          });

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                event: 'location:update',
                payload: {
                  matchId,
                  messageId,
                  latitude: nextLat,
                  longitude: nextLng,
                  accuracyMeters: nextAcc,
                },
              })
            );
          } else {
            void fetch(
              `/api/matches/${encodeURIComponent(matchId)}/live-location/update`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messageId,
                  latitude: nextLat,
                  longitude: nextLng,
                  accuracyMeters: nextAcc,
                }),
              }
            ).catch(() => {});
          }
        },
        () => {
          // Transient watch error does not abort existing 30-min share prematurely
        },
        {
          enableHighAccuracy: true,
          maximumAge: 8000,
          timeout: 15000,
        }
      );

      const expiryTimer = window.setTimeout(() => {
        void stopLiveLocation(matchId, messageId);
      }, remainingMs);

      locationWatchersRef.current[matchId] = {
        watchId,
        expiryTimer,
        messageId,
        lastSentAt: Date.now(),
      };

      return true;
    },
    [
      clearLocationWatcherForMatch,
      serverState.currentUser.id,
      serverState.currentUser.name,
      stopLiveLocation,
    ]
  );

  const verifyProfile = useCallback(async (pose: string, selfieDataUrl: string) => {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pose, selfieDataUrl }),
    });
    if (res.ok) {
      const data = (await res.json()) as { state: ServerState };
      setServerState(data.state);
      return true;
    }
    return false;
  }, []);

  const updateProfile = useCallback(async (updates: Partial<CurrentUser>) => {
    setServerState((prev) => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        ...updates,
      },
    }));

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerState };
        setServerState(data.state);
        return true;
      }
    } catch {
      return true;
    }
    return false;
  }, []);

  const updateDailySwipeGoal = useCallback(async (dailyGoal: number) => {
    const clampedGoal = Math.min(
      100,
      Math.max(1, Math.round(Number(dailyGoal) || 5))
    );
    const todayKey = getTodayDateKey();

    setServerState((prev) => ({
      ...prev,
      swipeStats: {
        ...prev.swipeStats,
        dailyGoal: clampedGoal,
        dailyCount:
          prev.swipeStats.dailyDate === todayKey
            ? prev.swipeStats.dailyCount
            : 0,
        dailyDate: todayKey,
      },
    }));

    try {
      const res = await fetch('/api/swipe-goal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyGoal: clampedGoal }),
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerState };
        setServerState(data.state);
        return true;
      }
    } catch {
      return true;
    }
    return false;
  }, []);

  const saveVideoIntro = useCallback(
    async (payload: {
      videoIntroUrl: string | null;
      videoIntroDurationSec: number | null;
      videoIntroPrompt: string | null;
    }) => {
      const nowTime = new Date().toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setServerState((prev) => ({
        ...prev,
        currentUser: {
          ...prev.currentUser,
          videoIntroUrl: payload.videoIntroUrl,
          videoIntroDurationSec: payload.videoIntroUrl
            ? payload.videoIntroDurationSec || 15
            : null,
          videoIntroPrompt: payload.videoIntroUrl
            ? payload.videoIntroPrompt
            : null,
          videoIntroUpdatedAt: payload.videoIntroUrl
            ? `I dag, ${nowTime}`
            : null,
        },
      }));

      try {
        const res = await fetch('/api/profile/video-intro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { state: ServerState };
          setServerState(data.state);
          return true;
        }
      } catch {
        return true;
      }
      return false;
    },
    []
  );

  const startMyStream = useCallback(async (title: string, topic: string) => {
    const res = await fetch('/api/streams/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, topic }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        stream: LiveStreamRoom;
        state: ServerState;
      };
      setServerState(data.state);
      return data.stream;
    }
    return null;
  }, []);

  const stopMyStream = useCallback(async () => {
    const res = await fetch('/api/streams/stop', { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { state: ServerState };
      setServerState(data.state);
    }
  }, []);

  const sendStreamComment = useCallback(
    (streamId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nowTime = new Date().toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const optimistic: StreamComment = {
        id,
        streamId,
        authorId: serverState.currentUser.id,
        authorName: serverState.currentUser.name,
        authorVerified: serverState.currentUser.verified,
        text: trimmed,
        createdAt: nowTime,
      };

      setServerState((prev) => ({
        ...prev,
        streams: prev.streams.map((s) => {
          if (s.id !== streamId) return s;
          if (s.mutedAuthorIds.includes(prev.currentUser.id)) return s;
          if (s.comments.some((c) => c.id === id)) return s;
          return { ...s, comments: [...s.comments, optimistic] };
        }),
      }));

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'stream:comment',
            payload: { id, streamId, text: trimmed },
          })
        );
      }
    },
    [
      serverState.currentUser.id,
      serverState.currentUser.name,
      serverState.currentUser.verified,
    ]
  );

  const sendStreamLike = useCallback((streamId: string) => {
    setServerState((prev) => ({
      ...prev,
      streams: prev.streams.map((s) =>
        s.id === streamId ? { ...s, likesCount: s.likesCount + 1 } : s
      ),
    }));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          event: 'stream:like',
          payload: { streamId },
        })
      );
    }
  }, []);

  const moderateStream = useCallback(
    (
      streamId: string,
      action: 'delete' | 'pin' | 'mute',
      target: { commentId?: string; authorId?: string }
    ) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            event: 'stream:moderate',
            payload: {
              streamId,
              action,
              commentId: target.commentId || '',
              authorId: target.authorId || '',
            },
          })
        );
      }
    },
    []
  );

  const blockUser = useCallback(
    async (profileId: string, reason = 'Uønsket kontakt') => {
      const cleanId = profileId.trim();
      if (!cleanId) return false;

      const nowTime = new Date().toLocaleTimeString('nb-NO', {
        hour: '2-digit',
        minute: '2-digit',
      });

      clearLocationWatcherForMatch(`match-${cleanId}`);
      setCelebratingMatch((prev) =>
        prev?.profileId === cleanId ? null : prev
      );

      // Optimistic removal from matches, messages, and likesReceived
      setServerState((prev) => {
        const nextBlocked = [
          {
            profileId: cleanId,
            blockedAt: `I dag, ${nowTime}`,
            reason,
          },
          ...prev.blockedUsers.filter((b) => b.profileId !== cleanId),
        ];

        const removedMatchIds = prev.matches
          .filter((m) => m.profileId === cleanId)
          .map((m) => m.id);

        const nextMessages = { ...prev.messagesByMatch };
        for (const mId of removedMatchIds) {
          delete nextMessages[mId];
        }
        delete nextMessages[`match-${cleanId}`];

        return {
          ...prev,
          blockedUsers: nextBlocked,
          matches: prev.matches.filter((m) => m.profileId !== cleanId),
          messagesByMatch: nextMessages,
          likesReceived: prev.likesReceived.filter(
            (l) => l.profileId !== cleanId
          ),
        };
      });

      try {
        const res = await fetch('/api/users/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: cleanId, reason }),
        });
        if (res.ok) {
          const data = (await res.json()) as { state: ServerState };
          setServerState(data.state);
          return true;
        }
      } catch {
        // Offline mode retains optimistic block
        return true;
      }
      return false;
    },
    [clearLocationWatcherForMatch]
  );

  const unblockUser = useCallback(async (profileId: string) => {
    const cleanId = profileId.trim();
    if (!cleanId) return;

    setServerState((prev) => ({
      ...prev,
      blockedUsers: prev.blockedUsers.filter((b) => b.profileId !== cleanId),
      swipedRightIds: prev.swipedRightIds.filter((id) => id !== cleanId),
      swipedLeftIds: prev.swipedLeftIds.filter((id) => id !== cleanId),
    }));

    try {
      const res = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: cleanId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { state: ServerState };
        setServerState(data.state);
      }
    } catch {
      // Offline mode retains optimistic unblock
    }
  }, []);

  const reportUser = useCallback(
    async (payload: {
      profileId: string;
      matchId?: string | null;
      reason: string;
      details?: string;
      blockUser?: boolean;
    }) => {
      const cleanId = payload.profileId.trim();
      if (!cleanId) return false;

      if (payload.blockUser) {
        clearLocationWatcherForMatch(`match-${cleanId}`);
        if (payload.matchId) {
          clearLocationWatcherForMatch(payload.matchId);
        }
        setCelebratingMatch((prev) =>
          prev?.profileId === cleanId ? null : prev
        );
      }

      const optimisticReport = {
        id: `rep-${Date.now()}`,
        profileId: cleanId,
        matchId: payload.matchId || null,
        reason: payload.reason,
        details: payload.details || '',
        alsoBlocked: Boolean(payload.blockUser),
        reportedAt: new Date().toLocaleDateString('nb-NO', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      };

      setServerState((prev) => {
        if (!payload.blockUser) {
          return {
            ...prev,
            reportedUsers: [optimisticReport, ...prev.reportedUsers],
          };
        }

        const nowTime = new Date().toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const removedMatchIds = prev.matches
          .filter((m) => m.profileId === cleanId)
          .map((m) => m.id);
        const nextMessages = { ...prev.messagesByMatch };
        for (const mId of removedMatchIds) {
          delete nextMessages[mId];
        }
        delete nextMessages[`match-${cleanId}`];

        return {
          ...prev,
          reportedUsers: [optimisticReport, ...prev.reportedUsers],
          blockedUsers: [
            {
              profileId: cleanId,
              blockedAt: `I dag, ${nowTime}`,
              reason: `Rapportert: ${payload.reason}`,
            },
            ...prev.blockedUsers.filter((b) => b.profileId !== cleanId),
          ],
          matches: prev.matches.filter((m) => m.profileId !== cleanId),
          messagesByMatch: nextMessages,
          likesReceived: prev.likesReceived.filter(
            (l) => l.profileId !== cleanId
          ),
        };
      });

      try {
        const res = await fetch('/api/users/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = (await res.json()) as { state: ServerState };
          setServerState(data.state);
          return true;
        }
      } catch {
        return true;
      }
      return false;
    },
    [clearLocationWatcherForMatch]
  );

  return {
    serverState,
    loading,
    wsConnected,
    celebratingMatch,
    setCelebratingMatch,
    activePushToast,
    setActivePushToast,
    swipeProfile,
    rewindSwipe,
    markMatchRead,
    sendMessage,
    startLiveLocation,
    stopLiveLocation,
    locationRequestingMatchId,
    locationErrorByMatch,
    clearLocationError,
    verifyProfile,
    updateProfile,
    updateDailySwipeGoal,
    saveVideoIntro,
    startMyStream,
    stopMyStream,
    sendStreamComment,
    sendStreamLike,
    moderateStream,
    blockUser,
    unblockUser,
    reportUser,
  };
}

