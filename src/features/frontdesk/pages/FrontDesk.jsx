import { useCallback, useEffect, useMemo, useState } from "react";
import { ConciergeBell, Loader2, LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { checkIn, checkOut, getOverview } from "../services/frontdesk.service";

// TODO: apni guest service file ka sahi path likho (jisme getRequestList,
// setRequestStatus aur replyToRequest hain).
// import { getRequestList, replyToRequest, setRequestStatus, } from "../../guests/services/guests.service";
import {
  getRequestList,
  replyToRequest,
  setRequestStatus,
} from "../../guests/services/Guests.service";

import ExportButtons from "../../../components/common/ExportButtons";
// import RequestActions from "../components/RequestActions";
import RequestActions from "../components/RequestActions";

const TABS = [
  { key: "arrivals", label: "Arrivals" },
  { key: "departures", label: "Departures" },
  { key: "inHouse", label: "In-House" },
  { key: "request", label: "Request" },
];

const CARD_LABELS = {
  arrivals: "Today's Arrivals",
  departures: "Today's Departures",
  inHouse: "Guests In-House",
  request: "Open Requests",
};

const REQUEST_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-blue-200 bg-blue-50 text-blue-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const PRIORITY_STYLES = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  normal: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

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
  request.room?.roomNumber || request.booking?.room?.roomNumber || "-";

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
    value: (booking) =>
      Math.max(
        0,
        Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0),
      ),
    type: "currency",
  },
];

const requestExportColumns = [
  { header: "Request Number", key: "requestNumber" },
  { header: "Guest Name", value: (request) => getRequestGuestName(request) },
  { header: "Room Number", value: (request) => getRequestRoom(request) },
  { header: "Type", value: (request) => labelize(request.type) },
  { header: "Priority", value: (request) => labelize(request.priority) },
  { header: "Status", value: (request) => labelize(request.status) },
  { header: "Description", key: "description" },
  { header: "Reply", value: (request) => request.adminReply || "-" },
  {
    header: "Requested At",
    value: (request) => formatDateTime(request.createdAt),
  },
];

const Spinner = () => (
  <div className="flex items-center justify-center py-16 text-slate-400">
    <Loader2 size={22} className="animate-spin" />
  </div>
);

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
    <ConciergeBell size={28} />
    <p className="text-sm">{text}</p>
  </div>
);

const Badge = ({ className, children }) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

