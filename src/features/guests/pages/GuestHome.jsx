import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ConciergeBell,
  DoorOpen,
  HandHelping,
  Sparkles,
  UserRound,
  UtensilsCrossed,
  Building2,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";

const quickActions = [
  {
    label: "My Bookings",
    description: "View your reservations and stay details.",
    path: "/guest/reservation",
    icon: CalendarCheck,
  },
  {
    label: "Hotel Services",
    description: "Request housekeeping, laundry and more.",
    path: "/guest/services",
    icon: HandHelping,
  },
  {
    label: "Restaurant",
    description: "Order food and drinks to your room.",
    path: "/guest/restaurant",
    icon: UtensilsCrossed,
  },
  {
    label: "Banquet Halls",
    description: "Explore halls for your special events.",
    path: "/guest/banquet",
    icon: Building2,
  },
  {
    label: "My Service Requests",
    description: "Track your requests and their status.",
    path: "/guest/service-requests",
    icon: ConciergeBell,
  },
];

const GuestHome = () => {
  const { user } = useAuth();

  const guestName = user?.name?.trim()?.split(" ")[0] || "Guest";

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-full min-w-0 space-y-4 pb-4">
      {/* Welcome header */}
      <section className="rounded bg-black p-5 text-white sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-neutral-300">
              <Sparkles size={13} />
              Your personal guest portal
            </div>

            <p className="text-xs text-neutral-400">{today}</p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {guestName}!
            </h1>

            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Your stay, reservations and hotel services, all in one place.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/guest/reservation"
              className="inline-flex items-center justify-center gap-2 rounded bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              <CalendarCheck size={16} />
              My Bookings
              <ArrowUpRight size={15} />
            </Link>

            <Link
              to="/guest/services"
              className="inline-flex items-center justify-center gap-2 rounded border border-white/30 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <HandHelping size={16} />
              Request Service
            </Link>
          </div>
        </div>
      </section>

      {/* Main dashboard content */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
        <section className="min-w-0 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-black">Explore Your Stay</h2>
            <p className="text-xs text-neutral-500">
              Everything you need for a comfortable experience.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickActions.map(({ label, description, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="group flex min-w-0 items-start gap-3 rounded border border-neutral-200 bg-white p-4 transition hover:border-black"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-black text-white">
                  <Icon size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-black">
                      {label}
                    </h3>
                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-neutral-400 transition group-hover:text-black"
                    />
                  </div>

                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Helpful information */}
          <div className="rounded border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded bg-black text-white">
                <CheckCircle2 size={19} />
              </div>

              <div>
                <h2 className="text-sm font-bold text-black">
                  Make the most of your stay
                </h2>
                <p className="text-xs text-neutral-500">
                  A few useful things you can do from your dashboard.
                </p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-neutral-100">
              <HelpfulLink
                icon={CalendarDays}
                title="Review your reservations"
                description="Check booking details and stay dates."
                to="/guest/reservation"
              />
              <HelpfulLink
                icon={ConciergeBell}
                title="Get help from hotel staff"
                description="Submit a request and follow its progress."
                to="/guest/service-requests"
              />
              <HelpfulLink
                icon={UtensilsCrossed}
                title="Order food to your room"
                description="Browse the menu and pay with UPI."
                to="/guest/restaurant"
              />
            </div>
          </div>
        </section>

        {/* Right-side panel */}
        <aside className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-4 py-3">
              <h2 className="text-sm font-bold text-black">Guest Assistance</h2>
              <p className="text-xs text-neutral-500">
                Need something during your stay?
              </p>
            </div>

            <div className="space-y-3 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-neutral-200 text-black">
                  <DoorOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-black">
                    Room Assistance
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-neutral-500">
                    Ask for towels, housekeeping or other room essentials.
                  </p>
                  <Link
                    to="/guest/services"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-black underline-offset-4 hover:underline"
                  >
                    Request help <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 border-t border-neutral-100 pt-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-neutral-200 text-black">
                  <Clock3 size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-black">
                    Track a Request
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-neutral-500">
                    Check whether your request is pending, in progress or
                    completed.
                  </p>
                  <Link
                    to="/guest/service-requests"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-black underline-offset-4 hover:underline"
                  >
                    View requests <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Profile shortcut */}
          <section className="rounded border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                <UserRound size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Your Account
                </p>
                <h3 className="truncate text-sm font-semibold text-black">
                  {user?.name || "Guest Profile"}
                </h3>
              </div>
            </div>

            <Link
              to="/guest/profile"
              className="mt-3 flex w-full items-center justify-between rounded border border-neutral-200 px-3 py-2 text-sm font-semibold text-black transition hover:bg-black hover:text-white"
            >
              View Profile
              <ChevronRight size={16} />
            </Link>
          </section>

          <div className="rounded border border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-2 text-black">
              <Sparkles size={16} />
              <h3 className="text-sm font-bold">Your comfort matters</h3>
            </div>
            <p className="mt-1.5 text-xs leading-5 text-neutral-600">
              Use your guest portal to manage bookings and send service
              requests whenever you need assistance.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

function HelpfulLink({ icon: Icon, title, description, to }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-neutral-200 text-black transition group-hover:bg-black group-hover:text-white">
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-black">{title}</h3>
        <p className="text-xs leading-5 text-neutral-500">{description}</p>
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-black"
      />
    </Link>
  );
}

export default GuestHome;