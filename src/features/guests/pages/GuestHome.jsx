import { Link } from "react-router-dom";
import { CalendarCheck, UtensilsCrossed, HandHelping } from "lucide-react";
import useAuth from "../../../hooks/useAuth";

const cards = [
  { label: "My Bookings", desc: "View and manage your room bookings", path: "/guest/reservation", icon: CalendarCheck },
  { label: "Banquet Halls", desc: "Check hall availability and catering", path: "/guest/banquet", icon: UtensilsCrossed },
  { label: "Services", desc: "Request towels, luggage help and more", path: "/guest/services", icon: HandHelping },
];

const GuestHome = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-blue-600 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {user.name}</h1>
        <p className="mt-2 text-sm text-blue-100">
          Book rooms, plan events and request services, all in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, desc, path, icon: Icon }) => (
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
  );
};

export default GuestHome;