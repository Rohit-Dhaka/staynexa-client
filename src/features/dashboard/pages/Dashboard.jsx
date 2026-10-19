import { Link } from "react-router-dom";
import {
  CalendarCheck,
  ConciergeBell,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
  UserCog,
  Receipt,
  BarChart3,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";

const { SUPER_ADMIN, MANAGER, STAFF } = ROLES;
const ALL = [SUPER_ADMIN, MANAGER, STAFF];

const quickLinks = [
  { label: "Bookings", desc: "New booking and calendar", path: "/bookings", icon: CalendarCheck, roles: ALL },
  { label: "Front Desk", desc: "Check-in and check-out", path: "/front-desk", icon: ConciergeBell, roles: ALL },
  { label: "Rooms", desc: "Room types and status", path: "/rooms", icon: BedDouble, roles: ALL },
  { label: "Housekeeping", desc: "Cleaning tasks and inspection", path: "/housekeeping", icon: Sparkles, roles: ALL },
  { label: "Banquet & Catering", desc: "Halls and availability", path: "/banquet", icon: UtensilsCrossed, roles: ALL },
  { label: "Payments & Billing", desc: "Invoices and dues", path: "/billing", icon: Receipt, roles: ALL },
  { label: "Staff", desc: "Create and manage staff accounts", path: "/staff", icon: UserCog, roles: [SUPER_ADMIN] },
  { label: "Reports & Analytics", desc: "Occupancy and revenue", path: "/reports", icon: BarChart3, roles: [SUPER_ADMIN, MANAGER] },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const Dashboard = () => {
  const { user } = useAuth();

  const links = quickLinks.filter((item) => item.roles.includes(user.role));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
        <p className="text-sm text-blue-100">{getGreeting()}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{user.name}</h1>
        <p className="mt-2 text-sm text-blue-100">
          Welcome to StayNexa. Pick a module below to get started.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Quick access
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {links.map(({ label, desc, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="rounded-xl border border-gray-100 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon size={20} />
              </div>
              <p className="mt-4 font-semibold text-gray-900">{label}</p>
              <p className="mt-1 text-sm text-gray-500">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;