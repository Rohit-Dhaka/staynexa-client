
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Eye,
  FileSearch,
  Filter,
  Package,
  PackageCheck,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
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
  Pagination,
  SectionHeader,
  StatCard,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "../components/LostFoundUI";

// =====================================================
// CONSTANTS
// =====================================================

const PAGE_SIZE = 10;

const REPORT_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "searching", label: "Searching" },
  { value: "matched", label: "Matched" },
  { value: "ready_for_pickup", label: "Ready for Pickup" },
  { value: "returned", label: "Returned" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const FOUND_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "stored", label: "Stored" },
  { value: "matched", label: "Matched" },
  { value: "returned", label: "Returned" },
  { value: "donated", label: "Donated" },
  { value: "disposed", label: "Disposed" },
];

const TABS = [
  { id: "reports", label: "Lost Reports", icon: FileSearch },
  { id: "found", label: "Found Inventory", icon: Package },
];

// =====================================================
// HELPERS
// =====================================================

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getList(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.reports)) return response.reports;
  if (Array.isArray(response?.foundItems)) return response.foundItems;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.items)) return response.data.items;

  return [];
}

function getPagination(response, fallbackPage, fallbackLimit) {
  const pagination = response?.pagination || response?.meta || {};

  const page = Number(
    pagination.page ?? pagination.currentPage ?? fallbackPage
  );

  const limit = Number(
    pagination.limit ?? pagination.pageSize ?? fallbackLimit
  );

  const total = Number(
    pagination.total ?? pagination.totalItems ?? response?.total ?? 0
  );

  const totalPages = Number(
    pagination.totalPages ??
      pagination.pages ??
      (total > 0 ? Math.ceil(total / Math.max(1, limit)) : 1)
  );

  return {
    page: Math.max(1, page || 1),
    limit: Math.max(1, limit || fallbackLimit),
    total: Math.max(0, total || 0),
    totalPages: Math.max(1, totalPages || 1),
  };
}

function getId(item) {
  return item?._id || item?.id || "";
}

function getGuestName(report) {
  return (
    report?.contactName ||
    report?.guest?.name ||
    report?.guestName ||
    report?.guest?.fullName ||
    "Guest"
  );
}

function getLocation(item, found = false) {
  return found
    ? item?.foundArea || item?.foundLocation || "—"
    : item?.lostArea || item?.lostLocation || "—";
}

function getSummaryValue(summary, keys, fallback = 0) {
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce((current, part) => current?.[part], summary);

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return fallback;
}

