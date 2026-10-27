import { useEffect, useState } from "react";
import ExportButtons from "../../../components/common/ExportButtons";
import { fetchAllPages } from "../../../utils/exportUtils";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { listBookings } from "../services/bookings.service";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadges";
import {
  BOOKING_VIEWS,
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  formatDate,
  formatINR,
  getErrorMessage,
  timeLeft,
} from "../utils/bookingUi";

const PAGE_SIZE = 15;

const field =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const Bookings = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    view: "",
    status: "",
    paymentStatus: "",
    page: 1,
  });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setFilters((f) => ({ ...f, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { limit: PAGE_SIZE, page: filters.page };
        if (filters.view) params.view = filters.view;
        if (filters.status && !filters.view) params.status = filters.status;
        if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
        if (search) params.search = search;

        const result = await listBookings(params);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [filters, search]);

  const changeView = (view) =>
    setFilters((f) => ({ ...f, view, status: "", page: 1 }));
  const changeFilter = (name, value) =>
    setFilters((f) => ({ ...f, [name]: value, page: 1 }));

  const bookingExportColumns = [
    { header: "Booking Number", key: "bookingNumber" },
    {
      header: "Guest Name",
      value: (b) => b.guestDetails?.name || "-",
    },
    {
      header: "Guest Phone",
      value: (b) => b.guestDetails?.phone || "-",
    },
    {
      header: "Room Number",
      value: (b) => b.room?.roomNumber || "-",
    },
    {
      header: "Room Type",
      value: (b) => b.roomType?.name || "-",
    },
    {
      header: "Check-in",
      value: (b) => formatDate(b.checkIn),
    },
    {
      header: "Check-out",
      value: (b) => formatDate(b.checkOut),
    },
    { header: "Nights", key: "nights", type: "number" },
    { header: "Adults", key: "adults", type: "number" },
    { header: "Children", key: "children", type: "number" },
    { header: "Booking Status", key: "status" },
    { header: "Payment Status", key: "paymentStatus" },
    { header: "Total Amount", key: "totalAmount", type: "currency" },
    { header: "Paid Amount", key: "paidAmount", type: "currency" },
    { header: "Balance Amount", key: "balanceAmount", type: "currency" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-500">
            Reservations, Arrivals, and Departures in One Place.
          </p>
        </div>
        <div className="flex gap-2">      
        <ExportButtons
          title="Bookings Report"
          fileName="bookings"
          columns={bookingExportColumns}
          rows={data.items}
          getRows={() =>
            fetchAllPages(
              ({ page, limit }) => {
                const params = { page, limit };

                if (filters.view) params.view = filters.view;
                if (filters.status && !filters.view) {
                  params.status = filters.status;
                }
                if (filters.paymentStatus) {
                  params.paymentStatus = filters.paymentStatus;
                }
                if (search) params.search = search;

                return listBookings(params);
              },
              { limit: 100 },
            )
          }
        />
        <button
          type="button"
          onClick={() => navigate("/bookings/new")}
          className="flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition "
        >
          <Plus size={16} /> New Booking
        </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {BOOKING_VIEWS.map((v) => (
          <button
            key={v.value || "all"}
            type="button"
            onClick={() => changeView(v.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filters.view === v.value
                ? "bg-black text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 ">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-2.5 text-slate-400"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Booking No., Name, or Phone Number"
            className={`${field} w-64 pl-9`}
          />
        </div>

        {!filters.view && (
          <select
            value={filters.status}
            onChange={(e) => changeFilter("status", e.target.value)}
            className={field}
          >
            <option value="">All status</option>
            {Object.entries(BOOKING_STATUS_META).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={filters.paymentStatus}
          onChange={(e) => changeFilter("paymentStatus", e.target.value)}
          className={field}
        >
          <option value="">All Payments</option>
          {Object.entries(PAYMENT_STATUS_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Stay</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-12 text-center text-slate-400"
                >
                  <Loader2 size={20} className="mx-auto animate-spin" />
                </td>
              </tr>
            )}

            {!loading && data.items.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="px-4 py-12 text-center text-slate-400"
                >
                  No bookings found.
                </td>
              </tr>
            )}

            {!loading &&
              data.items.map((b) => (
                <tr
                  key={b._id}
                  onClick={() => navigate(`/bookings/${b._id}`)}
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {b.bookingNumber}
                    </p>
                    {b.isAdvance && (
                      <span className="mt-0.5 inline-block rounded bg-black px-1.5 py-0.5 text-[11px] font-medium text-white">
                        Advance
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">{b.guestDetails?.name}</p>
                    <p className="text-xs text-slate-500">
                      {b.guestDetails?.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">Room {b.room?.roomNumber}</p>
                    <p className="text-xs text-slate-500">{b.roomType?.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-900">
                      {formatDate(b.checkIn)}{" "}
                      <span className="text-slate-400">to</span>{" "}
                      {formatDate(b.checkOut)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {b.nights} night{b.nights > 1 ? "s" : ""},{" "}
                      {b.adults + (b.children || 0)} guest
                      {b.adults + (b.children || 0) > 1 ? "s" : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={b.status} />
                    {b.status === "hold" && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {timeLeft(b.holdExpiresAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    
                    {b.status === "hold" ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : (
                      <PaymentStatusBadge status={b.paymentStatus} />
                    )}
                    
                    {b.balanceAmount > 0 &&
                      !["hold", "cancelled", "no_show"].includes(b.status) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          Outstanding Balance {formatINR(b.balanceAmount)}
                        </p>
                      )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatINR(b.totalAmount)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {data.page} / {data.pages} ({data.total} bookings)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={filters.page <= 1 || loading}
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            type="button"
            disabled={filters.page >= data.pages || loading}
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Bookings;
