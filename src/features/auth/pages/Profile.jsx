
import { Link } from "react-router-dom";
import {
  Mail,
  Phone,
  ShieldCheck,
  CalendarDays,
  Clock,
  KeyRound,
  UserRound,
  ArrowRight,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  manager: "Manager",
  staff: "Staff",
  guest: "Guest",
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-3 rounded border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
      <Icon size={18} strokeWidth={1.8} />
    </div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  </div>
);

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  const initials = (user.name || "User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  const roleLabel = ROLE_LABELS[user.role] || user.role || "User";

  return (
    <div className="w-full min-w-0 space-y-6 pb-6">
      
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Account settings
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your personal information and account security.
          </p>
        </div>

        <Link
          to="/change-password"
          className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <KeyRound size={16} />
          Change Password
        </Link>
      </div>

      
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
          {user.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name || "User"}
              className="h-20 w-20 shrink-0 rounded border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded bg-black text-2xl font-bold text-white">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-xl font-bold text-slate-900">
                {user.name || "User"}
              </h2>

              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={14} />
                {roleLabel}
              </span>
            </div>

            <p className="mt-1 break-all text-sm text-slate-500">
              {user.email || "No email available"}
            </p>

            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <CalendarDays size={14} />
              Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </section>

      
      <section className="rounded border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-5">
          <h3 className="text-base font-bold text-slate-900">
            Personal Information
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Your registered details and account activity.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoItem
            icon={UserRound}
            label="Full Name"
            value={user.name}
          />

          <InfoItem
            icon={Mail}
            label="Email Address"
            value={user.email}
          />

          <InfoItem
            icon={Phone}
            label="Phone Number"
            value={user.phone}
          />

          <InfoItem
            icon={ShieldCheck}
            label="Account Role"
            value={roleLabel}
          />

          <InfoItem
            icon={CalendarDays}
            label="Member Since"
            value={formatDate(user.createdAt)}
          />

          <InfoItem
            icon={Clock}
            label="Last Login"
            value={formatDate(user.lastLoginAt)}
          />
        </div>
      </section>

      
      <section className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700">
            <KeyRound size={18} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Account Security
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Keep your password private and update it regularly.
            </p>
          </div>
        </div>

        <Link
          to="/change-password"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Update Password
          <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
};

export default Profile;