const FrontDesk = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("arrivals");
  const [busyId, setBusyId] = useState(null);

  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const data = await getOverview();
      setOverview(data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load front desk");
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

  /* ----------------------------- Bookings ----------------------------- */

  const handleCheckIn = async (booking) => {
    setBusyId(booking._id);
    try {
      await checkIn(booking._id);
      toast.success(`${booking.guestDetails?.name || "Guest"} checked in`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Check-in failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleCheckOut = async (booking) => {
    const due = Math.max(
      0,
      Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0),
    );

    if (due > 0) {
      const ok = window.confirm(
        `${formatPrice(due)} There is still an outstanding balance. Would you like to settle it before check-out?`,
      );
      if (!ok) return;
    }

    setBusyId(booking._id);
    try {
      await checkOut(booking._id, due > 0);
      toast.success(`${booking.guestDetails?.name || "Guest"} checked out`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Check-out failed");
    } finally {
      setBusyId(null);
    }
  };

  /* ------------------------- Guest requests -------------------------- */

  // Merge only the fields that change, so populated room/guest/booking
  // objects in the list are not replaced by plain ids.
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
              assignedToName: updated.assignedToName ?? item.assignedToName,
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
        error.response?.data?.message || "Could not update request status",
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

  /* ------------------------------ Derived ----------------------------- */

  const isRequestTab = tab === "request";
  const list = isRequestTab ? [] : overview?.[tab] || [];
  const counts = overview?.counts || {};
  const selectedTabLabel =
    TABS.find((item) => item.key === tab)?.label || "Bookings";

  const reportCount = isRequestTab ? filteredRequests.length : list.length;
  const reportLoading = isRequestTab ? requestsLoading : loading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Front Desk</h1>
        <p className="mt-1 text-sm text-slate-500">
          Today's Arrivals, Departures, In-House Guests, and Guest Requests
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map((item) => (
          <div
            key={item.key}
            className="rounded border border-slate-200 bg-white p-4"
          >
            <p className="text-xs text-slate-500">{CARD_LABELS[item.key]}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {item.key === "request"
                ? openRequestCount
                : (counts[item.key] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                tab === item.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
              {item.key === "request" && openRequestCount > 0 && (
                <span className="ml-2 rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-700">
                  {openRequestCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {selectedTabLabel} Report
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {reportLoading
              ? isRequestTab
                ? "Loading requests..."
                : "Loading bookings..."
              : `${reportCount} ${
                  isRequestTab ? "request(s)" : "booking(s)"
                } available to export`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isRequestTab && (
            <select
              value={requestFilter}
              onChange={(event) => setRequestFilter(event.target.value)}
              aria-label="Filter requests by status"
              className="rounded border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
            >
              {REQUEST_STATUS_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          )}

          <ExportButtons
            title={`Front Desk - ${selectedTabLabel} Report`}
            fileName={`front-desk-${tab}`}
            columns={
              isRequestTab ? requestExportColumns : frontDeskExportColumns
            }
            rows={isRequestTab ? filteredRequests : list}
          />
        </div>
      </div>

      {isRequestTab ? (
        /* ------------------------- Guest requests ------------------------- */

        <div className="grid grid-cols-3 gap-3">
          {requestsLoading ? (
            <div className="rounded border border-slate-200 bg-white p-3">
              <Spinner />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded border border-slate-200 bg-white p-6">
              <EmptyState text="No guest requests found." />
            </div>
          ) : (
            filteredRequests.map((request) => (
            
<article
  key={request._id}
  className="rounded border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
>
  {/* Header */}
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="border-slate-200 bg-slate-50 text-slate-700">
      {labelize(request.type)}
    </Badge>

    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
        PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.normal
      }`}
    >
      {labelize(request.priority)}
    </span>

    <Badge
      className={STATUS_STYLES[request.status] || STATUS_STYLES.pending}
    >
      {request.status === "done"
        ? "Completed"
        : labelize(request.status)}
    </Badge>
  </div>

  {/* Description */}
  <p className="mt-3 break-words text-sm leading-6 text-slate-800">
    {request.description}
  </p>

  {/* Request Details */}
  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
    <span>{getRequestGuestName(request)}</span>

    <span>Room {getRequestRoom(request)}</span>

    <span>{formatDateTime(request.createdAt)}</span>

    {request.charge > 0 && (
      <span className="font-medium text-slate-700">
        Charge: {formatPrice(request.charge)}
      </span>
    )}
  </div>

  {/* Actions */}
  <div className="mt-4 border-t border-slate-100 pt-3">
    <RequestActions
      request={request}
      onSetStatus={handleSetRequestStatus}
      onReply={handleReplyToRequest}
    />
  </div>
</article>

            ))
          )}
        </div>
      ) : (
        /* ----------------------------- Bookings ---------------------------- */
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          {loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <EmptyState text="No bookings found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Guest</th>
                    <th className="px-4 py-3 font-medium">Room</th>
                    <th className="px-4 py-3 font-medium">Stay</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((booking) => {
                    const due = Math.max(
                      0,
                      Number(booking.totalAmount || 0) -
                        Number(booking.paidAmount || 0),
                    );
                    const busy = busyId === booking._id;
                    const isArrival = tab === "arrivals";
                    const pending = booking.status === "pending";

                    return (
                      <tr key={booking._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {booking.bookingNumber || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {booking.guestDetails?.name || "-"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.guestDetails?.phone || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>Room {booking.room?.roomNumber || "-"}</p>
                          <p className="text-xs text-slate-500">
                            {booking.roomType?.name || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(booking.checkIn)} -{" "}
                          {formatDate(booking.checkOut)}
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            due > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {due > 0 ? formatPrice(due) : "Paid"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {isArrival ? (
                              pending ? (
                                <span className="text-xs text-amber-600">
                                  First, confirm the booking.
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleCheckIn(booking)}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 rounded bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {busy ? (
                                    <Loader2
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <LogIn size={14} />
                                  )}
                                  Check-in
                                </button>
                              )
                            ) : tab === "departures" || tab === "inHouse" ? (
                              <button
                                type="button"
                                onClick={() => handleCheckOut(booking)}
                                disabled={busy}
                                className="flex items-center gap-1.5 rounded bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                              >
                                {busy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <LogOut size={14} />
                                )}
                                Check-out
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FrontDesk;
