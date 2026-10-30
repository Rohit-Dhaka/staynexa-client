
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileClock,
  Filter,
  History,
  Package,
  RefreshCw,
  Search,
  UserRound,
  Wrench,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  MapPin,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import maintenanceService from "../services/maintenanceService";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "reported", label: "Reported" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_parts", label: "Waiting for Parts" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  reported: "border-blue-200 bg-black text-blue-700",
  assigned: "border-indigo-200 bg-black text-indigo-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  waiting_for_parts: "border-orange-200 bg-orange-50 text-orange-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const PRIORITY_STYLES = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-blue-200 bg-black text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const inputClass =
  "w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500";

function formatLabel(value) {
  if (!value) return "Not specified";

  return String(value)
    .replaceAll("_", "")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load maintenance history. Please try again."
  );
}

function normalizeList(response, keys = []) {
  if (Array.isArray(response)) return response;

  const candidates = [response, response?.data, response?.data?.data, response?.result];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;

    for (const key of keys) {
      if (Array.isArray(candidate?.[key])) return candidate[key];
    }
  }

  return [];
}

function normalizeHistory(response) {
  const normalized = normalizeList(response, [
    "history",
    "records",
    "items",
    "maintenanceHistory",
    "results",
    "repairHistory",
  ]);

  if (normalized.length) return normalized;

  const payload =
    response?.data?.data ??
    response?.data ??
    response?.result ??
    response;

  if (!payload || typeof payload !== "object") return [];

  const equipmentItem =
    payload.equipment || payload.equipmentDetails || payload.asset || null;
  const records = [];
  const currentIssue = payload.currentIssue;

  if (
    currentIssue &&
    (currentIssue.issueTitle ||
      currentIssue.issueDescription ||
      currentIssue.title ||
      currentIssue.description)
  ) {
    records.push({
      ...currentIssue,
      _id: currentIssue._id || `current-${equipmentItem?._id || "equipment"}`,
      status:
        currentIssue.status ||
        currentIssue.maintenanceStatus ||
        equipmentItem?.maintenanceStatus ||
        "reported",
      equipment: currentIssue.equipment || equipmentItem,
      isCurrentIssue: true,
    });
  }

  if (Array.isArray(payload.repairHistory)) {
    records.push(
      ...payload.repairHistory.map((record) => ({
        ...record,
        equipment: record.equipment || equipmentItem,
      }))
    );
  }

  return records;
}

function normalizeEquipmentList(response) {
  return normalizeList(response, ["equipment", "items", "records", "results", "data"]);
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2.5 py-1.5 text-xs font-semibold ${ STATUS_STYLES[normalized] || "border-slate-200 bg-slate-50 text-slate-600" }`}
    >
      {formatLabel(normalized)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const normalized = String(priority || "medium").toLowerCase();

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2.5 py-1.5 text-xs font-semibold ${ PRIORITY_STYLES[normalized] || PRIORITY_STYLES.medium }`}
    >
      {formatLabel(normalized)}
    </span>
  );
}

function SummaryCard({ title, value, description, icon: Icon, iconClass }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </article>
  );
}

function EmptyState({ equipmentId, onReset }) {
  return (
    <div className="flex flex-col items-center px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-100 text-slate-500">
        <FileClock size={25} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        No Maintenance History Found
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {equipmentId
          ? "No maintenance records are available for this equipment yet."
          : "No maintenance records match your current search and filters."}
      </p>

      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
      >
        Reset Filters
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-16 rounded bg-slate-100"
        />
      ))}
    </div>
  );
}

