import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Hotel,
  PartyPopper,
  X,
  PanelLeftClose,
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
  Receipt,
  UserCog,
  Wallet,
  Landmark,
  Tag,
  Star,
  BarChart3,
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
  ReceiptText,
} from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { ROLES } from "../../constants/roles";

const { SUPER_ADMIN, MANAGER, STAFF } = ROLES;
const ALL = [SUPER_ADMIN, MANAGER, STAFF];

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
    title: "Banquet & Catering",
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
        label: "My Payslips",
        path: "/payrollmy",
        icon: ReceiptText,
        roles: [SUPER_ADMIN, MANAGER, STAFF],
      },
      {
        label: "Payroll Settings",
        path: "payrollsettings",
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
      // { label: "Payments & Billing", path: "/billing", icon: Receipt, roles: ALL },
      // { label: "Reports & Analytics", path: "/reports", icon: BarChart3, roles: [SUPER_ADMIN, MANAGER] },
    ],
  },
];

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

const Avatar = ({ name, size = "h-10 w-10" }) => (
  <div
    className={`relative flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 font-bold text-white shadow-sm shadow-blue-200`}
  >
    {getInitials(name)}
    <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
  </div>
);

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [teamManagementOpen, setTeamManagementOpen] = useState(false);
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

  const teamGroup = visibleGroups.find(
    (group) => group.title === "Team Management",
  );
  const isTeamRoute = teamGroup?.items.some(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );

  useEffect(() => {
    if (isTeamRoute) setTeamManagementOpen(true);
  }, [pathname, isTeamRoute]);

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

  const renderNavLink = ({ label, path, icon: Icon }) => (
    <li key={path}>
      <NavLink
        to={path}
        end={path === "/dashboard"}
        onClick={onClose}
        title={isCollapsed ? label : undefined}
        aria-label={label}
        className={({ isActive }) => `
    group relative flex min-h-[43px] items-center rounded-xl
    text-[13px] font-medium transition-all duration-200
    ${isCollapsed ? "justify-center px-2" : "gap-3 px-3"}
    ${
      isActive
        ? "bg-[#eaf1ff] text-[#2459d4] shadow-sm shadow-blue-100/60"
        : "text-slate-600 hover:bg-slate-50 hover:text-[#2459d4]"
    }
  `}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-blue-600" />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                isActive
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 group-hover:bg-white group-hover:text-blue-600"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            </span>
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {isActive && (
                  <ArrowUpRight size={15} className="shrink-0 text-blue-500" />
                )}
              </>
            )}
          </>
        )}
      </NavLink>
    </li>
  );

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-blue-100 bg-white
          shadow-[8px_0_32px_rgba(15,35,80,0.04)]
          transition-[width,transform] duration-300 ease-in-out
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-[78px]" : "w-64"}
        `}
      >
        {/* Brand */}
        <div
          className={`flex h-[70px] shrink-0 items-center border-b border-slate-100 ${
            isCollapsed ? "justify-center px-2" : "justify-between px-5"
          }`}
        >
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex min-w-0 items-center gap-3 text-left"
            title="StayNexa Dashboard"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200/70">
              <Hotel size={23} strokeWidth={1.8} />
            </span>
            {!isCollapsed && (
              <span className="min-w-0">
                <span className="block truncate text-[19px] font-extrabold tracking-tight text-[#13284d]">
                  StayNexa
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.19em] text-blue-500">
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
              className="rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600 lg:hidden"
            >
              <X size={19} />
            </button>
          )}
        </div>

        {/* Collapse control */}
        <div
          className={`hidden shrink-0 pt-3 lg:flex ${
            isCollapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex h-9 items-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500 transition hover:border-blue-100 hover:bg-blue-50 hover:text-blue-700 ${
              isCollapsed
                ? "w-10 justify-center"
                : "w-full justify-between px-3"
            }`}
          >
            {!isCollapsed && (
              <span className="text-xs font-semibold">Collapse menu</span>
            )}
            {isCollapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-5"
        >
          {visibleGroups.map((group) => {
            const isTeamManagement = group.title === "Team Management";
            const groupOpen = isTeamManagement && teamManagementOpen;

            return (
              <section key={group.title} className="mb-6 last:mb-0">
                {isTeamManagement ? (
                  <button
                    type="button"
                    onClick={() =>
                      setTeamManagementOpen((previous) => !previous)
                    }
                    aria-expanded={teamManagementOpen}
                    title={isCollapsed ? group.title : undefined}
                    className={`mb-2.5 flex min-h-[36px] w-full items-center rounded-lg text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:bg-slate-50 hover:text-blue-600 ${
                      isCollapsed
                        ? "justify-center px-1"
                        : "justify-between px-3"
                    }`}
                  >
                    {isCollapsed ? (
                      <UserCog size={18} className="text-slate-500" />
                    ) : (
                      <>
                        <span>{group.title}</span>
                        <ChevronDown
                          size={15}
                          className={`shrink-0 transition-transform ${
                            teamManagementOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </>
                    )}
                  </button>
                ) : !isCollapsed ? (
                  <p className="mb-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
                    {group.title}
                  </p>
                ) : (
                  <div className="mx-auto mb-3 h-px w-8 bg-slate-200" />
                )}

                {(!isTeamManagement || groupOpen) && (
                  <ul className="space-y-1">
                    {group.items.map(renderNavLink)}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>

        {/* User profile */}
        <div
          ref={profileRef}
          className="relative shrink-0 border-t border-slate-100 bg-white p-2"
        >
          {menuOpen && (
            <div
              role="menu"
              className={`absolute z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
                isCollapsed
                  ? "bottom-2 left-full ml-2 w-56"
                  : "bottom-full left-2 right-2 mb-2"
              }`}
            >
              <div className="bg-gradient-to-r from-[#1746a2] to-[#2864f5] p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar name={displayName} size="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-blue-100">
                      {user?.email || "StayNexa account"}
                    </p>
                  </div>
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  {formatRole(user?.role)}
                </span>
              </div>

              <div className="p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleProfile}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                >
                  <UserCircle2 size={17} />
                  My Profile
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <LogOut size={17} />
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
            className={`flex w-full items-center rounded-xl transition ${
              menuOpen ? "bg-blue-50" : "hover:bg-slate-50"
            } ${isCollapsed ? "justify-center p-1.5" : "gap-2.5 p-2"}`}
          >
            <Avatar name={displayName} size="h-9 w-9" />
            {!isCollapsed && (
              <>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-xs font-semibold text-[#13284d]">
                    {displayName}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                    {formatRole(user?.role)}
                  </span>
                </span>
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-slate-400 transition-transform ${
                    menuOpen ? "rotate-180 text-blue-600" : ""
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
