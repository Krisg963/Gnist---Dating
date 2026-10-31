import { useCallback, useEffect, useRef, useState } from 'react';
import { getOrCreateClientId } from './usePushNotifications';
import type {
  ChatMessage,
  CurrentUser,
  LiveStreamRoom,
  MatchRecord,
  PushToastNotification,
  ServerState,
  StreamComment,
} from '../types';

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
        id: 'msg-seed-1',
        matchId: 'match-ingrid',
        senderId: 'ingrid',
        senderName: 'Ingrid',
        text: 'Hei! Så hyggelig at vi matchet. Håper uken din har startet bra!',
        createdAt: '19:22',
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

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

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
        if (!unmounted) {
          setWsConnected(true);
        }
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
            }));
            setLoading(false);
          } else if (event === 'chat:message') {
            const { matchId, message } = payload as {
              matchId: string;
              message: ChatMessage;
            };
            setServerState((prev) => {
              const existing = prev.messagesByMatch[matchId] || [];
              if (existing.some((m) => m.id === message.id)) return prev;
              return {
                ...prev,
                messagesByMatch: {
                  ...prev.messagesByMatch,
                  [matchId]: [...existing, message],
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
      wsRef.current?.close();
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
          return {
            ...prev,
            swipedRightIds:
              direction === 'right' && !prev.swipedRightIds.includes(profileId)
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
              rightCount:
                prev.swipeStats.rightCount + (direction === 'right' ? 1 : 0),
              leftCount: Math.max(
                0,
                prev.swipeStats.leftCount +
                  (direction === 'left' ? 1 : wasLeft ? -1 : 0)
              ),
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
    []
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
  };
}

