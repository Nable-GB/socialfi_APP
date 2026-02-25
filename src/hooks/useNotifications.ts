import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { notificationsApi, type ApiNotification } from "../lib/api";

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationsApi.getList();
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  // Connect SSE stream
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem("sf_token");
    if (!token) return;

    // Use query param for SSE auth (EventSource doesn't support custom headers)
    const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "notification") {
          setNotifications(prev => [payload.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        } else if (payload.type === "unread_count") {
          setUnreadCount(payload.count);
        }
      } catch { /* ignore malformed */ }
    };

    es.onerror = () => {
      es.close();
    };

    // Load initial list
    fetchNotifications();

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [isAuthenticated, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    try {
      const res = await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(res.unreadCount);
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const deleteNotif = useCallback(async (id: string) => {
    try {
      await notificationsApi.deleteOne(id);
      setNotifications(prev => {
        const n = prev.find(x => x.id === id);
        if (n && !n.isRead) setUnreadCount(c => Math.max(0, c - 1));
        return prev.filter(x => x.id !== id);
      });
    } catch { /* ignore */ }
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, deleteNotif, refetch: fetchNotifications };
}
