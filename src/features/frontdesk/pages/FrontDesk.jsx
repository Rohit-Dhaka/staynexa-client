import { useCallback, useEffect, useState } from "react";
import { ConciergeBell, Loader2, LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { checkIn, checkOut, getOverview } from "../services/frontdesk.service";
import ExportButtons from "../../../components/common/ExportButtons";

const TABS = [
  { key: "arrivals", label: "Arrivals" },
  { key: "departures", label: "Departures" },
  { key: "inHouse", label: "In-House" },
];

const formatPrice = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })
    : "-";

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

const FrontDesk = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("arrivals");
  const [busyId, setBusyId] = useState(null);

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

  useEffect(() => {
    load();
  }, [load]);

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

  const list = overview?.[tab] || [];
  const counts = overview?.counts || {};
  const selectedTabLabel = TABS.find((item) => item.key === tab)?.label || "Bookings";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Front Desk</h1>
        <p className="mt-1 text-sm text-slate-500">
          Today's Arrivals, Departures, and In-House Guests
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TABS.map((item) => (
          <div
            key={item.key}
            className="rounded border border-slate-200 bg-white p-4"
          >
            <p className="text-xs text-slate-500">
              {item.key === "arrivals"
                ? "Today's Arrivals"
                : item.key === "departures"
                  ? "Today's Departures"
                  : "Guests In-House"}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {counts[item.key] ?? 0}
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
            {loading ? "Loading bookings..." : `${list.length} booking(s) available to export`}
          </p>
        </div>

        <ExportButtons
          title={`Front Desk - ${selectedTabLabel} Report`}
          fileName={`front-desk-${tab}`}
          columns={frontDeskExportColumns}
          rows={list}
        />
      </div>

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
                    Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0),
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
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
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
                                  <Loader2 size={14} className="animate-spin" />
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
    </div>
  );
};

export default FrontDesk;
