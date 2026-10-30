import { useEffect, useRef, useState } from "react";
import {
 Link,
 NavLink,
 Outlet,
 useNavigate,
 useLocation,
} from "react-router-dom";
import {
 Hotel,
 Menu,
 X,
 ChevronDown,
 User,
 KeyRound,
 LogOut,
 LayoutDashboard,
 CalendarDays,
 Building2,
 ConciergeBell,
 UtensilsCrossed,
 PanelLeftClose,
 PanelLeftOpen,
 Star,
 Car,
 MicSignal,
} from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";

const navLinks = [
 { label: "Dashboard", path: "/guest", end: true, icon: LayoutDashboard },
 { label: "My Bookings", path: "/guest/bookings", icon: CalendarDays },
 { label: "Banquet Halls", path: "/guest/banquet", icon: Building2 },
 { label: "Services", path: "/guest/services", icon: ConciergeBell },
 { label: "Restaurant", path: "/guest/restaurant", icon: UtensilsCrossed },
 { label: "Cab", path: "/guest/cabs/new", icon: Car },
 { label: "Lost Found", path: "/guest/lostfound", icon: MicSignal },
 { label: "Reviews", path: "/guest/reviews", icon: Star },
];

const GuestLayout = () => {
 const { user, logout } = useAuth();
 const navigate = useNavigate();
 const location = useLocation();
 const [showGuestInfo, setShowGuestInfo] = useState(true);

 const [menuOpen, setMenuOpen] = useState(false);
 const [profileOpen, setProfileOpen] = useState(false);
 const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
 const [collapsed, setCollapsed] = useState(false);

 const profileRef = useRef(null);
 const mobileProfileRef = useRef(null);

 
 useEffect(() => {
 const handleClickOutside = (event) => {
 if (profileRef.current && !profileRef.current.contains(event.target)) {
 setProfileOpen(false);
 }

 if (
 mobileProfileRef.current &&
 !mobileProfileRef.current.contains(event.target)
 ) {
 setMobileProfileOpen(false);
 }
 };

 const handleEscape = (event) => {
 if (event.key === "Escape") {
 setProfileOpen(false);
 setMobileProfileOpen(false);
 setMenuOpen(false);
 }
 };

 document.addEventListener("mousedown", handleClickOutside);
 document.addEventListener("keydown", handleEscape);

 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 document.removeEventListener("keydown", handleEscape);
 };
 }, []);

 
 useEffect(() => {
 setMenuOpen(false);
 setProfileOpen(false);
 setMobileProfileOpen(false);
 }, [location.pathname]);

 
 useEffect(() => {
 if (!menuOpen) return;

 const previousOverflow = document.body.style.overflow;
 document.body.style.overflow = "hidden";

 return () => {
 document.body.style.overflow = previousOverflow;
 };
 }, [menuOpen]);

 const handleLogout = async () => {
 setProfileOpen(false);
 setMobileProfileOpen(false);
 setMenuOpen(false);

 try {
 await logout();
 toast.success("Logged out successfully");
 navigate("/login", { replace: true, state: null });
 } catch (error) {
 toast.error(
 error?.response?.data?.message ||
 "Could not log out. Please try again.",
 );
 }
 };

 if (!user) return null;

 const initials = (user.name || "Guest")
 .split(" ")
 .filter(Boolean)
 .slice(0, 2)
 .map((word) => word[0].toUpperCase())
 .join("");

 const activePage =
 navLinks.find((item) =>
 item.end
 ? location.pathname === item.path
 : location.pathname.startsWith(item.path),
 )?.label || "Guest Dashboard";

 
 const linkClass = ({ isActive }) =>
 [
 "group flex min-h-[48px] w-full items-center rounded",
 "text-sm font-medium ",
 collapsed ? "justify-center !gap-0 !px-0" : "justify-start gap-3 px-3",
 isActive
 ? "bg-white text-black"
 : "text-neutral-400 ",
 ].join(" ");

 const renderNavLinks = (mobile = false) =>
 navLinks.map(({ label, path, end, icon: Icon }) => (
 <NavLink
 key={path}
 to={path}
 end={end}
 title={!mobile && collapsed ? label : undefined}
 onClick={() => {
 setMenuOpen(false);
 setProfileOpen(false);
 setMobileProfileOpen(false);
 }}
 className={
 mobile
 ? ({ isActive }) =>
 [
 "flex min-h-[48px] w-full items-center gap-3 rounded px-4",
 "text-sm font-medium ",
 isActive
 ? "bg-white text-black"
 : "text-neutral-400 ",
 ].join(" ")
 : linkClass
 }
 >
 <Icon size={20} strokeWidth={1.9} className="h-5 w-5 shrink-0" />
 {(mobile || !collapsed) && <span className="truncate">{label}</span>}
 </NavLink>
 ));

 
 const logoutButton = (mobile = false, dark = false) => (
 <button
 type="button"
 onClick={handleLogout}
 title={!mobile && collapsed && dark ? "Logout" : undefined}
 className={[
 "flex min-h-[44px] w-full items-center rounded text-sm font-medium ",
 dark
 ? "text-neutral-300 "
 : "text-neutral-700 ",
 !mobile && collapsed && dark
 ? "justify-center !gap-0 !px-0"
 : "gap-3 px-3",
 ].join(" ")}
 >
 <LogOut size={19} className="h-5 w-5 shrink-0" />
 {(mobile || !collapsed || !dark) && <span>Logout</span>}
 </button>
 );

 const profileLinks = (mobile = false, dark = false) => {
 const itemClass = `flex items-center gap-3 rounded px-3 py-2.5 text-sm ${
 dark
 ? "text-neutral-300 "
 : "text-neutral-700 "
 }`;

 const closeAll = () => {
 setProfileOpen(false);
 setMobileProfileOpen(false);
 setMenuOpen(false);
 };

 return (
 <>
 <Link
 role="menuitem"
 to="/profile"
 onClick={closeAll}
 className={itemClass}
 >
 <User size={17} />
 My Profile
 </Link>

 <Link
 role="menuitem"
 to="/change-password"
 onClick={closeAll}
 className={itemClass}
 >
 <KeyRound size={17} />
 Change Password
 </Link>

 <div
 className={`my-1 border-t ${
 dark ? "border-white/10" : "border-neutral-200"
 }`}
 />
 {logoutButton(mobile, dark)}
 </>
 );
 };

 const guestInfoCard = (mobile = false) => {
 if (!showGuestInfo) return null;

 return (
 <div
 className={`relative rounded border border-white/15 bg-white/5 p-4 ${
 mobile ? "mt-6" : "mb-3"
 }`}
 >
 <button
 type="button"
 onClick={() => setShowGuestInfo(false)}
 aria-label="Close guest information card"
 title="Close"
 className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/40"
 >
 <X size={17} />
 </button>

 <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-white text-black">
 <Hotel size={20} />
 </div>

 <p className="text-sm font-bold text-white">Your next stay awaits</p>

 <p className="mt-1.5 text-xs leading-5 text-neutral-400">
 Explore our rooms, banquet halls and guest services.
 </p>

 <Link
 to="/guest"
 onClick={() => setMenuOpen(false)}
 className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-white underline-offset-4"
 >
 Explore StayNexa <span aria-hidden="true">→</span>
 </Link>
 </div>
 );
 };


 const profileAvatar = (size = "h-10 w-10", dark = false) =>
 user.profileImage ? (
 <img
 src={user.profileImage}
 alt={user.name || "Profile"}
 className={`${size} shrink-0 rounded-full object-cover ring-2 ${
 dark ? "ring-white/20" : "ring-neutral-200"
 }`}
 />
 ) : (
 <span
 className={`${size} flex shrink-0 items-center justify-center rounded-full text-sm font-bold ${
 dark ? "bg-white text-black" : "bg-black text-white"
 }`}
 >
 {initials}
 </span>
 );

 return (
 <div className="min-h-screen bg-white text-black">
 
 <aside
 className={`fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-black text-white lg:flex lg:flex-col ${
 collapsed ? "w-[84px]" : "w-64"
 } `}
 >
 
 <div
 className={`flex h-[72px] shrink-0 items-center border-b border-white/10 ${
 collapsed ? "justify-center px-2" : "px-5"
 }`}
 >
 <Link
 to="/guest"
 title={collapsed ? "StayNexa home" : undefined}
 className="flex min-w-0 items-center gap-3"
 >
 <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-black">
 <Hotel size={22} />
 </span>

 {!collapsed && (
 <span className="whitespace-nowrap text-xl font-bold tracking-tight text-white">
 StayNexa
 </span>
 )}
 </Link>
 </div>

 
 <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-5">
 <div
 className={`mb-4 flex h-8 items-center ${
 collapsed ? "justify-center" : "justify-between px-1"
 }`}
 >
 {!collapsed && (
 <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
 Guest Menu
 </p>
 )}

 <button
 type="button"
 onClick={() => {
 setCollapsed((value) => !value);
 setProfileOpen(false);
 }}
 title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
 aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
 aria-expanded={!collapsed}
 className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white/30"
 >
 {collapsed ? (
 <PanelLeftOpen size={19} />
 ) : (
 <PanelLeftClose size={19} />
 )}
 </button>
 </div>

 <nav className="space-y-1.5">{renderNavLinks()}</nav>
 </div>

 
 <div className="shrink-0 border-t border-white/10 p-3">
 {!collapsed && guestInfoCard()}

 
 <div className="relative" ref={profileRef}>
 <button
 type="button"
 onClick={() => setProfileOpen((value) => !value)}
 title={collapsed ? user.name || "Guest profile" : undefined}
 aria-expanded={profileOpen}
 aria-haspopup="menu"
 className={`flex min-h-[56px] w-full items-center rounded border border-transparent p-2 focus:outline-none focus:ring-2 focus:ring-white/30 ${
 collapsed ? "justify-center" : "gap-3"
 }`}
 >
 {profileAvatar("h-10 w-10", true)}

 {!collapsed && (
 <>
 <span className="min-w-0 flex-1 text-left">
 <span className="block truncate text-sm font-semibold text-white">
 {user.name || "Guest"}
 </span>
 <span className="mt-0.5 block text-xs text-neutral-400">
 Guest Account
 </span>
 </span>

 <ChevronDown
 size={16}
 className={`shrink-0 text-neutral-400 ${
 profileOpen ? "rotate-180 text-white" : ""
 }`}
 />
 </>
 )}
 </button>

 {profileOpen && (
 <div
 role="menu"
 className={`absolute bottom-full z-50 mb-2 w-56 overflow-hidden rounded border border-white/20 bg-black p-1.5 ${
 collapsed ? "left-full ml-2" : "left-0"
 }`}
 >
 <div className="border-b border-white/10 px-3 py-3">
 <p className="truncate text-sm font-semibold text-white">
 {user.name || "Guest"}
 </p>
 <p className="mt-0.5 text-xs text-neutral-400">
 Guest Account
 </p>
 </div>
 {profileLinks(false, true)}
 </div>
 )}
 </div>
 </div>
 </aside>

 
 <div
 className={`min-h-screen min-w-0 ${
 collapsed ? "lg:pl-[84px]" : "lg:pl-64"
 }`}
 >
 
 <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95">
 <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
 <div className="flex min-w-0 items-center gap-3">
 <button
 type="button"
 onClick={() => {
 setMenuOpen(true);
 setMobileProfileOpen(false);
 }}
 className="rounded border border-neutral-200 p-2 text-neutral-700 lg:hidden"
 aria-label="Open navigation"
 >
 <Menu size={21} />
 </button>

 
<div className="min-w-0">
 <p className="truncate text-sm font-semibold text-black">
 {activePage}
 </p>
 <p className="hidden text-xs text-neutral-500 sm:block">
 Welcome to Stay Nexa
 </p>
</div>

 </div>

 
 <div className="relative shrink-0" ref={mobileProfileRef}>
 <button
 type="button"
 onClick={() => setMobileProfileOpen((value) => !value)}
 className="flex items-center gap-2 rounded bg-white p-1.5 pr-3 focus:outline-none"
 aria-expanded={mobileProfileOpen}
 aria-haspopup="menu"
 aria-label="Open profile menu"
 >
 {profileAvatar("h-9 w-9")}

 <span className="hidden min-w-0 text-left sm:block">
 <span className="block max-w-32 truncate text-sm font-semibold text-black">
 {user.name || "Guest"}
 </span>
 <span className="block text-xs text-neutral-500">
 Guest Account
 </span>
 </span>

 <ChevronDown
 size={16}
 className={`text-neutral-400 ${
 mobileProfileOpen ? "rotate-180" : ""
 }`}
 />
 </button>

 {mobileProfileOpen && (
 <div
 role="menu"
 className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded border border-neutral-200 bg-white p-1.5"
 >
 <div className="flex items-center gap-3 border-b border-neutral-200 px-3 py-3">
 {profileAvatar("h-10 w-10")}

 <div className="min-w-0">
 <p className="truncate text-sm font-semibold text-black">
 {user.name || "Guest"}
 </p>
 <p className="truncate text-xs text-neutral-500">
 {user.email || "Guest Account"}
 </p>
 </div>
 </div>

 {profileLinks(true, false)}
 </div>
 )}
 </div>
 </div>
 </header>

 
 {menuOpen && (
 <div className="fixed inset-0 z-50 lg:hidden">
 <button
 type="button"
 aria-label="Close navigation"
 onClick={() => setMenuOpen(false)}
 className="absolute inset-0 bg-black/60"
 />

 <aside className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col bg-black text-white">
 
 <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-5">
 <Link
 to="/guest"
 onClick={() => setMenuOpen(false)}
 className="flex items-center gap-3 text-xl font-bold text-white"
 >
 <span className="flex h-10 w-10 items-center justify-center rounded bg-white text-black">
 <Hotel size={21} />
 </span>
 <span>StayNexa</span>
 </Link>

 <button
 type="button"
 onClick={() => setMenuOpen(false)}
 className="rounded p-2 text-neutral-400"
 aria-label="Close menu"
 >
 <X size={20} />
 </button>
 </div>

 
 <div className="min-h-0 flex-1 overflow-y-auto p-4">
 <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
 Guest Menu
 </p>

 <nav className="space-y-1.5">{renderNavLinks(true)}</nav>

 {guestInfoCard(true)}
 </div>

 
 <div className="shrink-0 border-t border-white/10 bg-black p-4">
 <div className="mb-3 flex items-center gap-3 rounded bg-white/5 p-3">
 {profileAvatar("h-10 w-10", true)}

 <div className="min-w-0">
 <p className="truncate text-sm font-semibold text-white">
 {user.name || "Guest"}
 </p>
 <p className="mt-0.5 text-xs text-neutral-400">
 Guest Account
 </p>
 </div>
 </div>

 {profileLinks(true, true)}
 </div>
 </aside>
 </div>
 )}
 
 <main className="bg-white mx-auto w-full max-w-[1800px] p-4 sm:p-6 lg:p-7">
 <Outlet />
 </main>
 </div>
 </div>
 );
};

export default GuestLayout;