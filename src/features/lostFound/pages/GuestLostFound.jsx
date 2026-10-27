
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSearch,
  MapPin,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import lostFoundService from "../services/lostFoundService";
import LostFoundForm from "../components/LostFoundForm";
import {
  Button,
  EmptyState,
  ErrorMessage,
  Loading,
  PageHeading,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "../components/LostFoundUI";

const PAGE_SIZE = 8;

const STATUS_LABELS = {
  reported: "Reported",
  searching: "Searching",
  matched: "Match Found",
  ready_for_pickup: "Ready for Pickup",
  returned: "Returned",
  closed: "Closed",
  cancelled: "Cancelled",
};

const STATUS_FILTERS = [
  { label: "All Reports", value: "" },
  { label: "Reported", value: "reported" },
  { label: "Searching", value: "searching" },
  { label: "Match Found", value: "matched" },
  { label: "Ready for Pickup", value: "ready_for_pickup" },
  { label: "Returned", value: "returned" },
  { label: "Closed", value: "closed" },
  { label: "Cancelled", value: "cancelled" },
];

const CATEGORY_LABELS = {
  phone: "Phone",
  wallet: "Wallet",
  jewellery: "Jewellery",
  documents: "Documents",
  clothing: "Clothing",
  electronics: "Electronics",
  bag: "Bag",
  keys: "Keys",
  accessories: "Accessories",
  other: "Other",
};

const AREA_LABELS = {
  room: "Room",
  restaurant: "Restaurant",
  banquet: "Banquet",
  cab: "Cab",
  lobby: "Lobby",
  parking: "Parking",
  spa: "Spa",
  gym: "Gym",
  pool: "Pool",
  other: "Other",
};

const getId = (item) => item?._id || item?.id || "";

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.reports)) return response.reports;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.reports)) return response.data.reports;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getStatusLabel = (status) =>
  STATUS_LABELS[status] ||
  String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getCategoryLabel = (category) =>
  CATEGORY_LABELS[category] ||
  String(category || "Other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getAreaLabel = (area) =>
  AREA_LABELS[area] ||
  String(area || "Other")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const isCancellable = (status) =>
  ["reported", "searching", "matched"].includes(status);

function SummaryCard({ label, value, icon: Icon, description }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:justify-between sm:gap-5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-words text-sm font-medium text-slate-800 sm:max-w-[65%] sm:text-right">
        {value || "Not provided"}
      </span>
    </div>
  );
}

