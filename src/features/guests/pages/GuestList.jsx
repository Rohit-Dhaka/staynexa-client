import { useCallback, useEffect, useState } from "react";
import ExportButtons from "../../../components/common/ExportButtons";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import { TableSkeleton } from "../../../components/common/Skeleton";
import { getGuests, updateGuestFlags } from "../services/Guests.service";

const LIMIT = 10;

const selectClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 sm:w-auto";

const FILTERS = {
  vip: { isVip: "true" },
  blacklisted: { isBlacklisted: "true" },
  inactive: { isActive: "false" },
};

const formatINR = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const guestExportColumns = [
  { header: "Guest Name", key: "name" },
  { header: "Email", key: "email" },
  { header: "Phone", key: "phone" },
  { header: "City", key: "city" },
  { header: "Completed Stays", key: "completedStays", type: "number" },
  { header: "Total Bookings", key: "totalBookings", type: "number" },
  { header: "Total Spent", key: "totalSpent", type: "currency" },
  { header: "VIP", value: (guest) => (guest.isVip ? "Yes" : "No") },
  {
    header: "Blacklisted",
    value: (guest) => (guest.isBlacklisted ? "Yes" : "No"),
  },
  { header: "Active", value: (guest) => (guest.isActive ? "Yes" : "No") },
  { header: "Last Stay", value: (guest) => formatDate(guest.lastStay) },
];

const GuestList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, ...(FILTERS[filter] || {}) };
      if (search) params.search = search;
      const data = await getGuests(params);
      setItems(data.guests || []);
      setMeta(data.meta || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load guests");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const toggleVip = async (guest) => {
    setBusyId(guest._id);
    try {
      await updateGuestFlags(guest._id, { isVip: !guest.isVip });
      toast.success(guest.isVip ? "VIP removed" : `${guest.name} marked as VIP`);
      fetchGuests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const currentPage = meta?.page || page;
  const totalPages = meta?.totalPages || 1;

  return (
    <main className="w-full min-w-0 max-w-none space-y-5 sm:space-y-6">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Guests</h1>
          <p className="mt-1 text-sm text-slate-500">Guest profiles and stay history</p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canManage && (
            <div className="w-full sm:w-auto">
              <ExportButtons
                title="Guest Report"
                fileName="guests"
                columns={guestExportColumns}
                rows={items}
                getRows={async () => items}
              />
            </div>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => navigate("/guests/new")}
              className="flex w-full items-center justify-center gap-2 rounded bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white sm:w-auto"
            >
              <Plus size={16} />
              Add Guest
            </button>
          )}
        </div>
      </header>

      <section className="grid min-w-0 grid-cols-1 gap-3 rounded border border-slate-200 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4">
        <div className="relative min-w-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, phone or email"
            aria-label="Search guests"
            className="w-full min-w-0 rounded border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter guests"
          className={selectClass}
        >
          <option value="">All Guests</option>
          <option value="vip">VIP</option>
          <option value="blacklisted">Blacklisted</option>
          <option value="inactive">Inactive</option>
        </select>
      </section>

      <section className="w-full min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <div className="p-2 sm:p-4">
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
            <div className="rounded bg-slate-100 p-4 text-slate-500">
              <Users size={28} />
            </div>
            <h3 className="mt-3 font-semibold text-slate-800">No guests found</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {search || filter
                ? "Try changing the search or filter."
                : "Guests are saved automatically when you create a booking."}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">Guest</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">Phone</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">City</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">Stays / Bookings</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">Total Spent</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold sm:px-5">Tags</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold sm:px-5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((guest) => (
                  <tr key={guest._id}>
                    <td className="max-w-[240px] px-4 py-4 sm:px-5">
                      <p className="break-words font-semibold text-slate-900">{guest.name}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{guest.email || "-"}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">{guest.phone || "-"}</td>
                    <td className="px-4 py-4 text-slate-600 sm:px-5">{guest.city || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                      <p className="text-slate-800">{guest.completedStays ?? 0} completed</p>
                      <p className="mt-1 text-xs text-slate-500">{guest.totalBookings ?? 0} total bookings</p>
                      <p className="mt-1 text-xs text-slate-500">Last stay: {formatDate(guest.lastStay)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800 sm:px-5">
                      {formatINR(guest.totalSpent)}
                    </td>
                    <td className="min-w-[140px] px-4 py-4 sm:px-5">
                      <div className="flex flex-wrap gap-1.5">
                        {guest.isVip && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">VIP</span>
                        )}
                        {guest.isBlacklisted && (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Blacklisted</span>
                        )}
                        {!guest.isActive && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Inactive</span>
                        )}
                        {!guest.isVip && !guest.isBlacklisted && guest.isActive && (
                          <span className="text-xs text-slate-400">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/guests/${guest._id}`)}
                          title="View profile"
                          aria-label="View profile"
                          className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600"
                        >
                          <Eye size={16} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(`/guests/${guest._id}/edit`)}
                              title="Edit"
                              aria-label="Edit guest"
                              className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleVip(guest)}
                              disabled={busyId === guest._id}
                              title={guest.isVip ? "Remove VIP" : "Mark as VIP"}
                              aria-label={guest.isVip ? "Remove VIP" : "Mark as VIP"}
                              className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 disabled:opacity-40"
                            >
                              {busyId === guest._id ? (
                                <Loader2 size={16} />
                              ) : (
                                <Star size={16} className={guest.isVip ? "fill-amber-400 text-amber-500" : ""} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && meta && meta.total > 0 && (
          <div className="flex min-w-0 flex-col gap-3 border-t border-slate-100 px-3 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <p className="text-center sm:text-left">
              Page {currentPage} of {totalPages} · {meta.total} total
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center justify-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center justify-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default GuestList;
