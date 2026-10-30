import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Ban,
  BedDouble,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  CreditCard,
  Moon,
  Plus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { cancelBooking, listBookings } from "../services/bookings.service";

const LIMIT = 6;

const STATUS_META = {
  hold: { label: "On hold", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  pending: { label: "Awaiting advance", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", badge: "bg-slate-900 text-white", dot: "bg-slate-900" },
  checked_in: { label: "Checked in", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  checked_out: { label: "Completed", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  cancelled: { label: "Cancelled", badge: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  no_show: { label: "No show", badge: "bg-orange-50 text-orange-700", dot: "bg-orange-500" },
};

const PAYMENT_META = {
  unpaid: { label: "Unpaid", badge: "bg-rose-50 text-rose-700" },
  partial: { label: "Partly paid", badge: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", badge: "bg-emerald-50 text-emerald-700" },
  refunded: { label: "Refunded", badge: "bg-slate-100 text-slate-600" },
};

const TABS = [
  { key: "all", label: "All bookings", params: {} },
  { key: "upcoming", label: "Upcoming", params: { status: "pending,confirmed" } },
  { key: "current", label: "Current stay", params: { status: "checked_in" } },
  { key: "past", label: "Completed", params: { status: "checked_out" } },
  { key: "cancelled", label: "Cancelled", params: { status: "cancelled,no_show" } },
];

const CANCELLABLE = ["pending", "confirmed"];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const getTotalPages = (meta) =>
  meta?.totalPages ||
  meta?.pages ||
  Math.ceil((meta?.total || 0) / (meta?.limit || LIMIT)) ||
  1;

const Badge = ({ meta, fallback }) => (
  <span
    className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-semibold ${
      meta?.badge || "bg-slate-100 text-slate-600"
    }`}
  >
    {meta?.label || fallback}
  </span>
);

const CardsSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={index} className="rounded border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-6 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="mt-5 h-6 w-44 rounded bg-slate-200" />
        <div className="mt-4 h-16 rounded bg-slate-100" />
        <div className="mt-4 h-10 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const Detail = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p>
  </div>
);

const BookingCard = ({ booking, open, onToggle, onCancel }) => {
  const status = STATUS_META[booking.status];
  const payment = PAYMENT_META[booking.paymentStatus];
  const balance = Math.max(
    (booking.totalAmount || 0) - ((booking.paidAmount || 0) - (booking.refundedAmount || 0)),
    0
  );
  const canCancel = CANCELLABLE.includes(booking.status);
  const bookingCode = booking.bookingNumber || String(booking._id).slice(-8).toUpperCase();

  return (
    <article className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Booking ID</span>
              <span className="break-all rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{bookingCode}</span>
            </div>
            <h2 className="mt-3 break-words text-lg font-bold text-slate-950 sm:text-xl">
              {booking.roomType?.name || "Room reservation"}
            </h2>
            {booking.room?.roomNumber && (
              <p className="mt-1 text-sm text-slate-500">Room {booking.room.roomNumber}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge meta={status} fallback={booking.status} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 rounded bg-slate-50 p-3 sm:grid-cols-2 sm:p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-slate-700">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Stay dates</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-800">
                {formatDate(booking.checkIn)} <span className="text-slate-400">to</span> {formatDate(booking.checkOut)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-slate-700">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Guests and duration</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {booking.adults || 0} adult{booking.adults === 1 ? "" : "s"}
                {booking.children ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}` : ""}
                <span className="text-slate-400"> · </span>{booking.nights || 0} night{booking.nights === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total booking amount</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{money(booking.totalAmount)}</p>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <Badge meta={payment} fallback={booking.paymentStatus} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 sm:justify-start"
        >
          {open ? "Hide booking details" : "View booking details"}
          <ChevronDown className={`h-4 w-4 ${open ? "rotate-180" : ""}`} />
        </button>
        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(booking)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700"
          >
            <Ban className="h-4 w-4" />
            Cancel booking
          </button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-200 px-4 py-5 sm:grid-cols-3 sm:px-5">
          <Detail label="Room charges" value={money(booking.roomCharges)} />
          <Detail label="Taxes" value={money(booking.taxAmount)} />
          <Detail label="Discount" value={money(booking.discountAmount)} />
          <Detail label="Advance required" value={money(booking.advanceRequired)} />
          <Detail label="Amount paid" value={money(booking.paidAmount)} />
          <Detail label="Balance due" value={money(balance)} />
          {booking.expectedArrivalTime && <Detail label="Arrival time" value={booking.expectedArrivalTime} />}
          {booking.specialRequests && (
            <div className="col-span-2 sm:col-span-3">
              <Detail label="Special requests" value={booking.specialRequests} />
            </div>
          )}
          {booking.status === "cancelled" && booking.cancelReason && (
            <div className="col-span-2 sm:col-span-3">
              <Detail label="Cancellation reason" value={booking.cancelReason} />
            </div>
          )}
        </div>
      )}
    </article>
  );
};

const MyBookings = () => {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const params = useMemo(() => TABS.find((item) => item.key === tab)?.params || {}, [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBookings({ page, limit: LIMIT, ...params });
      setBookings(data.items || data.bookings || []);
      setMeta(data.meta || { total: data.total, page: data.page, pages: data.pages });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load your bookings");
    } finally {
      setLoading(false);
    }
  }, [page, params]);

  useEffect(() => {
    load();
  }, [load]);

  const changeTab = (key) => {
    setTab(key);
    setPage(1);
    setOpenId(null);
  };

  const confirmCancel = async () => {
    if (!target) return;
    setCancelling(true);
    try {
      await cancelBooking(target._id, { reason: "Cancelled by guest" });
      toast.success("Your booking has been cancelled");
      setTarget(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not cancel the booking");
    } finally {
      setCancelling(false);
    }
  };

  const totalPages = getTotalPages(meta);
  const activeTab = TABS.find((item) => item.key === tab);

  return (
    <main className="mx-auto w-full min-w-0 space-y-5 pb-6 sm:space-y-6">
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className=" px-4 py-6 text-black sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-700">
                <CalendarCheck className="h-3.5 w-3.5" /> Reservation center
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Bookings</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-800 sm:text-base">
                Keep your stays, payment details, and reservation updates in one place.
              </p>
            </div>
            <Link
              to="/guest/reservation"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded bg-black px-4 py-3 text-sm font-bold text-white sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Make a reservation
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700"><CalendarDays className="h-5 w-5" /></span>
            <div><p className="text-xs font-medium text-slate-400">Current view</p><p className="mt-1 text-sm font-bold text-slate-900">{activeTab?.label || "All bookings"}</p></div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700"><BedDouble className="h-5 w-5" /></span>
            <div><p className="text-xs font-medium text-slate-400">Bookings on this page</p><p className="mt-1 text-sm font-bold text-slate-900">{loading ? "Loading…" : bookings.length}</p></div>
          </div>
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700"><CircleCheck className="h-5 w-5" /></span>
            <div><p className="text-xs font-medium text-slate-400">Page position</p><p className="mt-1 text-sm font-bold text-slate-900">{loading ? "—" : `${page} of ${totalPages}`}</p></div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Your reservations</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a category to find a specific stay.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Clock3 className="h-4 w-4" /> Updated from your booking records
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" aria-label="Filter bookings">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => changeTab(item.key)}
              aria-pressed={tab === item.key}
              className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                tab === item.key
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <CardsSkeleton />
        ) : bookings.length === 0 ? (
          <div className="rounded border border-dashed border-slate-300 bg-white px-4 py-12 text-center sm:px-6 sm:py-16">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded bg-slate-100 text-slate-500">
              <CalendarCheck className="h-7 w-7" />
            </span>
            <h3 className="mt-4 text-lg font-bold text-slate-900">No bookings found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              {tab === "all" ? "You have not made a booking yet. Your next stay can start here." : "There are no reservations in this category right now."}
            </p>
            {tab === "all" && (
              <Link to="/guest/reservation" className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" /> Make your first reservation
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {bookings.map((booking) => (
              <BookingCard
                key={booking._id}
                booking={booking}
                open={openId === booking._id}
                onToggle={() => setOpenId(openId === booking._id ? null : booking._id)}
                onCancel={setTarget}
              />
            ))}
          </div>
        )}
      </section>

      {!loading && totalPages > 1 && (
        <nav className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4" aria-label="Booking pages">
          <p className="text-center text-sm text-slate-500 sm:text-left">Page <span className="font-semibold text-slate-900">{page}</span> of <span className="font-semibold text-slate-900">{totalPages}</span></p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="Cancel this booking?"
        message={
          target
            ? `Booking ${target.bookingNumber || ""} for ${formatDate(target.checkIn)} will be cancelled. This cannot be undone.`
            : ""
        }
        confirmText="Yes, cancel booking"
        cancelText="Keep booking"
        tone="danger"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      />
    </main>
  );
};

export default MyBookings;