// =====================================================
// DETAIL MODAL
// =====================================================

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0 rounded border border-slate-200 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function ReportDetailsModal({ report, onClose }) {
  if (!report) return null;

  const details = [
    ["Item Name", report.itemName],
    ["Category", report.category],
    ["Status", report.status?.replace(/_/g, " ")],
    ["Guest", getGuestName(report)],
    ["Contact Phone", report.contactPhone],
    ["Booking Number", report.bookingNumber],
    ["Room Number", report.roomNumber],
    ["Lost Area", getLocation(report)],
    ["Lost Date", formatDateTime(report.lostAt)],
    ["Color", report.color],
    ["Brand", report.brand],
    ["Created", formatDateTime(report.createdAt)],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 p-0 sm:items-center sm:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-details-title"
        className="my-auto max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded border border-slate-200 bg-white sm:my-auto"
      >
        <div className="sticky top-0 flex items-center justify-between gap-2.5 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2
              id="report-details-title"
              className="text-lg font-semibold text-slate-900"
            >
              Report Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the lost-item report information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded border border-slate-200 bg-white text-slate-700">
                <Package size={21} />
              </div>

              <div>
                <p className="font-semibold text-slate-900">
                  {report.itemName || "Unnamed Item"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {report.category || "Uncategorized"}
                </p>
              </div>
            </div>

            <StatusBadge status={report.status} />
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {details.map(([label, value]) => (
              <DetailRow key={label} label={label} value={value} />
            ))}
          </div>

          {report.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Description
              </h3>

              <p className="whitespace-pre-wrap break-words rounded border border-slate-200 p-3 text-sm leading-6 text-slate-600">
                {report.description}
              </p>
            </div>
          )}

          {report.identifyingDetails && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Identifying Details
              </h3>

              <p className="whitespace-pre-wrap break-words rounded border border-slate-200 p-3 text-sm leading-6 text-slate-600">
                {report.identifyingDetails}
              </p>
            </div>
          )}

          {report.lostLocationNote && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">
                Additional Location Details
              </h3>

              <p className="whitespace-pre-wrap break-words rounded border border-slate-200 p-3 text-sm leading-6 text-slate-600">
                {report.lostLocationNote}
              </p>
            </div>
          )}

          {Array.isArray(report.photos) && report.photos.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-800">
                Item Photos
              </h3>

              <div className="flex flex-wrap gap-2.5">
                {report.photos.map((photo, index) => {
                  const url =
                    typeof photo === "string"
                      ? photo
                      : photo?.url || photo?.secure_url;

                  if (!url) return null;

                  return (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-slate-200 p-2 text-sm text-blue-700 underline underline-offset-2"
                    >
                      View Photo {index + 1}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MATCH MODAL
// =====================================================

function MatchModal({
  report,
  matches,
  loading,
  error,
  onClose,
  onMatch,
  matchingId,
}) {
  if (!report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 p-0 sm:items-center sm:p-3"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-modal-title"
        className="my-auto max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white sm:my-auto"
      >
        <div className="flex items-center justify-between gap-2.5 border-b border-slate-200 px-4 py-3">
          <div>
            <h2
              id="match-modal-title"
              className="text-lg font-semibold text-slate-900"
            >
              Find Matching Items
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Lost item: {report.itemName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close matching dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-3">
          {error && <ErrorMessage message={error} />}

          {loading ? (
            <Loading message="Finding potential matches..." />
          ) : matches.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No matching items found"
              description="There are no potential matches for this report right now."
            />
          ) : (
            <div className="space-y-3">
              {matches.map((match, index) => {
                const item =
                  match?.item ||
                  match?.foundItem ||
                  match?.found ||
                  match;

                const itemId = getId(item);

                return (
                  <div
                    key={itemId || index}
                    className="flex flex-col gap-2.5 rounded border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">
                        {item?.itemName || "Found Item"}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {item?.category || "Uncategorized"}
                        {" · "}
                        {item?.foundArea || "Unknown location"}
                      </p>

                      {item?.storageLocation && (
                        <p className="mt-1 text-xs text-slate-500">
                          Storage: {item.storageLocation}
                        </p>
                      )}

                      {match?.score !== undefined && (
                        <p className="mt-2 text-xs font-medium text-violet-700">
                          Match score: {match.score}
                        </p>
                      )}

                      {item?.status && (
                        <div className="mt-2">
                          <StatusBadge status={item.status} />
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      disabled={!itemId || Boolean(matchingId)}
                      loading={matchingId === itemId}
                      onClick={() => onMatch(itemId)}
                      className="shrink-0"
                    >
                      Match Item
                      <ArrowRight size={15} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// REPORT STATUS ACTIONS
// =====================================================

function ReportActions({
  report,
  onView,
  onStatusChange,
  updating,
}) {
  const status = report?.status;
  const canChangeStatus = !["returned", "closed", "cancelled"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onView(report)}
      >
        <Eye size={15} />
        View
      </Button>

      {canChangeStatus && (
        <select
          aria-label={`Change status for ${report?.itemName || "lost report"}`}
          value=""
          disabled={updating}
          onChange={(event) => {
            const nextStatus = event.target.value;
            if (nextStatus) onStatusChange(report, nextStatus);
            event.target.value = "";
          }}
          className="min-h-9 rounded border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="" disabled>
            {updating ? "Updating..." : "Change Status"}
          </option>
          <option value="searching">Searching</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      )}
    </div>
  );
}

// =====================================================
// LOST REPORTS TABLE
// =====================================================

function ReportsTable({
  reports,
  onView,
  onFindMatches,
  onStatusChange,
  updatingId,
}) {
  if (!reports.length) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No lost reports found"
        description="Try changing the search term or status filter."
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "Item",
                "Guest",
                "Location",
                "Lost Date",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => {
              const id = getId(report);

              return (
                <tr
                  key={id}
                  className="align-top transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {report.itemName || "Unnamed Item"}
                    </p>

                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {report.category || "Uncategorized"}
                    </p>

                    {report.roomNumber && (
                      <p className="mt-1 text-xs text-slate-500">
                        Room {report.roomNumber}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">
                      {getGuestName(report)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {report.contactPhone || "No phone provided"}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-700">
                      {getLocation(report)}
                    </p>

                    {report.bookingNumber && (
                      <p className="mt-1 text-xs text-slate-500">
                        Booking: {report.bookingNumber}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-600">
                    {formatDateTime(report.lostAt)}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>

                  <td className="px-4 py-3">
                    <ReportActions
                      report={report}
                      onView={onView}
                      onFindMatches={onFindMatches}
                      onStatusChange={onStatusChange}
                      updating={updatingId === id}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {reports.map((report) => (
          <div
            key={getId(report)}
            className="rounded border border-slate-200 p-3"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-900">
                  {report.itemName || "Unnamed Item"}
                </h3>

                <p className="mt-1 text-xs capitalize text-slate-500">
                  {report.category || "Uncategorized"}
                </p>
              </div>

              <StatusBadge status={report.status} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <DetailRow label="Guest" value={getGuestName(report)} />
              <DetailRow
                label="Location"
                value={getLocation(report)}
              />
              <DetailRow
                label="Lost Date"
                value={formatDate(report.lostAt)}
              />
              <DetailRow
                label="Room"
                value={report.roomNumber}
              />
            </div>

            <div className="mt-3">
              <ReportActions
                report={report}
                onView={onView}
                onFindMatches={onFindMatches}
                onStatusChange={onStatusChange}
                updating={updatingId === getId(report)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =====================================================
// FOUND INVENTORY TABLE
// =====================================================

function FoundItemsTable({ items, onView, onFindMatches }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Archive}
        title="No found items registered"
        description="Register items found around the hotel to start tracking them."
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {[
                "Found Item",
                "Location",
                "Storage",
                "Found Date",
                "Status",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={getId(item)}
                className="align-top transition-colors hover:bg-slate-50/70"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">
                    {item.itemName || "Unnamed Item"}
                  </p>

                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {item.category || "Uncategorized"}
                  </p>

                  {item.isHighValue && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                      <ShieldCheck size={13} />
                      High Value
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-sm text-slate-700">
                  {getLocation(item, true)}
                  {item.roomNumber && (
                    <p className="mt-1 text-xs text-slate-500">
                      Room {item.roomNumber}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3 text-sm text-slate-700">
                  {item.storageLocation || "—"}
                </td>

                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDateTime(item.foundAt)}
                </td>

                <td className="px-4 py-3">
                  <StatusBadge status={item.status} />
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onView(item)}
                    >
                      <Eye size={15} />
                      View
                    </Button>

                
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {items.map((item) => (
          <div
            key={getId(item)}
            className="rounded border border-slate-200 p-3"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-900">
                  {item.itemName || "Unnamed Item"}
                </h3>

                <p className="mt-1 text-xs capitalize text-slate-500">
                  {item.category || "Uncategorized"}
                </p>
              </div>

              <StatusBadge status={item.status} />
            </div>

            {item.isHighValue && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                <ShieldCheck size={14} />
                High-Value Item
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <DetailRow
                label="Found Area"
                value={getLocation(item, true)}
              />
              <DetailRow
                label="Storage"
                value={item.storageLocation}
              />
              <DetailRow
                label="Found Date"
                value={formatDate(item.foundAt)}
              />
              <DetailRow
                label="Room"
                value={item.roomNumber}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onView(item)}
              >
                <Eye size={15} />
                View
              </Button>

              {["stored", "matched"].includes(item.status) && (
                <Button
                  size="sm"
                  onClick={() => onFindMatches(item)}
                >
                  <FileSearch size={15} />
                  Find Match
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// =====================================================
// MAIN ADMIN PAGE
// =====================================================

export default function AdminLostFound() {
  const [activeTab, setActiveTab] = useState("reports");

  const [summary, setSummary] = useState(null);

  const [reports, setReports] = useState([]);
  const [foundItems, setFoundItems] = useState([]);

  const [reportPagination, setReportPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [foundPagination, setFoundPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [reportSearch, setReportSearch] = useState("");
  const [foundSearch, setFoundSearch] = useState("");

  const [reportStatus, setReportStatus] = useState("");
  const [foundStatus, setFoundStatus] = useState("");

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingFound, setLoadingFound] = useState(true);

  const [summaryError, setSummaryError] = useState("");
  const [reportError, setReportError] = useState("");
  const [foundError, setFoundError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showFoundForm, setShowFoundForm] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedFoundItem, setSelectedFoundItem] = useState(null);

  const [matchTarget, setMatchTarget] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchingId, setMatchingId] = useState("");

  const [updatingId, setUpdatingId] = useState("");
  const [pendingStatusChange, setPendingStatusChange] = useState(null);

  // ===================================================
  // LOAD SUMMARY
  // ===================================================

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError("");

    try {
      const result = await lostFoundService.getSummary();
      setSummary(result);
    } catch (error) {
      setSummaryError(getErrorMessage(error));
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // ===================================================
  // LOAD REPORTS
  // ===================================================

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setReportError("");

    try {
      const params = {
        page: reportPagination.page,
        limit: PAGE_SIZE,
        search: reportSearch.trim() || undefined,
        status: reportStatus || undefined,
      };

      const result = await lostFoundService.getReports(params);

      setReports(getList(result));

      setReportPagination((previous) => ({
        ...previous,
        ...getPagination(result, previous.page, PAGE_SIZE),
      }));
    } catch (error) {
      setReportError(getErrorMessage(error));
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, [
    reportPagination.page,
    reportSearch,
    reportStatus,
  ]);

  // ===================================================
  // LOAD FOUND INVENTORY
  // ===================================================

  const loadFoundItems = useCallback(async () => {
    setLoadingFound(true);
    setFoundError("");

    try {
      const params = {
        page: foundPagination.page,
        limit: PAGE_SIZE,
        search: foundSearch.trim() || undefined,
        status: foundStatus || undefined,
      };

      const result = await lostFoundService.getFoundItems(params);

      setFoundItems(getList(result));

      setFoundPagination((previous) => ({
        ...previous,
        ...getPagination(result, previous.page, PAGE_SIZE),
      }));
    } catch (error) {
      setFoundError(getErrorMessage(error));
      setFoundItems([]);
    } finally {
      setLoadingFound(false);
    }
  }, [
    foundPagination.page,
    foundSearch,
    foundStatus,
  ]);

  // ===================================================
  // INITIAL LOAD AND FILTER LOADS
  // ===================================================

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadFoundItems();
  }, [loadFoundItems]);

  // ===================================================
  // SEARCH AND FILTER HANDLERS
  // ===================================================

  const handleReportSearch = (event) => {
    event.preventDefault();

    setReportPagination((previous) => ({
      ...previous,
      page: 1,
    }));

    loadReports();
  };

  const handleFoundSearch = (event) => {
    event.preventDefault();

    setFoundPagination((previous) => ({
      ...previous,
      page: 1,
    }));

    loadFoundItems();
  };

  const handleReportStatusChange = (event) => {
    setReportStatus(event.target.value);

    setReportPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  const handleFoundStatusChange = (event) => {
    setFoundStatus(event.target.value);

    setFoundPagination((previous) => ({
      ...previous,
      page: 1,
    }));
  };

  // ===================================================
  // REGISTER FOUND ITEM
  // ===================================================

  const handleCreateFoundItem = async (payload) => {
    setActionError("");
    setSuccessMessage("");

    await lostFoundService.createFoundItem(payload);

    setShowFoundForm(false);
    setFoundPagination((previous) => ({
      ...previous,
      page: 1,
    }));

    setSuccessMessage("Found item registered successfully.");

    await Promise.all([
      loadSummary(),
      loadFoundItems(),
    ]);
  };

  // ===================================================
  // UPDATE REPORT STATUS
  // ===================================================

  const handleStatusChange = (report, status) => {
    if (!getId(report)) return;
    setPendingStatusChange({ report, status });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    const { report, status } = pendingStatusChange;
    const id = getId(report);

    if (!id) return;

    setUpdatingId(id);
    setActionError("");
    setSuccessMessage("");

    try {
      await lostFoundService.setReportStatus(id, {
        status,
        note:
          status === "searching"
            ? "Search started by hotel staff."
            : status === "closed"
              ? "Report closed by hotel staff."
              : status === "cancelled"
                ? "Report cancelled by hotel staff."
                : "",
      });

      setPendingStatusChange(null);
      setSuccessMessage("Report status updated successfully.");

      await Promise.all([
        loadReports(),
        loadSummary(),
      ]);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setUpdatingId("");
    }
  };

  // ===================================================
  // OPEN REPORT MATCHES
  // ===================================================

  const openReportMatches = async (report) => {
    const id = getId(report);

    if (!id) return;

    setMatchTarget({
      type: "report",
      id,
      item: report,
    });

    setMatches([]);
    setMatchError("");
    setLoadingMatches(true);
    setActionError("");

    try {
      const result = await lostFoundService.getReportMatches(id);

      setMatches(getList(result));
    } catch (error) {
      setMatchError(getErrorMessage(error));
    } finally {
      setLoadingMatches(false);
    }
  };

  // ===================================================
  // OPEN FOUND ITEM MATCHES
  // ===================================================

  const openFoundMatches = async (item) => {
    const id = getId(item);

    if (!id) return;

    setMatchTarget({
      type: "found",
      id,
      item,
    });

    setMatches([]);
    setMatchError("");
    setLoadingMatches(true);
    setActionError("");

    try {
      const result = await lostFoundService.getFoundItemMatches(id);

      setMatches(getList(result));
    } catch (error) {
      setMatchError(getErrorMessage(error));
    } finally {
      setLoadingMatches(false);
    }
  };

  // ===================================================
  // LINK MATCH
  // ===================================================

  const handleMatchItem = async (foundItemId) => {
    if (!matchTarget || !foundItemId) return;

    setMatchingId(foundItemId);
    setMatchError("");
    setActionError("");

    try {
      if (matchTarget.type === "report") {
        await lostFoundService.matchFoundItem(matchTarget.id, {
          foundItemId,
        });
      } else {
        // The found-item matches endpoint provides candidate
        // lost reports. Link the selected lost report to this
        // found item using the report-match endpoint.
        await lostFoundService.matchFoundItem(foundItemId, {
          foundItemId: matchTarget.id,
        });
      }

      setMatchTarget(null);
      setMatches([]);
      setSuccessMessage("Items matched successfully.");

      await Promise.all([
        loadReports(),
        loadFoundItems(),
        loadSummary(),
      ]);
    } catch (error) {
      setMatchError(getErrorMessage(error));
    } finally {
      setMatchingId("");
    }
  };

  // ===================================================
  // REFRESH ALL DATA
  // ===================================================

  const refreshAll = async () => {
    setActionError("");
    setSuccessMessage("");

    await Promise.all([
      loadSummary(),
      loadReports(),
      loadFoundItems(),
    ]);
  };

  // ===================================================
  // SUMMARY VALUES
  // ===================================================

  const totalReports = getSummaryValue(summary, [
    "reports.total",
    "totalReports",
  ]);

  const openReports = getSummaryValue(summary, [
    "reports.open",
    "openReports",
  ]);

  const storedItems = getSummaryValue(summary, [
    "found.stored",
    "storedItems",
  ]);

  const returnedItems = getSummaryValue(summary, [
    "found.byStatus.returned",
    "found.returned",
    "returnedItems",
  ]);

  const expiringSoon = getSummaryValue(summary, [
    "found.expiringSoon",
    "expiringSoon",
  ]);

  const highValueStored = getSummaryValue(summary, [
    "found.highValueStored",
    "highValueStored",
  ]);

  const recoveryRate = getSummaryValue(summary, [
    "recoveryRate",
    "reports.recoveryRate",
  ]);

  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="min-h-screen ">
      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4 sm:py-4">
        {/* PAGE HEADER */}

        <PageHeading
          title="Lost & Found Management"
          description="Manage guest reports, track found items, and coordinate item recovery."
          icon={PackageSearchIcon}
          action={
            <>
              <Button
                variant="secondary"
                onClick={refreshAll}
                disabled={
                  loadingSummary || loadingReports || loadingFound
                }
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingSummary || loadingReports || loadingFound
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </Button>

              <Button onClick={() => setShowFoundForm(true)}>
                <PackagePlus size={17} />
                Register Found Item
              </Button>
            </>
          }
        />

        {/* NOTIFICATIONS */}

        {actionError && (
          <ErrorMessage
            message={actionError}
            onRetry={() => setActionError("")}
          />
        )}

        {successMessage && (
          <div className="flex items-start justify-between gap-2.5 rounded border border-green-200 bg-green-50 p-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                size={19}
                className="mt-0.5 shrink-0 text-green-700"
              />

              <p className="text-sm leading-6 text-green-800">
                {successMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss notification"
              className="rounded p-1 text-green-700 hover:bg-green-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* SUMMARY */}

        <section>
          <div className="mb-3 flex items-center justify-between gap-2.5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current Lost & Found activity across the hotel.
              </p>
            </div>

            {summaryError && (
              <button
                type="button"
                onClick={loadSummary}
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={13} />
                Retry
              </button>
            )}
          </div>

          {summaryError ? (
            <ErrorMessage
              message={summaryError}
              onRetry={loadSummary}
            />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard
                title="Total Lost Reports"
                value={totalReports}
                subtitle="All registered lost-item reports"
                icon={FileSearch}
                color="blue"
                loading={loadingSummary}
              />

              <StatCard
                title="Open Reports"
                value={openReports}
                subtitle="Reports requiring follow-up"
                icon={Clock3}
                color="amber"
                loading={loadingSummary}
              />

              <StatCard
                title="Stored Items"
                value={storedItems}
                subtitle="Items currently in storage"
                icon={Archive}
                color="violet"
                loading={loadingSummary}
              />

              <StatCard
                title="Returned Items"
                value={returnedItems}
                subtitle="Items marked as returned"
                icon={PackageCheck}
                color="green"
                loading={loadingSummary}
              />

              <StatCard
                title="Expiring Soon"
                value={expiringSoon}
                subtitle="Items approaching their retention deadline"
                icon={AlertTriangle}
                color="red"
                loading={loadingSummary}
              />

              <StatCard
                title="High-Value Stored"
                value={highValueStored}
                subtitle={
                  recoveryRate !== undefined && recoveryRate !== null
                    ? `Recovery rate: ${recoveryRate}%`
                    : "High-value items currently stored"
                }
                icon={ShieldCheck}
                color="slate"
                loading={loadingSummary}
              />
            </div>
          )}
        </section>

        {/* TABS */}

        <section className="overflow-hidden rounded border border-slate-200 bg-white space-y-4 mt-2">
          <div className="flex flex-col gap-2.5 border-b border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Lost & Found Records
              </h2>







              <p className="mt-1 text-sm text-slate-500">
                Review reports and manage recovered items.
              </p>
            </div>

            <div className="flex w-full gap-1 rounded border border-slate-200 bg-slate-50 p-1 sm:w-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition-colors sm:flex-none ${
                      active
                        ? "border border-slate-200 bg-white text-slate-900"
                        : "border border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* REPORTS TAB */}

          {activeTab === "reports" && (
            <>
              <div className="space-y-3 border-b border-slate-200 p-3 sm:p-3">
                <SectionHeader
                  title="Lost Reports"
                  description={`${reportPagination.total} reports found`}
                />

                <form
                  onSubmit={handleReportSearch}
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
                >
                  <div className="relative">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={reportSearch}
                      onChange={(event) =>
                        setReportSearch(event.target.value)
                      }
                      placeholder="Search item, guest, booking..."
                      className="w-full rounded border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="relative">
                    <Filter
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      value={reportStatus}
                      onChange={handleReportStatusChange}
                      className="w-full rounded border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {REPORT_STATUSES.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={loadingReports}>
                    <Search size={16} />
                    Search
                  </Button>
                </form>
              </div>

              {reportError ? (
                <div className="p-3">
                  <ErrorMessage
                    message={reportError}
                    onRetry={loadReports}
                  />
                </div>
              ) : loadingReports ? (
                <Loading message="Loading lost reports..." />
              ) : (
                <ReportsTable
                  reports={reports}
                  onView={setSelectedReport}
                  onFindMatches={openReportMatches}
                  onStatusChange={handleStatusChange}
                  updatingId={updatingId}
                />
              )}

              {!loadingReports &&
                !reportError &&
                reportPagination.total > 0 && (
                  <Pagination
                    page={reportPagination.page}
                    totalPages={reportPagination.totalPages}
                    total={reportPagination.total}
                    limit={reportPagination.limit}
                    onPageChange={(page) =>
                      setReportPagination((previous) => ({
                        ...previous,
                        page,
                      }))
                    }
                  />
                )}
            </>
          )}

          {/* FOUND ITEMS TAB */}

          {activeTab === "found" && (
            <>
              <div className="space-y-3 border-b border-slate-200 p-3 sm:p-3">
                <SectionHeader
                  title="Found Inventory"
                  description={`${foundPagination.total} found items registered`}
                  action={
                    <Button
                      size="sm"
                      onClick={() => setShowFoundForm(true)}
                    >
                      <PackagePlus size={15} />
                      Register Item
                    </Button>
                  }
                />

                <form
                  onSubmit={handleFoundSearch}
                  className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
                >
                  <div className="relative">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      value={foundSearch}
                      onChange={(event) =>
                        setFoundSearch(event.target.value)
                      }
                      placeholder="Search found items..."
                      className="w-full rounded border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div className="relative">
                    <Filter
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <select
                      value={foundStatus}
                      onChange={handleFoundStatusChange}
                      className="w-full rounded border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      {FOUND_STATUSES.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button type="submit" disabled={loadingFound}>
                    <Search size={16} />
                    Search
                  </Button>
                </form>
              </div>

              {foundError ? (
                <div className="p-3">
                  <ErrorMessage
                    message={foundError}
                    onRetry={loadFoundItems}
                  />
                </div>
              ) : loadingFound ? (
                <Loading message="Loading found inventory..." />
              ) : (
                <FoundItemsTable
                  items={foundItems}
                  onView={setSelectedFoundItem}
                  onFindMatches={openFoundMatches}
                />
              )}

              {!loadingFound &&
                !foundError &&
                foundPagination.total > 0 && (
                  <Pagination
                    page={foundPagination.page}
                    totalPages={foundPagination.totalPages}
                    total={foundPagination.total}
                    limit={foundPagination.limit}
                    onPageChange={(page) =>
                      setFoundPagination((previous) => ({
                        ...previous,
                        page,
                      }))
                    }
                  />
                )}
            </>
          )}
        </section>

        {/* OPERATIONAL NOTE */}

        <div className="flex items-start gap-2.5 rounded border border-blue-200 bg-blue-50 p-3">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-blue-700"
          />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Handling Reminder
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-800">
              Verify ownership before handing over an item. Use the
              handover workflow to record the receiver and identification
              details.
            </p>
          </div>
        </div>
      </div>

      {/* STATUS CHANGE CONFIRMATION MODAL */}

      {pendingStatusChange && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/40 p-0 sm:items-center sm:p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingId) {
              setPendingStatusChange(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-change-title"
            className="my-auto w-full max-w-md rounded border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 id="status-change-title" className="text-lg font-semibold text-slate-900">
                Confirm Status Change
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the new status before updating this report.
              </p>
            </div>

            <div className="space-y-3 p-4">
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Lost Item
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {pendingStatusChange.report?.itemName || "Unnamed Item"}
                </p>
              </div>
              <div className="rounded border border-slate-200 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  New Status
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-slate-800">
                  {pendingStatusChange.status.replace(/_/g, " ")}
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                Are you sure you want to update this lost-item report?
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                disabled={Boolean(updatingId)}
                onClick={() => setPendingStatusChange(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={Boolean(updatingId)}
                loading={Boolean(updatingId)}
                onClick={confirmStatusChange}
              >
                Confirm Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* FOUND ITEM FORM MODAL */}

      {showFoundForm && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-slate-950/40 p-0 sm:items-center sm:p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowFoundForm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="found-form-title"
            className="my-auto max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-slate-200 bg-white sm:my-auto"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2.5 border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <h2
                  id="found-form-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Register Found Item
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add a found item to the hotel inventory.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowFoundForm(false)}
                aria-label="Close form"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 sm:p-3">
              <LostFoundForm
                mode="found"
                onSubmit={handleCreateFoundItem}
                onCancel={() => setShowFoundForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* REPORT DETAILS MODAL */}

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* FOUND ITEM DETAILS MODAL */}

      {selectedFoundItem && (
        <ReportDetailsModal
          report={{
            ...selectedFoundItem,
            lostAt: selectedFoundItem.foundAt,
            lostArea: selectedFoundItem.foundArea,
            lostLocationNote: selectedFoundItem.foundLocationNote,
            contactName: selectedFoundItem.foundBy?.name,
            contactPhone: selectedFoundItem.foundBy?.phone,
          }}
          onClose={() => setSelectedFoundItem(null)}
        />
      )}

      {/* MATCH MODAL */}

      {matchTarget && (
        <MatchModal
          report={matchTarget.item}
          matches={matches}
          loading={loadingMatches}
          error={matchError}
          matchingId={matchingId}
          onClose={() => {
            setMatchTarget(null);
            setMatches([]);
            setMatchError("");
          }}
          onMatch={handleMatchItem}
        />
      )}
    </div>
  );
}

// =====================================================
// PAGE ICON
// =====================================================

function PackageSearchIcon(props) {
  return <Package {...props} />;
}
