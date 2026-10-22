import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Hotel,
  PartyPopper,
  X,
  PanelLeftClose,
  ClipboardList,
  Building2,
  PanelLeftOpen,
  LayoutDashboard,
  CalendarCheck,
  ConciergeBell,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
  Users,
  HandHelping,
  UserCog,
  Wallet,
  Landmark,
  Tag,
  Star,
  ChevronDown,
  UserCircle2,
  LogOut,
  CalendarDays,
  ArrowUpRight,
  UserCheck,
  CalendarPlus,
  Settings,
  Banknote,
  HandCoins,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../constants/roles";

const { SUPER_ADMIN, MANAGER, STAFF } = ROLES;
const ALL = [SUPER_ADMIN, MANAGER, STAFF];

/*
  Item options:
  - path: link target
  - activePrefix (optional): use this instead of `path` when deciding
    whether the item is active (e.g. a section with several sub-pages)
*/
const menuGroups = [
  {
    title: "Workspace",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL,
      },
    ],
  },
  {
    title: "Hotel Operations",
    items: [
      { label: "Bookings", path: "/bookings", icon: CalendarCheck, roles: ALL },
      { label: "Calendar", path: "/calendar", icon: CalendarDays, roles: ALL },
      {
        label: "Front Desk",
        path: "/front-desk",
        icon: ConciergeBell,
        roles: ALL,
      },
      { label: "Rooms", path: "/rooms", icon: BedDouble, roles: ALL },
      {
        label: "Housekeeping",
        path: "/housekeeping",
        icon: Sparkles,
        roles: ALL,
      },
    ],
  },
  {
    title: "Restaurant",
    items: [
      {
        label: "Banquet",
        path: "/banquet",
        icon: PartyPopper,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Banquet Calendar",
        path: "/banquet/calendar",
        icon: CalendarDays,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Banquet Halls",
        path: "/banquet/halls",
        icon: Building2,
        roles: [SUPER_ADMIN, MANAGER],
      },
      {
        label: "Catering",
        path: "/banquet/catering",
        icon: UtensilsCrossed,
        roles: [SUPER_ADMIN, MANAGER],
      },
    ],
  },
  {
    title: "Restaurant Management",
    items: [
      {
        label: "Restaurant Dashboard",
        path: "/restaurant",
        icon: LayoutDashboard,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Menu Management",
        path: "/restaurant/manage/menu",
        // Categories / Tables pages also live under /restaurant/manage
        activePrefix: "/restaurant/manage",
        icon: UtensilsCrossed,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Restaurant Orders",
        path: "/restaurant/orders",
        icon: ClipboardList,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Restaurant Settings",
        path: "/restaurant/settings",
        icon: Settings,
        roles: [SUPER_ADMIN, MANAGER],
      },
    ],
  },
  {
    title: "Team Management",
    items: [
      { label: "Staff", path: "/staff", icon: UserCog, roles: [SUPER_ADMIN] },
      {
        label: "Daily Attendance",
        path: "/attendance/daily",
        icon: UserCheck,
        roles: [SUPER_ADMIN],
      },
      {
        label: "Monthly Sheet",
        path: "/attendance/monthly",
        icon: CalendarDays,
        roles: [SUPER_ADMIN],
      },
      {
        label: "Leaves",
        path: "/attendance/leaves",
        icon: CalendarPlus,
        roles: [SUPER_ADMIN],
      },
      {
        label: "Attendance Settings",
        path: "/attendance/settings",
        icon: Settings,
        roles: [SUPER_ADMIN],
      },
      {
        label: "Payroll",
        path: "/payroll",
        icon: Banknote,
        roles: [SUPER_ADMIN, MANAGER],
      },
      {
        label: "Salary Structures",
        path: "/structures",
        icon: Wallet,
        roles: [SUPER_ADMIN, MANAGER],
      },
      {
        label: "Salary Advances",
        path: "/advances",
        icon: HandCoins,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Payroll Settings",
        path: "/payrollsettings",
        icon: Settings,
        roles: [SUPER_ADMIN, MANAGER],
      },
    ],
  },
  {
    title: "Guest Experience",
    items: [
      { label: "Guests", path: "/guests", icon: Users, roles: ALL },
      {
        label: "Guest Services",
        path: "/guest-services",
        icon: HandHelping,
        roles: ALL,
      },
      {
        label: "Reviews & Feedback",
        path: "/reviews",
        icon: Star,
        roles: [SUPER_ADMIN, MANAGER],
      },
    ],
  },
  {
    title: "Finance & Growth",
    items: [
      {
        label: "Expenses & Finance",
        path: "/expenses",
        icon: Landmark,
        roles: [SUPER_ADMIN, MANAGER],
      },
      {
        label: "Offers & Rate Plans",
        path: "/offers",
        icon: Tag,
        roles: [SUPER_ADMIN, MANAGER],
      },
    ],
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getInitials = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatRole = (role = "") =>
  String(role)
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const matchesPath = (pathname, base) =>
  pathname === base || pathname.startsWith(`${base}/`);

const getActivePath = (groups, pathname) => {
  let bestPath = null;
  let bestLength = -1;

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const base = item.activePrefix || item.path;

      if (matchesPath(pathname, base) && base.length > bestLength) {
        bestPath = item.path;
        bestLength = base.length;
      }
    });
  });

  return bestPath;
};

