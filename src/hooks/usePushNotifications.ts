import { useCallback, useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getOrCreateClientId(): string {
  try {
    const existing = window.localStorage.getItem('gnist_client_id');
    if (existing) return existing;
    const created = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem('gnist_client_id', created);
    return created;
  } catch {
    return 'client-ephemeral';
  }
}

export function usePushNotifications(
  onNotificationNavigate?: (target: { tab: string; matchId: string | null }) => void
) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [inAppFallbackActive, setInAppFallbackActive] = useState(true);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [notifyMatches, setNotifyMatches] = useState(true);
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  useEffect(() => {
    const isPushSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setSupported(isPushSupported);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }

    try {
      const savedMatches = window.localStorage.getItem('gnist_notify_matches');
      const savedMessages = window.localStorage.getItem('gnist_notify_messages');
      if (savedMatches !== null) setNotifyMatches(savedMatches === 'true');
      if (savedMessages !== null) setNotifyMessages(savedMessages === 'true');
    } catch {
      // Ignore storage access errors
    }

    if (!isPushSupported) return;

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          setEndpoint(sub.endpoint);
        }
      })
      .catch(() => {
        // Ignore SW readiness error in restricted environments
      });

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GNIST_PUSH_CLICK') {
        const payload = event.data.payload as {
          tab?: string;
          matchId?: string | null;
        };
        onNotificationNavigate?.({
          tab: payload?.tab || 'messages',
          matchId: payload?.matchId || null,
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [onNotificationNavigate]);

  const subscribeToPush = useCallback(async () => {
    setBusy(true);
    setStatusNote(null);

    try {
      if (!supported) {
        setInAppFallbackActive(true);
        setStatusNote(
          'Sanntidsvarsler i appen er aktivert (nettleseren støtter ikke Web Push direkte i dette vinduet).'
        );
        return false;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setInAppFallbackActive(true);
        setStatusNote(
          'Systemvarsler er begrenset i forhåndsvisningsrammen — sanntids push-banner inne i appen er aktivt. Åpne appen i egen fane eller på hjemskjermen for full Web Push.'
        );
        return false;
      }

      const keyRes = await fetch('/api/push/vapid-public-key');
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const appServerKey = urlBase64ToUint8Array(publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getOrCreateClientId(),
          subscription: sub.toJSON(),
          notifyMatches,
          notifyMessages,
        }),
      });

      setIsSubscribed(true);
      setEndpoint(sub.endpoint);
      setInAppFallbackActive(true);
      setStatusNote('Web Push API er aktivert for nye matcher og meldinger.');
      return true;
    } catch {
      setInAppFallbackActive(true);
      setStatusNote(
        'Sanntids push-varsler i appen er aktivert. Installer appen på hjemskjermen for systemvarsler i bakgrunnen.'
      );
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported, notifyMatches, notifyMessages]);

  const unsubscribeFromPush = useCallback(async () => {
    setBusy(true);
    setStatusNote(null);
    try {
      if (supported) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      setEndpoint(null);
      setInAppFallbackActive(false);
      setStatusNote('Push-varsler er skrudd av.');
    } catch {
      setIsSubscribed(false);
      setInAppFallbackActive(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const updatePreferences = useCallback(
    async (nextMatches: boolean, nextMessages: boolean) => {
      setNotifyMatches(nextMatches);
      setNotifyMessages(nextMessages);
      try {
        window.localStorage.setItem(
          'gnist_notify_matches',
          String(nextMatches)
        );
        window.localStorage.setItem(
          'gnist_notify_messages',
          String(nextMessages)
        );
      } catch {
        // Ignore
      }
      if (endpoint) {
        try {
          await fetch('/api/push/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              notifyMatches: nextMatches,
              notifyMessages: nextMessages,
            }),
          });
        } catch {
          // Ignore offline error
        }
      }
    },
    [endpoint]
  );

  const sendTestPush = useCallback(async (kind: 'match' | 'message') => {
    setBusy(true);
    try {
      await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    permission,
    isSubscribed,
    inAppFallbackActive,
    notifyMatches,
    notifyMessages,
    busy,
    statusNote,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    sendTestPush,
  };
}