function ReportDetailsModal({ report, onClose, onCancel, cancelling }) {
  if (!report) return null;

  const reportId = getId(report);
  const status = report.status;
  const photos = Array.isArray(report.photos) ? report.photos : [];

  const itemName = report.itemName || report.title || "Lost Item";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-report-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-3 sm:p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Report Details
            </p>
            <h2
              id="guest-report-title"
              className="mt-2 text-xl font-semibold text-slate-900"
            >
              {itemName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Reference: {reportId || "Unavailable"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={status} />
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {getCategoryLabel(report.category)}
            </span>
          </div>

          <div className="rounded border border-slate-200 px-4">
            <DetailRow
              label="Item Name"
              value={report.itemName || report.title}
            />
            <DetailRow
              label="Category"
              value={getCategoryLabel(report.category)}
            />
            <DetailRow
              label="Lost Area"
              value={getAreaLabel(report.lostArea)}
            />
            <DetailRow
              label="Room Number"
              value={report.roomNumber}
            />
            <DetailRow
              label="Booking Number"
              value={report.bookingNumber}
            />
            <DetailRow
              label="Lost Date"
              value={formatDateTime(report.lostAt)}
            />
            <DetailRow
              label="Last Updated"
              value={formatDateTime(report.updatedAt)}
            />
            <DetailRow
              label="Color"
              value={report.color}
            />
            <DetailRow
              label="Brand"
              value={report.brand}
            />
            <DetailRow
              label="Description"
              value={report.description}
            />
            <DetailRow
              label="Identifying Details"
              value={report.identifyingDetails}
            />
            <DetailRow
              label="Location Details"
              value={report.lostLocationNote}
            />
          </div>

          {photos.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Item Photos
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => {
                  const photoUrl =
                    typeof photo === "string" ? photo : photo?.url;

                  if (!photoUrl) return null;

                  return (
                    <a
                      key={`${photoUrl}-${index}`}
                      href={photoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded border border-slate-200"
                    >
                      <img
                        src={photoUrl}
                        alt={`${itemName} ${index + 1}`}
                        className="h-36 w-full object-cover"
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {status === "matched" && (
            <div className="flex gap-3 rounded border border-blue-200 bg-blue-50 p-4">
              <CheckCircle2
                size={21}
                className="mt-0.5 shrink-0 text-blue-700"
              />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  A Possible Match Was Found
                </h3>
                <p className="mt-1 text-sm text-blue-800">
                  Please contact the hotel reception for verification and
                  further instructions.
                </p>
              </div>
            </div>
          )}

          {status === "ready_for_pickup" && (
            <div className="flex gap-3 rounded border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2
                size={21}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              <div>
                <h3 className="text-sm font-semibold text-emerald-900">
                  Your Item Is Ready for Pickup
                </h3>
                <p className="mt-1 text-sm text-emerald-800">
                  Contact the hotel team to confirm the pickup location and
                  identity verification requirements.
                </p>
              </div>
            </div>
          )}

          {isCancellable(status) && (
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>

              <Button
                variant="danger"
                onClick={() => onCancel(reportId)}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Cancel Report"}
              </Button>
            </div>
          )}

          {!isCancellable(status) && (
            <div className="flex justify-end border-t border-slate-200 pt-5">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function GuestLostFound() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [activeTab, setActiveTab] = useState("reports");
  const [selectedReport, setSelectedReport] = useState(null);
  const [cancellingId, setCancellingId] = useState("");

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await lostFoundService.getMyReports();
      const items = unwrapList(response);

      setReports(items);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = reports.filter((report) => {
    const query = search.trim().toLowerCase();

    const searchableText = [
      report.itemName,
      report.title,
      report.description,
      report.bookingNumber,
      report.roomNumber,
      report.category,
      report.lostArea,
      getId(report),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);
    const matchesStatus =
      !statusFilter || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / PAGE_SIZE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedReports = filteredReports.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const summary = {
    total: reports.length,
    active: reports.filter((report) =>
      ["reported", "searching", "matched"].includes(report.status)
    ).length,
    ready: reports.filter(
      (report) => report.status === "ready_for_pickup"
    ).length,
    returned: reports.filter(
      (report) => report.status === "returned"
    ).length,
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleReportCreated = async () => {
    setActiveTab("reports");
    setNotice("Your lost item report has been submitted successfully.");
    setSelectedReport(null);
    await loadReports(true);
  };

  const handleCancelReport = async (reportId) => {
    if (!reportId || cancellingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this lost item report?"
    );

    if (!confirmed) return;

    setCancellingId(reportId);
    setError("");
    setNotice("");

    try {
      await lostFoundService.cancelMyReport(reportId);

      setNotice("Your report has been cancelled successfully.");
      setSelectedReport(null);

      await loadReports(true);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setCancellingId("");
    }
  };

  const handleOpenReport = async (report) => {
    const reportId = getId(report);

    if (!reportId) {
      setSelectedReport(report);
      return;
    }

    setSelectedReport(report);

    try {
      const response = await lostFoundService.getMyReport(reportId);
      const detail =
        response?.report ||
        response?.item ||
        response?.data?.report ||
        response?.data?.item ||
        response;

      if (detail && typeof detail === "object") {
        setSelectedReport(detail);
      }
    } catch {
      // Keep the list data visible if the detail request fails.
    }
  };

  return (
    <main className="min-h-screen ">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex  items-center justify-between">
            <PageHeading
              title="Lost and Found"
              description="Report lost belongings, track your reports, and check for updates from the hotel team."
            />
            <div className="grid grid-cols-2 gap-1 rounded border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "reports"
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Reports <span className="ml-1 text-xs">({reports.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNotice("");
                  setActiveTab("report");
                }}
                className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === "report"
                    ? "bg-white text-slate-900"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Plus size={14} className="mr-1 inline" />
                Report Lost Item
              </button>
            </div>
        </div>

        {notice && (
          <div
            role="status"
            className="flex  items-start gap-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <p className="flex-1">{notice}</p>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="rounded p-1 transition hover:bg-emerald-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <ErrorMessage message={error} />
            <div>
              <Button
                variant="secondary"
                onClick={() => loadReports(true)}
                disabled={refreshing}
              >
                <RefreshCw size={16} />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-3 mt-6">
        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Reports"
            value={summary.total}
            icon={FileSearch}
            description="All your submitted reports"
          />
          <SummaryCard
            label="Active Reports"
            value={summary.active}
            icon={Search}
            description="Reports under review or matching"
          />
          <SummaryCard
            label="Ready for Pickup"
            value={summary.ready}
            icon={PackageSearch}
            description="Items awaiting collection"
          />
          <SummaryCard
            label="Items Returned"
            value={summary.returned}
            icon={CheckCircle2}
            description="Reports marked as returned"
          />
        </section>

        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  My Lost Item Reports
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  View the status and details of your submitted reports.
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={() => loadReports(true)}
                disabled={refreshing}
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_230px]">
              <div className="relative">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    handleSearchChange(event.target.value)
                  }
                  placeholder="Search item, category, room or reference..."
                  aria-label="Search lost item reports"
                  className="h-11 w-full rounded border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(event.target.value)
                }
                aria-label="Filter reports by status"
                className="h-11 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-10">
              <Loading />
            </div>
          ) : paginatedReports.length === 0 ? (
            <div className="p-6 sm:p-10">
              <EmptyState
                icon={PackageSearch}
                title={
                  reports.length === 0
                    ? "No Lost Item Reports Yet"
                    : "No Matching Reports"
                }
                description={
                  reports.length === 0
                    ? "If you have lost something during your stay, submit a report so the hotel team can help."
                    : "Try changing your search or status filter."
                }
                action={
                  reports.length === 0 ? (
                    <Button onClick={() => setActiveTab("report")}>
                      <Plus size={18} />
                      Report Lost Item
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("");
                        setCurrentPage(1);
                      }}
                    >
                      Clear Filters
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {paginatedReports.map((report) => {
                  const reportId = getId(report);
                  const status = report.status;
                  const itemName =
                    report.itemName || report.title || "Lost Item";

                  return (
                    <article
                      key={reportId || `${itemName}-${report.createdAt}`}
                      className="p-3 transition hover:bg-slate-50/70"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
                            <PackageSearch size={23} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="break-words font-semibold text-slate-900">
                                {itemName}
                              </h3>
                              <StatusBadge status={status} />
                            </div>

                            <p className="mt-1 text-sm text-slate-500">
                              {getCategoryLabel(report.category)}
                              {report.lostArea
                                ? ` · ${getAreaLabel(report.lostArea)}`
                                : ""}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays size={14} />
                                Lost: {formatDate(report.lostAt)}
                              </span>

                              {report.roomNumber && (
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin size={14} />
                                  Room {report.roomNumber}
                                </span>
                              )}

                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={14} />
                                Reported: {formatDate(report.createdAt)}
                              </span>
                            </div>

                            {report.description && (
                              <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
                                {report.description}
                              </p>
                            )}

                            {report.bookingNumber && (
                              <p className="mt-1 text-xs text-slate-500">
                                Booking: {report.bookingNumber}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                          <Button
                            variant="secondary"
                            onClick={() => handleOpenReport(report)}
                          >
                            <Eye size={16} />
                            View Details
                          </Button>

                          {isCancellable(status) && (
                            <Button
                              variant="secondary"
                              onClick={() => handleCancelReport(reportId)}
                              disabled={
                                !reportId || cancellingId === reportId
                              }
                            >
                              <X size={16} />
                              {cancellingId === reportId
                                ? "Cancelling..."
                                : "Cancel"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 border-t border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing{" "}
                  {filteredReports.length === 0
                    ? 0
                    : (safePage - 1) * PAGE_SIZE + 1}
                  {"–"}
                  {Math.min(safePage * PAGE_SIZE, filteredReports.length)} of{" "}
                  {filteredReports.length} reports
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={safePage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </Button>

                  <span className="min-w-20 text-center text-sm text-slate-600">
                    Page {safePage} of {totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    Next
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div>
            <h3 className="text-sm font-semibold text-amber-900">
              Important Information
            </h3>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Please provide accurate item details. If a possible match is
              found, the hotel team may ask you to verify ownership before
              returning the item.
            </p>
          </div>
        </div>
          </div>
        )}

      </div>

      {activeTab === "report" && (
        <section className="rounded border border-slate-200 bg-white p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Report a Lost Item</h2>
              <p className="mt-1 text-xs text-slate-500">Enter the item details so the hotel team can help.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              aria-label="Close report form"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <X size={16} />
            </button>
          </div>
          <LostFoundForm
            key="guest-lost-report-form"
            mode="lost"
            onCancel={() => setActiveTab("reports")}
            onSubmit={async (payload) => {
              await lostFoundService.createMyReport(payload);
              await handleReportCreated();
              setActiveTab("reports");
            }}
          />
        </section>
      )}

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onCancel={handleCancelReport}
          cancelling={Boolean(cancellingId)}
        />
      )}
    </main>
  );
}
