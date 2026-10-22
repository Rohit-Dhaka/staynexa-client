import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Pause,
  Play,
  TicketPercent,
  CalendarDays,
} from "lucide-react";
import toast from "react-hot-toast";
import ExportButtons from "../../../components/common/ExportButtons";
import {
  getOffers,
  updateOfferStatus,
  deleteOffer,
} from "../services/offer.service";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const date = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("en-IN");
};

const statusClass = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-slate-100 text-slate-700",
  PAUSED: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-rose-50 text-rose-700",
};

const offerExportColumns = [
  { header: "Offer Name", value: (offer) => offer?.name || "-" },
  { header: "Coupon Code", value: (offer) => offer?.code || "-" },
  { header: "Discount Type", value: (offer) => offer?.discountType || "-" },
  {
    header: "Discount Value",
    value: (offer) =>
      offer?.discountType === "PERCENTAGE"
        ? `${Number(offer?.discountValue || 0)}%`
        : money(offer?.discountValue),
  },
  {
    header: "Maximum Discount",
    value: (offer) =>
      offer?.maxDiscount == null ? "-" : money(offer.maxDiscount),
  },
  { header: "Starts At", value: (offer) => date(offer?.startsAt) },
  { header: "Ends At", value: (offer) => date(offer?.endsAt) },
  { header: "Used Count", value: (offer) => Number(offer?.usedCount || 0) },
  { header: "Usage Limit", value: (offer) => offer?.usageLimit ?? "Unlimited" },
  { header: "Status", value: (offer) => offer?.status || "-" },
];

const getOffersPayload = (response) =>
  Array.isArray(response?.items)
    ? response
    : response?.data && typeof response.data === "object"
      ? response.data
      : response ?? {};

export default function OffersPage() {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const result = getOffersPayload(
        await getOffers({ search, status, page, limit: 10 }),
      );
      setItems(Array.isArray(result.items) ? result.items : []);
      setMeta(result.meta || result.pagination || { total: 0, pages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not load offers");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  // Fetch all pages using the current search and status filters for export.
  const getAllFilteredOffers = useCallback(async () => {
    const limit = 100;
    const allOffers = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = getOffersPayload(
        await getOffers({ search, status, page: currentPage, limit }),
      );
      const pageItems = Array.isArray(response.items) ? response.items : [];
      allOffers.push(...pageItems);

      const pagination = response.meta || response.pagination || {};
      const reportedPages = Number(
        pagination.pages ?? pagination.totalPages ?? response.pages ?? response.totalPages ?? 1,
      );
      totalPages = Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1;
      currentPage += 1;
    } while (currentPage <= totalPages && currentPage <= 500);

    return allOffers;
  }, [search, status]);

  const changeStatus = async (offer) => {
    const nextStatus = offer.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setBusyId(offer._id);

    try {
      await updateOfferStatus(offer._id, nextStatus);
      toast.success(nextStatus === "ACTIVE" ? "Offer activated" : "Offer paused");
      await loadOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Could not update offer");
    } finally {
      setBusyId("");
    }
  };

  const removeOffer = async (offer) => {
    if (!window.confirm(`Delete offer "${offer.name}"?`)) return;

    setBusyId(offer._id);
    try {
      await deleteOffer(offer._id);
      toast.success("Offer deleted");
      await loadOffers();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Offer could not be deleted. Used offers may need to be paused.",
      );
    } finally {
      setBusyId("");
    }
  };

  const activeCount = items.filter((item) => {
    const now = new Date();
    const startsAt = new Date(item.startsAt);
    const endsAt = new Date(item.endsAt);
    return item.status === "ACTIVE" && startsAt <= now && endsAt >= now;
  }).length;

  const draftCount = items.filter((item) => item.status === "DRAFT").length;
  const pausedCount = items.filter((item) => item.status === "PAUSED").length;

  return (
    <main className="w-full min-w-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Offers &amp; Promotions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage hotel discounts and coupon codes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Offers & Promotions Report"
            fileName="offers-promotions"
            columns={offerExportColumns}
            getRows={getAllFilteredOffers}
          />
          <Link
            to="/offers/new"
            className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
          >
            <Plus size={17} />
            Create offer
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total offers" value={meta.total ?? items.length} icon={<TicketPercent size={20} />} />
        <SummaryCard title="Active now (current page)" value={activeCount} icon={<Play size={20} />} />
        <SummaryCard title="Drafts (current page)" value={draftCount} icon={<CalendarDays size={20} />} />
        <SummaryCard title="Paused (current page)" value={pausedCount} icon={<Pause size={20} />} />
      </section>

      <section className="rounded border border-slate-200 bg-white ">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search offer name or coupon code..."
              aria-label="Search offers"
              className="w-full rounded border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter offer status"
            className="rounded border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="PAUSED">Paused</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <button
            type="button"
            onClick={loadOffers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-3 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Offer</th>
                <th className="px-5 py-4 font-medium">Discount</th>
                <th className="px-5 py-4 font-medium">Validity</th>
                <th className="px-5 py-4 font-medium">Usage</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading offers...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <TicketPercent className="mx-auto mb-3 text-slate-300" size={30} />
                    <p className="font-medium text-slate-700">No offers found</p>
                    <p className="mt-1 text-slate-500">Create your first coupon offer to get started.</p>
                  </td>
                </tr>
              ) : (
                items.map((offer) => (
                  <tr key={offer._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{offer.name}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">{offer.code}</p>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {offer.discountType === "PERCENTAGE" ? `${offer.discountValue}%` : money(offer.discountValue)}
                      {offer.maxDiscount != null && offer.discountType === "PERCENTAGE" && (
                        <p className="mt-1 text-xs text-slate-500">Max {money(offer.maxDiscount)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <div>{date(offer.startsAt)}</div>
                      <div className="mt-1 text-xs text-slate-400">to {date(offer.endsAt)}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {offer.usedCount || 0} / {offer.usageLimit ?? "∞"}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[offer.status] || statusClass.DRAFT}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/offers/${offer._id}/edit`}
                          title="Edit offer"
                          aria-label="Edit offer"
                          className="rounded border border-slate-200 p-2 hover:bg-slate-100"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => changeStatus(offer)}
                          disabled={busyId === offer._id}
                          title={offer.status === "ACTIVE" ? "Pause offer" : "Activate offer"}
                          aria-label={offer.status === "ACTIVE" ? "Pause offer" : "Activate offer"}
                          className="rounded border border-slate-200 p-2 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {offer.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeOffer(offer)}
                          disabled={busyId === offer._id}
                          title="Delete offer"
                          aria-label="Delete offer"
                          className="rounded border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-sm text-slate-500">Page {page} of {Math.max(1, meta.pages || 1)}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(meta.pages || 1, current + 1))}
              disabled={page >= (meta.pages || 1) || loading}
              className="rounded border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}

function SummaryCard({ title, value, icon }) {
  return (
    <div className="flex items-center gap-4 rounded border border-slate-200 bg-white p-5 ">
      <div className="rounded bg-slate-100 p-3 text-slate-700">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
