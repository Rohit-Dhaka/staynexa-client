import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Menu,
  ChevronDown,
  User,
  KeyRound,
  LogOut,
  Bell,  
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../hooks/useAuth";
import { getNotifications } from "../../features/notifications/services/notifications.service";


const NOTIFICATION_POLL_MS = 1000;
const REQUEST_STALE_MS = 1000;


const NOTIFICATIONS_CHANGED_EVENT = "notifications:changed";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  receptionist: "Receptionist",
  staff: "Staff",
  guest: "Guest",
};

const Navbar = ({ onMenuClick, onSearch }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const menuRef = useRef(null);
  const previousCountRef = useRef(null);



    const userId = user?._id || user?.id || null;
  const inFlightRef = useRef(0);

  const loadUnreadCount = useCallback(async () => {
    if (!userId) {
      previousCountRef.current = null;
      setUnreadCount(0);
      return;
    }

    const now = Date.now();
    if (inFlightRef.current && now - inFlightRef.current < REQUEST_STALE_MS) return;
    inFlightRef.current = now;

    try {
      const data = await getNotifications({ page: 1, limit: 1, _t: now });
      const next = Number(data?.unreadCount ?? data?.meta?.unreadCount) || 0;
      

 

      previousCountRef.current = next;
      setUnreadCount(next);
    } catch (error) {
      console.error("Failed to load notification count:", error);
    } finally {
      inFlightRef.current = 0;
    }
  }, [userId]);

  const loadRef = useRef(loadUnreadCount);

  useEffect(() => {
    loadRef.current = loadUnreadCount;
  }, [loadUnreadCount]);

  useEffect(() => {
    const refresh = () => loadRef.current();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    refresh();
    const intervalId = window.setInterval(refreshIfVisible, NOTIFICATION_POLL_MS);

    window.addEventListener("focus", refresh);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [userId]);

  useEffect(() => {
    loadUnreadCount();

    
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") loadUnreadCount();
    }, NOTIFICATION_POLL_MS);

    const handleVisible = () => {
      if (document.visibilityState === "visible") loadUnreadCount();
    };

    window.addEventListener("focus", loadUnreadCount);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadUnreadCount);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, loadUnreadCount);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);

    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Unable to log out. Please try again.");
    } finally {
      navigate("/login", { replace: true, state: null });
    }
  };

  const handleNotificationsClick = () => {
    setOpen(false);
    navigate("/notifications");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchValue.trim();
    if (!query) return;

    if (typeof onSearch === "function") {
      onSearch(query);
    } else {
      window.dispatchEvent(
        new CustomEvent("hotel-global-search", { detail: { query } }),
      );
    }
  };

  if (!user) return null;

  const initials = (user.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center gap-3 border-b border-gray-100 bg-white px-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded p-2 text-gray-600 transition  lg:hidden"
      >
        <Menu size={21} />
      </button>

      
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          aria-label="Hotel Management home"
          className="flex min-w-0 items-center gap-2.5 rounded"
        >
     
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold text-gray-900">
              Hotel Management
            </span>
            <span className="block text-xs text-gray-500">
              Management Portal
            </span>
          </span>
        </Link>

        

      
      </div>

      
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={handleNotificationsClick}
          aria-label={`Notifications, ${unreadCount} unread`}
          title={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition  "
        >
          <Bell size={21} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 p-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded px-2 py-1.5 transition  sm:gap-3"
          >
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || "User"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                {initials}
              </span>
            )}

            <span className="hidden text-left sm:block">
              <span className="block max-w-[150px] truncate text-sm font-semibold text-gray-900">
                {user.name}
              </span>
              <span className="block text-xs text-gray-500">
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </span>

            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 overflow-hidden rounded border border-gray-100 bg-white py-2"
            >
              <div className="border-b border-gray-100 px-4 pb-3 pt-1 sm:hidden">
                <p className="text-sm font-semibold text-gray-900">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500">
                  {ROLE_LABELS[user.role] || user.role}
                </p>
              </div>

              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition "
              >
                <User size={16} />
                My Profile
              </Link>

              <Link
                to="/change-password"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition "
              >
                <KeyRound size={16} />
                Change Password
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition "
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;