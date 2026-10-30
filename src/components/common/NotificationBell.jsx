

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Loader2,
  BellRing,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";



import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../modules/notifications/services/notifications.service";

const relativeTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const minutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    typeof Notification !== "undefined" &&
      Notification.permission === "granted",
  );

  const rootRef = useRef(null);
  const navigate = useNavigate();

  
  const load = useCallback(async () => {
    console.log("[Notifications] Loading notifications...");

    setLoading(true);

    try {
      const data = await getNotifications({ limit: 8 });

      setItems(data?.items || []);
      setUnreadCount(Number(data?.unreadCount || 0));

      console.log("[Notifications] Loaded successfully", {
        count: data?.items?.length || 0,
        unreadCount: Number(data?.unreadCount || 0),
      });
    } catch (error) {
      console.error(
        "[Notifications] Failed to load:",
        error?.response?.data?.message || error.message,
      );

      toast.error(
        error?.response?.data?.message ||
          "Could not load notifications",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  
  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }

      if (
        event.type === "mousedown" &&
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  


  
  const openItem = async (item) => {
    try {
      if (!item.read) {
        await markNotificationRead(item._id);

        setItems((current) =>
          current.map((notification) =>
            notification._id === item._id
              ? {
                  ...notification,
                  read: true,
                  readAt: new Date().toISOString(),
                }
              : notification,
          ),
        );

        setUnreadCount((count) => Math.max(0, count - 1));
      }

      setOpen(false);

      if (item.link) {
        navigate(item.link);
      } else {
        navigate("/notifications");
      }
    } catch (error) {
      console.error(
        "[Notifications] Could not mark as read:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Could not update notification",
      );
    }
  };

  
  const markAll = async () => {
    try {
      await markAllNotificationsRead();

      setItems((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          readAt: item.readAt || new Date().toISOString(),
        })),
      );

      setUnreadCount(0);

      toast.success("All notifications marked as read");
    } catch (error) {
      console.error(
        "[Notifications] Could not mark all as read:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Could not mark notifications read",
      );
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;

          setOpen(next);

          if (next) {
            load();
          }
        }}
        aria-label={`Notifications${
          unreadCount ? `, ${unreadCount} unread` : ""
        }`}
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 "
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute right-0 z-[80] mt-2 w-[min(92vw,380px)] overflow-hidden rounded border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">
                  Notifications
                </p>

                <p className="text-xs text-slate-500">
                  {unreadCount} unread
                </p>
              </div>

              <button
                type="button"
                onClick={markAll}
                disabled={!unreadCount}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-blue-600  disabled:opacity-40"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            </div>

            <div className="mt-3 rounded border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <BellRing
                  size={18}
                  className="shrink-0 text-slate-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Browser Push Notifications
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {pushEnabled
                      ? "Browser permission is granted."
                      : "Enable notifications on this browser."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={enablePushNotifications}
                disabled={pushLoading || pushEnabled}
                className="mt-3 w-full rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700  disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pushLoading
                  ? "Enabling..."
                  : pushEnabled
                    ? "Browser Permission Granted"
                    : "Enable Push Notifications"}
              </button>
            </div>
          </header>

          <div className="max-h-[380px] overflow-y-auto">
            {loading && !items.length ? (
              <div className="flex justify-center p-8 text-slate-400">
                <Loader2
                  className="animate-spin"
                  size={22}
                />
              </div>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => openItem(item)}
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left  ${
                    item.read ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.read
                          ? "bg-transparent"
                          : "bg-blue-600"
                      }`}
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {item.title}
                      </span>

                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {item.message}
                      </span>

                      <span className="mt-1 block text-[11px] text-slate-400">
                        {relativeTime(item.createdAt)}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-slate-500">
                You&apos;re all caught up.
              </p>
            )}
          </div>

          <footer className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full rounded bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              View all notifications
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
