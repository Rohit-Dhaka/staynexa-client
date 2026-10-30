import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  CalendarDays,
  CreditCard,
  Users,
  ClipboardCheck,
  Info,
  Inbox,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearReadNotifications,
} from "../services/notifications.service";

const CATEGORY_META = {
  booking: {
    label: "Booking",
    icon: CalendarDays,
    color: "bg-violet-50 text-violet-600",
  },
  attendance: {
    label: "Attendance",
    icon: ClipboardCheck,
    color: "bg-emerald-50 text-emerald-600",
  },
  payroll: {
    label: "Payroll",
    icon: CreditCard,
    color: "bg-amber-50 text-amber-600",
  },
  staff: { label: "Staff", icon: Users, color: "bg-sky-50 text-sky-600" },
  guest: { label: "Guest", icon: Users, color: "bg-cyan-50 text-cyan-600" },
  finance: {
    label: "Finance",
    icon: CreditCard,
    color: "bg-rose-50 text-rose-600",
  },
  system: { label: "System", icon: Info, color: "bg-slate-100 text-slate-600" },
};

const FILTERS = [
  { value: "all", label: "All notifications" },
  { value: "unread", label: "Unread" },
  ...Object.entries(CATEGORY_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  })),
];

const announceChange = () =>
  window.dispatchEvent(new Event("notifications:changed"));

const LIST_POLL_MS = 10000;

const dateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = { page: pagination.page, limit: pagination.limit };
        if (activeFilter === "unread") params.unread = true;
        else if (activeFilter !== "all") params.category = activeFilter;
        const data = await getNotifications(params);
        setItems(data?.items || []);
        setPagination(
          data?.pagination || { page: 1, pages: 1, total: 0, limit: 20 },
        );
        setUnreadCount(Number(data?.unreadCount || 0));
      } catch (error) {
        if (!silent) {
          toast.error(
            error?.response?.data?.message || "Could not load notifications",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [pagination.page, pagination.limit, activeFilter, reload],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadRef.current(true);
    }, LIST_POLL_MS);

    const onFocus = () => loadRef.current(true);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        !query ||
        `${item.title || ""} ${item.message || ""} ${item.category || ""}`
          .toLowerCase()
          .includes(query),
    );
  }, [items, search]);

  const refresh = () => setReload((n) => n + 1);

  const openItem = async (item) => {
    try {
      if (!item.read) await markNotificationRead(item._id);
      setItems((current) =>
        current.map((notification) =>
          notification._id === item._id
            ? {
                ...notification,
                read: true,
                readAt: notification.readAt || new Date().toISOString(),
              }
            : notification,
        ),
      );
      if (!item.read) {
        setUnreadCount((count) => Math.max(0, count - 1));
        announceChange();
      }
      if (item.link) navigate(item.link);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not update notification",
      );
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          readAt: notification.readAt || new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
      announceChange();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not mark notifications read",
      );
    }
  };

  const remove = async (item) => {
    try {
      await deleteNotification(item._id);
      setItems((current) =>
        current.filter((notification) => notification._id !== item._id),
      );
      setPagination((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      if (!item.read) setUnreadCount((count) => Math.max(0, count - 1));
      announceChange();
      toast.success("Notification deleted");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not delete notification",
      );
    }
  };

  const clearRead = async () => {
    try {
      await clearReadNotifications();
      toast.success("Read notifications cleared");
      setPagination((current) => ({ ...current, page: 1 }));
      refresh();
      announceChange();
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Could not clear read notifications",
      );
    }
  };

  return (
    <main className="min-h-screen space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Bell size={16} />
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-slate-800">Notifications</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Stay updated with bookings, staff activity and payroll.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 xs:flex-row sm:w-auto sm:flex-wrap">
          <button
            type="button"
            onClick={markAll}
            disabled={!unreadCount}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            <CheckCheck size={16} />
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearRead}
            className="inline-flex items-center justify-center gap-2 rounded border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-rose-600"
          >
            <Trash2 size={16} />
            Clear read
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Summary
          title="Total notifications"
          value={pagination.total}
          icon={<Bell size={22} />}
        />
        <Summary
          title="Unread"
          value={unreadCount}
          icon={<Inbox size={22} />}
        />
        <Summary
          title="Read"
          value={Math.max(0, pagination.total - unreadCount)}
          icon={<CheckCheck size={22} />}
        />
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filtered.length} notifications on this page
              </p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search notifications..."
                aria-label="Search notifications"
                className="w-full rounded border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <Filter size={16} className="shrink-0 text-slate-400" />
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setActiveFilter(filter.value);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                aria-pressed={activeFilter === filter.value}
                className={`shrink-0 rounded border px-3 py-2 text-xs font-semibold ${
                  activeFilter === filter.value
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {filter.label}
                {filter.value === "unread" && unreadCount > 0
                  ? ` (${unreadCount})`
                  : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="flex justify-center p-12 text-slate-400">
              <Loader2 size={24} aria-label="Loading notifications" />
            </div>
          ) : filtered.length ? (
            filtered.map((item) => {
              const meta = CATEGORY_META[item.category] || CATEGORY_META.system;
              const Icon = meta.icon;

              return (
                <article
                  key={item._id}
                  className={`flex gap-3 p-4 sm:gap-4 sm:p-5 ${
                    item.read ? "bg-white" : "bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded sm:h-11 sm:w-11 ${meta.color}`}
                  >
                    <Icon size={20} />
                  </span>

                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words font-semibold text-slate-900">
                        {item.title || "Notification"}
                      </span>
                      {!item.read && (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                          UNREAD
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {meta.label}
                      </span>
                    </span>
                    <span className="mt-1 block break-words text-sm leading-6 text-slate-600">
                      {item.message}
                    </span>
                    <span className="mt-2 block text-xs text-slate-400">
                      {dateText(item.createdAt)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => remove(item)}
                    title="Delete notification"
                    aria-label="Delete notification"
                    className="self-start rounded p-2 text-slate-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              );
            })
          ) : (
            <div className="p-8 text-center sm:p-12">
              <Bell size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">
                No notifications found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another filter or search term.
              </p>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span className="text-xs sm:text-sm">
            Page {pagination.page} of {pagination.pages} · {pagination.total} total
          </span>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: current.page - 1,
                }))
              }
              className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() =>
                setPagination((current) => ({
                  ...current,
                  page: current.page + 1,
                }))
              }
              className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 px-3 py-2 disabled:opacity-40"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Summary({ title, value, icon }) {
  return (
    <article className="flex min-w-0 items-center justify-between gap-3 rounded border border-slate-200 bg-white p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{title}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          {value}
        </p>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-blue-50 text-blue-600 sm:h-12 sm:w-12">
        {icon}
      </span>
    </article>
  );
}
