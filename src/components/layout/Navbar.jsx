
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
// import { getNotifications } from "../../services/notifications.service";
import { getNotifications } from "../../features/notifications/services/notifications.service";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
  guest: "Guest",
};

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);

  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Backend returns data.unreadCount.
      const data = await getNotifications({ page: 1, limit: 1 });
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch (error) {
      // Keep Navbar usable if notification loading fails.
      console.error("Failed to load notification count:", error);
    }
  }, [user]);

  useEffect(() => {
    loadUnreadCount();

    // Refresh the badge periodically.
    const intervalId = window.setInterval(loadUnreadCount, 60000);

    // Refresh when the user returns to the browser tab.
    const handleFocus = () => loadUnreadCount();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
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

  if (!user) return null;

  const initials = (user.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-gray-100 bg-white px-3 sm:px-6">
      {/* Mobile Menu */}
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
      >
        <Menu size={21} />
      </button>

      <div className="hidden lg:block" />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        
        <button
          type="button"
          onClick={handleNotificationsClick}
          aria-label={`Notifications, ${unreadCount} unread`}
          title={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <Bell size={21} />

          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 p-1 text-[10px] font-bold leading-none text-white ">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            aria-label="Open profile menu"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-50 sm:gap-3"
          >
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name || "User"}
                className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {initials}
              </div>
            )}

            <div className="hidden text-left sm:block">
              <p className="max-w-[150px] truncate text-sm font-semibold text-gray-900">
                {user.name}
              </p>
              <p className="text-xs text-gray-500">
                {ROLE_LABELS[user.role] || user.role}
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
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
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <User size={16} />
                My profile
              </Link>

              <Link
                to="/change-password"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
              >
                <KeyRound size={16} />
                Change password
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
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



// import { useEffect, useRef, useState } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import {
//   Menu,
//   ChevronDown,
//   User,
//   KeyRound,
//   LogOut,
//   Bell,
// } from "lucide-react";
// import toast from "react-hot-toast";
// import useAuth from "../../hooks/useAuth";

// const ROLE_LABELS = {
//   super_admin: "Super Admin",
//   manager: "Manager",
//   staff: "Staff",
//   guest: "Guest",
// };

// const Navbar = ({ onMenuClick, notifications = [] }) => {
//   const { user, logout } = useAuth();
//   const navigate = useNavigate();

//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);

//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (
//         menuRef.current &&
//         !menuRef.current.contains(event.target)
//       ) {
//         setOpen(false);
//       }
//     };

//     const handleEscape = (event) => {
//       if (event.key === "Escape") {
//         setOpen(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     document.addEventListener("keydown", handleEscape);

//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//       document.removeEventListener("keydown", handleEscape);
//     };
//   }, []);

//   const handleLogout = async () => {
//     setOpen(false);

//     try {
//       await logout();
//       toast.success("Logged out successfully");
//     } catch (error) {
//       toast.error("Unable to log out. Please try again.");
//     } finally {
//       navigate("/login", { replace: true, state: null });
//     }
//   };

//   const handleNotificationsClick = () => {
//     setOpen(false);
//     navigate("/notifications");
//   };

//   if (!user) return null;

//   const initials = (user.name || "User")
//     .split(" ")
//     .filter(Boolean)
//     .slice(0, 2)
//     .map((word) => word[0].toUpperCase())
//     .join("");

//   const unreadCount = Array.isArray(notifications)
//     ? notifications.filter(
//         (notification) => !notification.read
//       ).length
//     : 0;

//   return (
//     <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-gray-100 bg-white px-3 sm:px-6">
//       {/* Mobile Menu */}
//       <button
//         type="button"
//         onClick={onMenuClick}
//         aria-label="Open navigation menu"
//         className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 lg:hidden"
//       >
//         <Menu size={21} />
//       </button>

//       <div className="hidden lg:block" />

//       <div className="ml-auto flex items-center gap-2 sm:gap-3">
//         {/* Notification Bell */}
//         <button
//           type="button"
//           onClick={handleNotificationsClick}
//           aria-label={`Notifications${
//             unreadCount > 0 ? `, ${unreadCount} unread` : ""
//           }`}
//           title="Notifications"
//           className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
//         >
//           <Bell size={21} />

//           {unreadCount > 0 && (
//             <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
//               {unreadCount > 99 ? "99+" : unreadCount}
//             </span>
//           )}
//         </button>

//         {/* Profile Menu */}
//         <div className="relative" ref={menuRef}>
//           <button
//             type="button"
//             onClick={() => setOpen((previous) => !previous)}
//             aria-expanded={open}
//             aria-label="Open profile menu"
//             className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-50 sm:gap-3"
//           >
//             {user.profileImage ? (
//               <img
//                 src={user.profileImage}
//                 alt={user.name || "User"}
//                 className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-100"
//               />
//             ) : (
//               <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
//                 {initials}
//               </div>
//             )}

//             <div className="hidden text-left sm:block">
//               <p className="max-w-[150px] truncate text-sm font-semibold text-gray-900">
//                 {user.name}
//               </p>

//               <p className="text-xs text-gray-500">
//                 {ROLE_LABELS[user.role] || user.role}
//               </p>
//             </div>

//             <ChevronDown
//               size={16}
//               className={`text-gray-400 transition-transform ${
//                 open ? "rotate-180" : ""
//               }`}
//             />
//           </button>

//           {open && (
//             <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
//               {/* Mobile User Details */}
//               <div className="border-b border-gray-100 px-4 pb-3 pt-1 sm:hidden">
//                 <p className="text-sm font-semibold text-gray-900">
//                   {user.name}
//                 </p>

//                 <p className="text-xs text-gray-500">
//                   {ROLE_LABELS[user.role] || user.role}
//                 </p>
//               </div>

//               <Link
//                 to="/profile"
//                 onClick={() => setOpen(false)}
//                 className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
//               >
//                 <User size={16} />
//                 My profile
//               </Link>

//               <Link
//                 to="/change-password"
//                 onClick={() => setOpen(false)}
//                 className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
//               >
//                 <KeyRound size={16} />
//                 Change password
//               </Link>

//               <button
//                 type="button"
//                 onClick={handleLogout}
//                 className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
//               >
//                 <LogOut size={16} />
//                 Logout
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </header>
//   );
// };

// export default Navbar;
