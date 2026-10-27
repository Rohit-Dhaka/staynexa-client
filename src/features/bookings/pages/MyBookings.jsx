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
  Moon,
  Plus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import ConfirmDialog from "../../../components/common/ConfirmDialog";

import { cancelBooking, listBookings } from "../services/bookings.service";

const LIMIT = 6;

const STATUS_META = {
  hold: { label: "On hold", badge: "bg-amber-50 text-amber-700" },
  pending: { label: "Awaiting advance", badge: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmed", badge: "bg-black text-white" },
  checked_in: { label: "Checked in", badge: "bg-emerald-50 text-emerald-700" },
  checked_out: { label: "Completed", badge: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", badge: "bg-rose-50 text-rose-700" },
  no_show: { label: "No show", badge: "bg-orange-50 text-orange-700" },
};

const PAYMENT_META = {
  unpaid: { label: "Unpaid", badge: "bg-rose-50 text-rose-700" },
  partial: { label: "Partly paid", badge: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", badge: "bg-emerald-50 text-emerald-700" },
  refunded: { label: "Refunded", badge: "bg-slate-100 text-slate-600" },
};


const TABS = [
  { key: "all", label: "All", params: {} },
  { key: "upcoming", label: "Upcoming", params: { status: "pending,confirmed" } },
  { key: "current", label: "Current stay", params: { status: "checked_in" } },
  { key: "past", label: "Past", params: { status: "checked_out" } },
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
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
      meta?.badge || "bg-slate-100 text-slate-600"
    }`}
  >
    {meta?.label || fallback}
  </span>
);

const CardsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        className="animate-pulse rounded border border-slate-200 bg-white p-5"
      >
        <div className="flex justify-between">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="h-5 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="mt-4 h-5 w-48 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-40 rounded bg-slate-100" />
        <div className="mt-5 h-9 w-full rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const Detail = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
  </div>
);

const BookingCard = ({ booking, open, onToggle, onCancel }) => {
  const status = STATUS_META[booking.status];
  const payment = PAYMENT_META[booking.paymentStatus];
  const balance = Math.max(
    (booking.totalAmount || 0) -
      ((booking.paidAmount || 0) - (booking.refundedAmount || 0)),
    0
  );
  const canCancel = CANCELLABLE.includes(booking.status);

  return (
    <div className="rounded border border-slate-200 bg-white ">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-400">Booking</p>
            <p className="font-semibold text-slate-900">
              {booking.bookingNumber || String(booking._id).slice(-8).toUpperCase()}
            </p>
          </div>
          <Badge meta={status} fallback={booking.status} />
        </div>

        <div className="mt-4 flex items-center gap-2 text-slate-900">
          <BedDouble className="h-4 w-4 text-slate-400" />
          <p className="font-semibold">
            {booking.roomType?.name || "Room"}
            {booking.room?.roomNumber ? ` · Room ${booking.room.roomNumber}` : ""}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Moon className="h-4 w-4 text-slate-400" />
            {booking.nights} night{booking.nights === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            {booking.adults} adult{booking.adults === 1 ? "" : "s"}
            {booking.children ? `, ${booking.children} child` : ""}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-slate-900">
              {money(booking.totalAmount)}
            </p>
          </div>
          <Badge meta={payment} fallback={booking.paymentStatus} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 "
        >
          {open ? "Hide details" : "View details"}
          <ChevronDown
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
          />
        </button>

        {canCancel && (
          <button
            type="button"
            onClick={() => onCancel(booking)}
            className="inline-flex items-center gap-1.5 rounded border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            <Ban className="h-4 w-4" />
            Cancel
          </button>
        )}
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:grid-cols-3">
          <Detail label="Room charges" value={money(booking.roomCharges)} />
          <Detail label="Taxes" value={money(booking.taxAmount)} />
          <Detail label="Discount" value={money(booking.discountAmount)} />
          <Detail label="Advance required" value={money(booking.advanceRequired)} />
          <Detail label="Paid" value={money(booking.paidAmount)} />
          <Detail label="Balance due" value={money(balance)} />
          {booking.expectedArrivalTime && (
            <Detail label="Arrival time" value={booking.expectedArrivalTime} />
          )}
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
    </div>
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

  const params = useMemo(
    () => TABS.find((item) => item.key === tab)?.params || {},
    [tab]
  );

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

  return (
    <div className="mx-auto w-full  space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
          <p className="text-sm text-slate-500">
            Track your reservations, payments and stays
          </p>
        </div>

        <Link
          to="/guest/reservation"
          className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          New booking
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => changeTab(item.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.key
                ? "bg-black text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <CardsSkeleton />
      ) : bookings.length === 0 ? (
        <div className="rounded border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">No bookings found</p>
          <p className="mt-1 text-sm text-slate-500">
            {tab === "all"
              ? "You have not made a booking yet."
              : "Nothing here for this filter."}
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {bookings.map((booking) => (
            <BookingCard
              key={booking._id}
              booking={booking}
              open={openId === booking._id}
              onToggle={() =>
                setOpenId(openId === booking._id ? null : booking._id)
              }
              onCancel={setTarget}
            />
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(target)}
        title="Cancel this booking?"
        message={
          target
            ? `Booking ${target.bookingNumber || ""} for ${formatDate(
                target.checkIn
              )} will be cancelled. This cannot be undone.`
            : ""
        }
        confirmText="Yes, cancel booking"
        cancelText="Keep booking"
        tone="danger"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
};

export default MyBookings;