
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ConciergeBell,
  Loader2,
  LogIn,
  LogOut,
  CalendarDays,
  BedDouble,
  Wallet,
  Users,
  ClipboardList,
} from "lucide-react";
import toast from "react-hot-toast";

import { checkIn, getOverview } from "../services/frontdesk.service";
import {
  getRequestList,
  replyToRequest,
  setRequestStatus,
} from "../../guests/services/Guests.service";

import ExportButtons from "../../../components/common/ExportButtons";
import RequestActions from "../components/RequestActions";

const TABS = [
  { key: "arrivals", label: "Arrivals" },
  { key: "departures", label: "Departures" },
  { key: "inHouse", label: "In-House" },
  { key: "request", label: "Requests" },
];

const CARD_LABELS = {
  arrivals: "Today's Arrivals",
  departures: "Today's Departures",
  inHouse: "Guests In-House",
  request: "Open Requests",
};

const REQUEST_STATUS_FILTERS = [
  { value: "all", label: "All Requests" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
};

const PRIORITY_STYLES = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })
    : "-";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const labelize = (value) =>
  value
    ? String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "-";

const getRequestGuestName = (request) =>
  request.guest?.name ||
  request.guest?.fullName ||
  request.booking?.guestDetails?.name ||
  "-";

const getRequestRoom = (request) =>
  request.room?.roomNumber ||
  request.booking?.room?.roomNumber ||
  "-";

const getTotalGuests = (booking) =>
  (booking.adults || 0) + (booking.children || 0);

const getDueAmount = (booking) =>
  Math.max(
    0,
    Number(booking.totalAmount || 0) -
      Number(booking.paidAmount || 0),
  );

const frontDeskExportColumns = [
  { header: "Booking Number", key: "bookingNumber" },
  {
    header: "Guest Name",
    value: (booking) => booking.guestDetails?.name || "-",
  },
  {
    header: "Guest Phone",
    value: (booking) => booking.guestDetails?.phone || "-",
  },
  {
    header: "Room Number",
    value: (booking) => booking.room?.roomNumber || "-",
  },
  {
    header: "Room Type",
    value: (booking) => booking.roomType?.name || "-",
  },
  {
    header: "Check-in",
    value: (booking) => formatDate(booking.checkIn),
  },
  {
    header: "Check-out",
    value: (booking) => formatDate(booking.checkOut),
  },
  { header: "Booking Status", key: "status" },
  { header: "Total Amount", key: "totalAmount", type: "currency" },
  { header: "Paid Amount", key: "paidAmount", type: "currency" },
  {
    header: "Due Amount",
    value: (booking) => getDueAmount(booking),
    type: "currency",
  },
];

const requestExportColumns = [
  { header: "Request Number", key: "requestNumber" },
  {
    header: "Guest Name",
    value: (request) => getRequestGuestName(request),
  },
  {
    header: "Room Number",
    value: (request) => getRequestRoom(request),
  },
  { header: "Type", value: (request) => labelize(request.type) },
  {
    header: "Priority",
    value: (request) => labelize(request.priority),
  },
  {
    header: "Status",
    value: (request) => labelize(request.status),
  },
  { header: "Description", key: "description" },
  {
    header: "Reply",
    value: (request) => request.adminReply || "-",
  },
  {
    header: "Requested At",
    value: (request) => formatDateTime(request.createdAt),
  },
];

const Spinner = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400 sm:py-14">
    <Loader2 size={22} className="animate-spin" />
    <span className="text-xs">Loading data...</span>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center text-slate-400 sm:py-14">
    <ConciergeBell size={26} />
    <p className="text-sm text-slate-600">{text}</p>
  </div>
);

const Badge = ({ className = "", children }) => (
  <span
    className={`inline-flex max-w-full items-center rounded-full border px-2 py-1 text-[10px] font-medium leading-4 sm:text-xs ${className}`}
  >
    {children}
  </span>
);