export default function MaintenanceHistory() {
  const [searchParams] = useSearchParams();

  const equipmentId = searchParams.get("equipmentId") || "";
  const initialSearch = searchParams.get("search") || "";

  const [history, setHistory] = useState([]);
  const [equipment, setEquipment] = useState(null);

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (equipmentId) {
        const [historyResult, equipmentResult] = await Promise.all([
          maintenanceService.getMaintenanceHistory(equipmentId),
          maintenanceService.getEquipmentById(equipmentId),
        ]);

        setHistory(normalizeHistory(historyResult));

        setEquipment(
          equipmentResult?.equipment ||
            equipmentResult?.item ||
            equipmentResult ||
            null
        );
      } else {
       
        if (typeof maintenanceService.getAllMaintenanceHistory === "function") {
          const result = await maintenanceService.getAllMaintenanceHistory();
          setHistory(normalizeHistory(result));
          setEquipment(null);
        } else {
         
          const equipmentList = [];
        const pageSize = 100;
        const maxPages = 100;

        for (let equipmentPage = 1; equipmentPage <= maxPages; equipmentPage += 1) {
          const equipmentResult = await maintenanceService.getEquipmentList({
            page: equipmentPage,
            limit: pageSize,
          });
          const pageItems = normalizeEquipmentList(equipmentResult);

          equipmentList.push(...pageItems);

          if (pageItems.length < pageSize) break;
        }

        const equipmentWithIds = equipmentList.filter((item) => item?._id || item?.id);

        const historyResults = await Promise.allSettled(
          equipmentWithIds.map((item) =>
            maintenanceService.getMaintenanceHistory(item._id || item.id)
          )
        );

        const combinedHistory = [];

        historyResults.forEach((result, index) => {
          const item = equipmentWithIds[index];

        
          const currentStatus = String(
            item.maintenanceStatus || item.currentIssue?.status || ""
          ).toLowerCase();

          const currentIssueTitle =
            item.issueTitle || item.currentIssue?.issueTitle || "";

          const currentIssueDescription =
            item.issueDescription || item.currentIssue?.issueDescription || "";

          if (
            currentIssueTitle &&
            currentIssueDescription &&
            !["completed", "resolved", "cancelled"].includes(currentStatus)
          ) {
            combinedHistory.push({
              _id: `current-${item._id || item.id}`,
              issueTitle: currentIssueTitle,
              issueDescription: currentIssueDescription,
              priority: item.priority || item.currentIssue?.priority || "medium",
              status: currentStatus || "reported",
              reportedAt:
                item.reportedAt ||
                item.currentIssue?.reportedAt ||
                item.updatedAt ||
                item.createdAt,
              technicianName:
                item.assignedTechnicianName ||
                item.assignedTechnician?.name ||
                "",
              repairCost: 0,
              equipment: item,
              isCurrentIssue: true,
            });
          }

          if (result.status !== "fulfilled") return;

          const records = normalizeHistory(result.value);
          records.forEach((record) => {
            combinedHistory.push({
              ...record,
              equipment:
                record.equipment ||
                record.equipmentId ||
                item,
            });
          });
        });

        
        combinedHistory.sort((a, b) => {
          const dateA = new Date(
            a.reportedAt || a.createdAt || a.startedAt || 0
          ).getTime();
          const dateB = new Date(
            b.reportedAt || b.createdAt || b.startedAt || 0
          ).getTime();
          return dateB - dateA;
        });

          setHistory(combinedHistory);
          setEquipment(null);
        }
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [equipmentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();

    return history.filter((record) => {
      const item = record.equipment || record.equipmentId || equipment || {};

      const title = String(
        record.issueTitle ||
          record.title ||
          record.description ||
          record.issueDescription ||
          ""
      ).toLowerCase();

      const code = String(item.equipmentCode || "").toLowerCase();
      const name = String(
        item.name || item.equipmentName || ""
      ).toLowerCase();

      const technician = String(
        record.technicianName ||
          record.assignedTechnician?.name ||
          record.technician?.name ||
          record.assignedTo?.name ||
          ""
      ).toLowerCase();

      const status = String(
        record.status || record.maintenanceStatus || ""
      ).toLowerCase();

      const priority = String(record.priority || "").toLowerCase();

      const matchesSearch =
        !term ||
        title.includes(term) ||
        code.includes(term) ||
        name.includes(term) ||
        technician.includes(term);

      const matchesStatus =
        statusFilter === "all" || status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [
    history,
    search,
    statusFilter,
    priorityFilter,
    equipment,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const summary = useMemo(() => {
    const completed = history.filter((record) =>
      ["completed", "resolved"].includes(
        String(record.status || record.maintenanceStatus || "").toLowerCase()
      )
    );

    const active = history.filter((record) =>
      ["reported", "assigned", "in_progress", "waiting_for_parts"].includes(
        String(record.status || record.maintenanceStatus || "").toLowerCase()
      )
    );

    const totalCost = history.reduce((total, record) => {
      return (
        total +
        (Number(
          record.totalCost ??
            record.repairCost ??
            record.actualCost ??
            record.cost ??
            0
        ) || 0)
      );
    }, 0);

    return {
      total: history.length,
      completed: completed.length,
      active: active.length,
      totalCost,
    };
  }, [history]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[1600px]">
        
        <header className="mb-7">
       

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
                <History size={16} />
                Hotel Operations
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Maintenance History
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review past issues, technician activity, repair costs, and
                maintenance completion records.
              </p>

              {equipment && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                    <Package size={15} />
                    {equipment.name ||
                      equipment.equipmentName ||
                      "Equipment"}
                  </span>

                  {equipment.equipmentCode && (
                    <span className="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                      {equipment.equipmentCode}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 self-start rounded border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "" : ""}
              />
              Refresh History
            </button>
          </div>
        </header>

        
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Records"
            value={loading ? "—" : summary.total}
            description="All maintenance records"
            icon={FileClock}
            iconClass="bg-blue-100 text-blue-700"
          />

          <SummaryCard
            title="Completed Repairs"
            value={loading ? "—" : summary.completed}
            description="Resolved maintenance issues"
            icon={CheckCircle2}
            iconClass="bg-emerald-50 text-emerald-700"
          />

          <SummaryCard
            title="Active Maintenance"
            value={loading ? "—" : summary.active}
            description="Issues requiring follow-up"
            icon={Clock3}
            iconClass="bg-amber-50 text-amber-700"
          />

          <SummaryCard
            title="Total Repair Cost"
            value={loading ? "—" : formatCurrency(summary.totalCost)}
            description="Recorded repair expenses"
            icon={IndianRupee}
            iconClass="bg-violet-50 text-violet-700"
          />
        </section>

        
        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Maintenance Records
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredHistory.length} matching records
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700"
              >
                <Filter size={15} />
                Reset Filters
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search issue, equipment, technician..."
                  aria-label="Search maintenance history"
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by maintenance status"
                className={inputClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                aria-label="Filter by priority"
                className={inputClass}
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {error ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-red-50 text-red-600">
                <AlertTriangle size={23} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Unable to Load History
              </h3>

              <p className="mt-2 max-w-lg text-sm text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={loadHistory}
                className="mt-4 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <LoadingState />
          ) : filteredHistory.length === 0 ? (
            <EmptyState
              equipmentId={equipmentId}
              onReset={resetFilters}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {[
                        "Maintenance Issue",
                        "Equipment",
                        "Reported Date",
                        "Technician",
                        "Priority",
                        "Status",
                        "Repair Cost",
                        "Completed Date",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {paginatedHistory.map((record, index) => {
                      const item =
                        record.equipment ||
                        record.equipmentId ||
                        equipment ||
                        {};

                      const id =
                        record._id ||
                        record.id ||
                        `${item._id || "record"}-${index}`;

                      const status =
                        record.status ||
                        record.maintenanceStatus ||
                        "reported";

                      const issueTitle =
                        record.issueTitle ||
                        record.title ||
                        record.issueDescription ||
                        record.description ||
                        "Maintenance Record";

                      const technician =
                        record.technicianName ||
                        record.assignedTechnician?.name ||
                        record.technician?.name ||
                        record.assignedTo?.name ||
                        "Not assigned";

                      const cost =
                        record.totalCost ??
                        record.repairCost ??
                        record.actualCost ??
                        record.cost ??
                        0;

                      return (
                        <tr
                          key={id}
                          className=""
                        >
                          <td className="max-w-[260px] px-5 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-500">
                                <Wrench size={17} />
                              </div>

                              <div className="min-w-0">
                                <p className="break-words text-sm font-semibold text-slate-800">
                                  {issueTitle}
                                </p>

                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                  {record.issueDescription ||
                                    record.description ||
                                    "No additional description"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="whitespace-nowrap text-sm font-medium text-slate-800">
                              {item.name ||
                                item.equipmentName ||
                                "Unknown Equipment"}
                            </p>

                            <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin size={12} />
                              {item.location ||
                                item.room?.roomNumber ||
                                item.roomNumber ||
                                "No location"}
                            </p>

                            {item.equipmentCode && (
                              <p className="mt-1 text-xs text-slate-400">
                                {item.equipmentCode}
                              </p>
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              record.reportedDate ||
                                record.createdAt ||
                                record.reportedAt
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                              <UserRound
                                size={15}
                                className="shrink-0 text-slate-400"
                              />
                              {technician}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <PriorityBadge priority={record.priority} />
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge status={status} />
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-700">
                            {formatCurrency(cost)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              record.completedAt ||
                                record.completionDate ||
                                record.resolvedAt
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              
              <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Showing{""}
                  <span className="font-semibold text-slate-700">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                  </span>
                  {""}to{""}
                  <span className="font-semibold text-slate-700">
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredHistory.length
                    )}
                  </span>
                  {""}of{""}
                  <span className="font-semibold text-slate-700">
                    {filteredHistory.length}
                  </span>
                  {""}records
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                    className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={17} />
                  </button>

                  <span className="min-w-24 text-center text-sm font-medium text-slate-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                    className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-slate-400">
          Repair costs and completion dates are shown from the records returned
          by the maintenance API. Missing values appear as zero or a dash.
        </p>
      </div>
    </main>
  );
}