const Avatar = ({ name, size = "h-8 w-8" }) => (
  <div
    className={`relative flex ${size} shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black`}
  >
    {getInitials(name)}
    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-white" />
  </div>
);

/* =========================================================
   SIDEBAR
========================================================= */

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const profileRef = useRef(null);

  const isCollapsed = collapsed ?? localCollapsed;
  const displayName = user?.name || user?.fullName || user?.email || "User";

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: (group.items ?? []).filter((item) =>
        (item.roles ?? []).includes(user?.role),
      ),
    }))
    .filter((group) => group.items.length > 0);

  // Only one item can be active at a time
  const activePath = getActivePath(visibleGroups, pathname);

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed((previous) => !previous);
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleProfile = () => {
    setMenuOpen(false);
    onClose?.();
    navigate("/profile");
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout?.();
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
      setMenuOpen(false);
      onClose?.();
    }
  };

  const renderNavLink = ({ label, path, icon: Icon }) => {
    // We do NOT use NavLink's own isActive, so only one item is highlighted
    const isActive = path === activePath;

    return (
      <li key={path}>
        <NavLink
          to={path}
          onClick={onClose}
          title={isCollapsed ? label : undefined}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
          className={`
            group relative flex min-h-[36px] items-center rounded
            text-[13px] font-medium transition-all duration-200
            ${isCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5"}
            ${
              isActive
                ? "bg-white text-black"
                : "text-neutral-400 hover:bg-white/10 hover:text-white"
            }
          `}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded transition ${
              isActive
                ? "text-black"
                : "text-neutral-500 group-hover:text-white"
            }`}
          >
            <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {isActive && (
                <ArrowUpRight size={14} className="shrink-0 text-black" />
              )}
            </>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-white/10 bg-black
          transition-[width,transform] duration-300 ease-in-out
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-[72px]" : "w-64"}
        `}
      >
        {/* Brand */}
        <div
          className={`flex h-[70px] shrink-0 items-center border-b border-white/10 ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex min-w-0 items-center gap-2.5 text-left"
            title="StayNexa Dashboard"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-black">
              <Hotel size={20} strokeWidth={1.8} />
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-extrabold leading-tight tracking-tight text-white">
                  StayNexa
                </span>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Hotel management
                </span>
              </span>
            )}
          </button>

          {!isCollapsed && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sidebar"
              className="rounded p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Collapse control */}
        <div
          className={`hidden shrink-0 pt-2 lg:flex ${
            isCollapsed ? "justify-center px-2" : "px-3"
          }`}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-8 items-center rounded border border-white/10 bg-white/5 text-neutral-400 transition hover:border-white/30 hover:bg-white/10 hover:text-white ${
              isCollapsed
                ? "w-9 justify-center"
                : "w-full justify-between px-3"
            }`}
          >
            {!isCollapsed && (
              <span className="text-xs font-semibold">Collapse menu</span>
            )}
            {isCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-3 pt-3"
        >
          {visibleGroups.map((group) => (
            <section key={group.title} className="mb-3 last:mb-0">
              {!isCollapsed ? (
                <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.17em] text-neutral-500">
                  {group.title}
                </p>
              ) : (
                <div className="mx-auto mb-2 h-px w-8 bg-white/15" />
              )}

              <ul className="space-y-0.5">{group.items.map(renderNavLink)}</ul>
            </section>
          ))}
        </nav>

        {/* User profile */}
        <div
          ref={profileRef}
          className="relative shrink-0 border-t border-white/10 bg-black p-1.5"
        >
          {menuOpen && (
            <div
              role="menu"
              className={`absolute z-[60] overflow-hidden rounded border border-white/20 bg-black ${
                isCollapsed
                  ? "bottom-2 left-full ml-2 w-56"
                  : "bottom-full left-2 right-2 mb-2"
              }`}
            >
              <div className="border-b border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={displayName} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-neutral-400">
                      {user?.email || "StayNexa account"}
                    </p>
                  </div>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  {formatRole(user?.role)}
                </span>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleProfile}
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white"
                >
                  <UserCircle2 size={16} />
                  My Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-sm font-medium text-neutral-300 hover:bg-white hover:text-black disabled:opacity-50"
                >
                  <LogOut size={16} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((previous) => !previous)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={isCollapsed ? displayName : undefined}
            className={`flex w-full items-center rounded transition ${
              menuOpen ? "bg-white/10" : "hover:bg-white/10"
            } ${isCollapsed ? "justify-center p-1" : "gap-2.5 p-1.5"}`}
          >
            <Avatar name={displayName} size="h-8 w-8" />
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-semibold text-white">
                    {displayName}
                  </span>
                  <span className="block truncate text-[10px] text-neutral-400">
                    {formatRole(user?.role)}
                  </span>
                </span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-neutral-400 transition-transform ${
                    menuOpen ? "rotate-180 text-white" : ""
                  }`}
                />
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;