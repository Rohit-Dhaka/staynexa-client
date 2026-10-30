import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  deleteGuest,
  getGuestById,
  setGuestBlacklist,
  setGuestVip,
} from "../services/guestExperience.service";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");

const Stat = ({ label, value }) => (
  <div className="min-w-0 rounded border border-slate-200 bg-white p-5">
    <p className="text-sm text-slate-500">{label}</p>
    <p className="mt-2 break-words text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const GuestProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getGuestById(id);
      setData(result);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load guest");
      navigate("/guests", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action, message) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBlacklist = () => {
    const guest = data?.guest;
    if (!guest) return;

    if (guest.isBlacklisted) {
      return run(() => setGuestBlacklist(id, false), "Removed from blacklist");
    }

    const reason = window.prompt("Reason for blacklisting this guest:");
    if (!reason || !reason.trim()) return;

    return run(
      () => setGuestBlacklist(id, true, reason.trim()),
      "Guest blacklisted"
    );
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this guest permanently?")) return;

    setBusy(true);
    try {
      await deleteGuest(id);
      toast.success("Guest deleted successfully");
      navigate("/guests");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete guest");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        <Loader2 size={30} />
      </div>
    );
  }

  if (!data?.guest) {
    return (
      <div className="w-full p-6 text-center">
        <p className="text-slate-600">Guest profile could not be loaded.</p>
        <Link
          to="/guests"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-600"
        >
          <ArrowLeft size={16} /> Back to Guests
        </Link>
      </div>
    );
  }

  const { guest, bookings = [] } = data;
  const stats = data.summary || data.stats || {};

  const totalStays = stats.totalStays ?? stats.completedStays ?? 0;
  const totalNights =
    stats.totalNights ??
    bookings.reduce((total, booking) => total + Number(booking.nights || 0), 0);
  const totalSpend = stats.totalSpend ?? stats.totalSpent ?? 0;
  const lastStay = stats.lastStay ?? null;

  const detail = (label, value) => (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">
        {value || "-"}
      </p>
    </div>
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/guests"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500"
        >
          <ArrowLeft size={17} />
          Back to Guests
        </Link>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/guests/${id}/edit`)}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil size={15} /> Edit
          </button>

          <button
            type="button"
            onClick={() =>
              run(
                () => setGuestVip(id, !guest.isVip),
                guest.isVip ? "VIP removed" : "Marked as VIP"
              )
            }
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Star size={15} />
            {guest.isVip ? "Remove VIP" : "Mark VIP"}
          </button>

          <button
            type="button"
            onClick={handleBlacklist}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ban size={15} />
            {guest.isBlacklisted ? "Remove blacklist" : "Blacklist"}
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-label="Delete guest"
            title="Delete guest"
            className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      <section className="rounded border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-bold text-slate-900 sm:text-3xl">
                {guest.name}
              </h1>

              {guest.isVip && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  VIP
                </span>
              )}

              {guest.isBlacklisted && (
                <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Blacklisted
                </span>
              )}
            </div>

            <p className="mt-2 break-words text-sm text-slate-500">
              {guest.phone}
              {guest.email ? ` | ${guest.email}` : ""}
            </p>
          </div>
        </div>

        {guest.isBlacklisted && guest.blacklistReason && (
          <p className="mt-5 rounded bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Blacklisted: {guest.blacklistReason}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total stays" value={totalStays} />
        <Stat label="Total nights" value={totalNights} />
        <Stat label="Total spend" value={inr(totalSpend)} />
        <Stat label="Last stay" value={day(lastStay)} />
      </section>

      <section className="rounded border border-slate-200 bg-white p-5 sm:p-7">
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Guest details</h2>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {detail("Gender", guest.gender)}
          {detail("Date of birth", guest.dateOfBirth ? day(guest.dateOfBirth) : "")}
          {detail("Phone", guest.phone)}
          {detail("Email", guest.email)}
          {detail("City", guest.city)}
          {detail("State", guest.state)}
          {detail("Country", guest.country)}
          {detail("ID type", guest.idProof?.type)}
          {detail("ID number", guest.idProof?.number)}
          {detail("Address", guest.address)}
          <div className="sm:col-span-2 xl:col-span-4">{detail("Notes", guest.notes)}</div>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <h2 className="text-lg font-semibold text-slate-900">Booking history</h2>
          <span className="text-sm text-slate-500">
            {bookings.length} recent booking{bookings.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Booking</th>
                <th className="px-5 py-4 font-medium">Room</th>
                <th className="px-5 py-4 font-medium">Stay</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Amount</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No bookings yet
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {booking.bookingNumber || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {booking.room?.roomNumber || "-"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {day(booking.checkIn)} to {day(booking.checkOut)} ({booking.nights || 0} nights)
                    </td>
                    <td className="px-5 py-4 capitalize text-slate-600">
                      {String(booking.status || "-").replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900">
                      {inr(booking.totalAmount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default GuestProfile;