const ActionButton = ({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  className = "",
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${
      variant === "primary"
        ? "bg-slate-900 text-white "
        : "border border-slate-200 bg-white text-slate-700 "
    } ${className}`}
  >
    {children}
  </button>
);

const FrontDesk = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("arrivals");
  const [busyId, setBusyId] = useState(null);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState("all");

  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await getOverview();
      setOverview(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load front desk",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const { items } = await getRequestList({ limit: 100 });
      setRequests(Array.isArray(items) ? items : []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not load guest requests",
      );
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadRequests();
  }, [load, loadRequests]);

  const handleCheckIn = async (booking) => {
    setBusyId(booking._id);

    try {
      await checkIn(booking._id);

      toast.success(
        `${booking.guestDetails?.name || "Guest"} checked in`,
      );

      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Check-in failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckOut = (booking) => {
    navigate(`/bookings/${booking._id}`, {
      state: { action: "checkout" },
    });
  };

  const mergeRequest = (updated) => {
    if (!updated?._id) return;

    setRequests((prev) =>
      prev.map((item) =>
        item._id === updated._id
          ? {
              ...item,
              status: updated.status ?? item.status,
              adminReply: updated.adminReply ?? item.adminReply,
              repliedAt: updated.repliedAt ?? item.repliedAt,
              completedAt: updated.completedAt ?? item.completedAt,
              assignedToName:
                updated.assignedToName ?? item.assignedToName,
              notes: updated.notes ?? item.notes,
            }
          : item,
      ),
    );
  };

  const handleSetRequestStatus = async (request, status) => {
    try {
      const data = await setRequestStatus(request._id, status);

      mergeRequest(data?.request ?? data);
      toast.success("Request status updated");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Could not update request status",
      );
      throw error;
    }
  };

  const handleReplyToRequest = async (request, text) => {
    try {
      const data = await replyToRequest(request._id, text);

      mergeRequest(data?.request ?? data);
      toast.success("Reply sent to guest");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send reply");
      throw error;
    }
  };

  const filteredRequests = useMemo(
    () =>
      requestFilter === "all"
        ? requests
        : requests.filter((item) => item.status === requestFilter),
    [requests, requestFilter],
  );

  const openRequestCount = useMemo(
    () =>
      requests.filter((item) =>
        ["pending", "in_progress"].includes(item.status),
      ).length,
    [requests],
  );

  const isRequestTab = tab === "request";
  const list = isRequestTab ? [] : overview?.[tab] || [];
  const counts = overview?.counts || {};

  const selectedTabLabel =
    TABS.find((item) => item.key === tab)?.label || "Bookings";

  const reportCount = isRequestTab
    ? filteredRequests.length
    : list.length;

  const reportLoading = isRequestTab ? requestsLoading : loading;

  const renderRequestCard = (request) => (
    <article
      key={request._id}
      className="min-w-0 rounded border border-slate-200 bg-white p-3 transition-colors  sm:p-4"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge className="border-slate-200 bg-slate-50 text-slate-700">
          {labelize(request.type)}
        </Badge>

        <Badge
          className={
            PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.normal
          }
        >
          {labelize(request.priority)}
        </Badge>

        <Badge
          className={
            STATUS_STYLES[request.status] || STATUS_STYLES.pending
          }
        >
          {request.status === "done"
            ? "Completed"
            : labelize(request.status)}
        </Badge>
      </div>

      {request.requestNumber && (
        <p className="mt-3 break-words text-xs font-semibold text-slate-500">
          {request.requestNumber}
        </p>
      )}

      <p className="mt-2 break-words text-sm leading-5 text-slate-800 sm:text-sm">
        {request.description || "No description provided."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3">
        <div className="flex min-w-0 items-start gap-2">
          <Users size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400">Guest</p>
            <p className="break-words text-xs font-medium text-slate-700">
              {getRequestGuestName(request)}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-start gap-2">
          <BedDouble
            size={14}
            className="mt-0.5 shrink-0 text-slate-400"
          />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400">Room</p>
            <p className="break-words text-xs font-medium text-slate-700">
              {getRequestRoom(request)}
            </p>
          </div>
        </div>

        <div className="col-span-2 flex min-w-0 items-start gap-2">
          <CalendarDays
            size={14}
            className="mt-0.5 shrink-0 text-slate-400"
          />
          <div className="min-w-0">
            <p className="text-[10px] text-slate-400">Requested At</p>
            <p className="break-words text-xs text-slate-600">
              {formatDateTime(request.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {request.charge > 0 && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-500">Additional Charge</span>
          <span className="break-words text-xs font-semibold text-slate-800">
            {formatPrice(request.charge)}
          </span>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <RequestActions
          request={request}
          onSetStatus={handleSetRequestStatus}
          onReply={handleReplyToRequest}
        />
      </div>
    </article>
  );

  const renderBookingActions = (booking, compact = false) => {
    const isArrival = tab === "arrivals";
    const pending = booking.status === "pending";
    const busy = busyId === booking._id;

    if (isArrival) {
      if (pending) {
        return (
          <span className="text-xs leading-5 text-amber-700">
            Confirm the booking before check-in.
          </span>
        );
      }

      return (
        <ActionButton
          onClick={() => handleCheckIn(booking)}
          disabled={busy}
          className={compact ? "w-full" : ""}
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogIn size={14} />
          )}
          Check-in
        </ActionButton>
      );
    }

    if (tab === "departures" || tab === "inHouse") {
      return (
        <ActionButton
          onClick={() => handleCheckOut(booking)}
          className={compact ? "w-full" : ""}
        >
          <LogOut size={14} />
          Check Out
        </ActionButton>
      );
    }

    return null;
  };

  const renderBookingCard = (booking) => {
    const due = getDueAmount(booking);

    return (
      <article
        key={booking._id}
        className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-4"
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-slate-900">
              {booking.bookingNumber || "-"}
            </p>
            <p className="mt-1 break-words text-xs font-medium text-slate-700">
              {booking.guestDetails?.name || "-"}
            </p>
            <p className="mt-0.5 break-words text-xs text-slate-500">
              {booking.guestDetails?.phone || "-"}
            </p>
          </div>

          <div
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${
              due > 0
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {due > 0 ? "Payment Due" : "Paid"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
          <div className="flex min-w-0 items-start gap-2">
            <BedDouble
              size={15}
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Room</p>
              <p className="mt-0.5 break-words text-xs font-medium text-slate-800">
                {booking.room?.roomNumber
                  ? `Room ${booking.room.roomNumber}`
                  : "Not assigned"}
              </p>
              <p className="mt-0.5 break-words text-[11px] text-slate-500">
                {booking.roomType?.name || "-"}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-2">
            <Users
              size={15}
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400">Guests</p>
              <p className="mt-0.5 text-xs font-medium text-slate-800">
                {getTotalGuests(booking)} guest
                {getTotalGuests(booking) !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded bg-slate-50 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Check-in</p>
              <p className="mt-1 break-words text-xs font-medium text-slate-800">
                {formatDate(booking.checkIn)}
              </p>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">Check-out</p>
              <p className="mt-1 break-words text-xs font-medium text-slate-800">
                {formatDate(booking.checkOut)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Wallet
              size={15}
              className="mt-0.5 shrink-0 text-slate-400"
            />
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500">
                {due > 0 ? "Amount Due" : "Payment Status"}
              </p>
              <p
                className={`mt-0.5 break-words text-sm font-semibold ${
                  due > 0 ? "text-rose-700" : "text-emerald-700"
                }`}
              >
                {due > 0 ? formatPrice(due) : "Paid"}
              </p>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-[10px] text-slate-500">Total Amount</p>
            <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
              {formatPrice(booking.totalAmount)}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          {renderBookingActions(booking, true)}
        </div>
      </article>
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Front Desk
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
            Manage arrivals, departures, in-house guests and guest requests.
          </p>
        </div>

        <ActionButton
          onClick={() => navigate("/quick-check-in")}
          className="w-full sm:w-auto"
        >
          <LogIn size={15} />
          Quick Check-in
        </ActionButton>
      </header>

      
      <section className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`min-w-0 rounded border p-3 text-left transition sm:p-4 ${
              tab === item.key
                ? "border-slate-400 bg-slate-50"
                : "border-slate-200 bg-white "
            }`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="text-[11px] leading-4 text-slate-500 sm:text-xs">
                {CARD_LABELS[item.key]}
              </p>

              {item.key === "request" && openRequestCount > 0 && (
                <span className="inline-flex shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                  {openRequestCount}
                </span>
              )}
            </div>

            <p className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
              {loading && item.key !== "request"
                ? "—"
                : item.key === "request"
                  ? openRequestCount
                  : (counts[item.key] ?? 0)}
            </p>
          </button>
        ))}
      </section>

      
      <nav
        className="flex min-w-0 gap-1 overflow-x-auto rounded bg-slate-100 p-1"
        aria-label="Front desk sections"
      >
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            aria-pressed={tab === item.key}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
              tab === item.key
                ? "bg-white text-slate-900"
                : "text-slate-500 "
            }`}
          >
            {item.label}

            {item.key === "request" && openRequestCount > 0 && (
              <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                {openRequestCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      
      <section className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800 sm:text-base">
            {selectedTabLabel} Report
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {reportLoading
              ? isRequestTab
                ? "Loading requests..."
                : "Loading bookings..."
              : `${reportCount} ${
                  isRequestTab ? "request(s)" : "booking(s)"
                } available to export`}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          {isRequestTab && (
            <select
              value={requestFilter}
              onChange={(event) => setRequestFilter(event.target.value)}
              aria-label="Filter requests by status"
              className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 sm:w-auto"
            >
              {REQUEST_STATUS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          <div className="min-w-0">
            <ExportButtons
              title={`Front Desk - ${selectedTabLabel} Report`}
              fileName={`front-desk-${tab}`}
              columns={
                isRequestTab
                  ? requestExportColumns
                  : frontDeskExportColumns
              }
              rows={isRequestTab ? filteredRequests : list}
            />
          </div>
        </div>
      </section>

      
      {isRequestTab ? (
        <section className="min-w-0">
          {requestsLoading ? (
            <div className="rounded border border-slate-200 bg-white">
              <Spinner />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white">
              <EmptyState text="No guest requests found." />
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredRequests.map(renderRequestCard)}
            </div>
          )}
        </section>
      ) : (
        <section className="min-w-0">
          {loading ? (
            <div className="rounded border border-slate-200 bg-white">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white">
              <EmptyState text="No bookings found." />
            </div>
          ) : (
            <>
              
              <div className="grid min-w-0 grid-cols-1 gap-3 md:hidden">
                {list.map(renderBookingCard)}
              </div>

              
              <div className="hidden min-w-0 overflow-hidden rounded border border-slate-200 bg-white md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-3 font-semibold lg:px-4">
                          Booking
                        </th>
                        <th className="px-3 py-3 font-semibold lg:px-4">
                          Guest
                        </th>
                        <th className="px-3 py-3 font-semibold lg:px-4">
                          Room
                        </th>
                        <th className="px-3 py-3 font-semibold lg:px-4">
                          Stay
                        </th>
                        <th className="px-3 py-3 font-semibold lg:px-4">
                          Due Amount
                        </th>
                        <th className="px-3 py-3 text-right font-semibold lg:px-4">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {list.map((booking) => {
                        const due = getDueAmount(booking);

                        return (
                          <tr
                            key={booking._id}
                            className="transition "
                          >
                            <td className="px-3 py-3 font-semibold text-slate-900 lg:px-4">
                              {booking.bookingNumber || "-"}
                            </td>

                            <td className="px-3 py-3 lg:px-4">
                              <p className="max-w-44 truncate font-medium text-slate-900">
                                {booking.guestDetails?.name || "-"}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {booking.guestDetails?.phone || "-"}
                              </p>
                            </td>

                            <td className="px-3 py-3 text-slate-700 lg:px-4">
                              <p>
                                Room {booking.room?.roomNumber || "-"}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {booking.roomType?.name || "-"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 text-slate-600 lg:px-4">
                              <div>{formatDate(booking.checkIn)}</div>
                              <div className="mt-0.5 text-xs text-slate-500">
                                to {formatDate(booking.checkOut)}
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-medium lg:px-4">
                              <span
                                className={
                                  due > 0
                                    ? "text-rose-700"
                                    : "text-emerald-700"
                                }
                              >
                                {due > 0 ? formatPrice(due) : "Paid"}
                              </span>
                            </td>

                            <td className="px-3 py-3 lg:px-4">
                              <div className="flex justify-end">
                                {renderBookingActions(booking)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default FrontDesk;