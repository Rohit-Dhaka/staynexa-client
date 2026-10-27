
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Package,
  AlertTriangle,
  Wrench,
  Eye,
  Pencil,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Filter,
  CircleAlert,
} from "lucide-react";

import maintenanceService from "../services/maintenanceService";
import MaintenanceStats from "../components/MaintenanceStats";
import MaintenanceEquipmentForm from "../components/MaintenanceEquipmentForm";
import MaintenanceIssueForm from "../components/MaintenanceIssueForm";
import MaintenanceDetails from "../components/MaintenanceDetails";

const INITIAL_FILTERS = {
  search: "",
  category: "",
  status: "",
  priority: "",
};

const PAGE_SIZE = 10;

const CATEGORY_OPTIONS = [
  { value: "ac", label: "Air Conditioning" },
  { value: "tv", label: "Television" },
  { value: "refrigerator", label: "Refrigerator" },
  { value: "geyser", label: "Water Heater" },
  { value: "lift", label: "Elevator / Lift" },
  { value: "electrical", label: "Electrical Equipment" },
  { value: "plumbing", label: "Plumbing Equipment" },
  { value: "generator", label: "Generator" },
  { value: "water_pump", label: "Water Pump" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "operational", label: "Operational" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "out_of_order", label: "Out of Order" },
  { value: "retired", label: "Retired" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const inputClass =
  "w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function unwrapList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.equipment)) return result.equipment;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.records)) return result.records;
  if (Array.isArray(result?.results)) return result.results;
  if (Array.isArray(result?.data)) return result.data;

  return [];
}

function normalizeStats(result, equipment = []) {
  const source =
    result?.stats ||
    result?.summary ||
    result?.dashboard ||
    result ||
    {};

  const countByStatus = (status) =>
    equipment.filter(
      (item) =>
        String(item.status || "").toLowerCase() === status
    ).length;

  return {
    totalEquipment:
      source.totalEquipment ??
      source.total ??
      source.totalItems ??
      equipment.length,

    activeIssues:
      source.activeIssues ??
      source.openIssues ??
      source.activeMaintenanceIssues ??
      0,

    underMaintenance:
      source.underMaintenance ??
      source.underMaintenanceCount ??
      countByStatus("under_maintenance"),

    outOfOrder:
      source.outOfOrder ??
      source.outOfOrderCount ??
      countByStatus("out_of_order"),

    ...(source.trends ? { trends: source.trends } : {}),
  };
}

function formatLabel(value) {
  return String(value || "Not specified")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getStatusClass(status) {
  const colors = {
    operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
    under_maintenance: "border-amber-200 bg-amber-50 text-amber-700",
    out_of_order: "border-red-200 bg-red-50 text-red-700",
    retired: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    colors[String(status || "").toLowerCase()] ||
    "border-slate-200 bg-slate-50 text-slate-600"
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2.5 py-1.5 text-xs font-semibold ${getStatusClass(status)}`}
    >
      {formatLabel(status)}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const colors = {
    low: "border-slate-200 bg-slate-50 text-slate-600",
    medium: "border-blue-200 bg-blue-100 text-blue-700",
    high: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-red-200 bg-red-50 text-red-700",
  };

  const normalized = String(priority || "medium").toLowerCase();

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded border px-2.5 py-1.5 text-xs font-semibold ${
        colors[normalized] || colors.medium
      }`}
    >
      {formatLabel(normalized)}
    </span>
  );
}

function EmptyState({ onAddEquipment, hasFilters }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded bg-slate-100 text-slate-500">
        {hasFilters ? (
          <Search size={25} />
        ) : (
          <Package size={25} />
        )}
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {hasFilters ? "No Matching Equipment" : "No Equipment Found"}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "Try changing your search or filters to find equipment."
          : "Add your first equipment item to start tracking maintenance."}
      </p>

      {!hasFilters && onAddEquipment && (
        <button
          type="button"
          onClick={onAddEquipment}
          className="mt-5 inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
        >
          <Plus size={17} />
          Add Equipment
        </button>
      )}
    </div>
  );
}

function EquipmentTable({
  equipment,
  loading,
  onView,
  onEdit,
  onReportIssue,
}) {
  if (loading) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!equipment.length) {
    return null;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {[
              "Equipment",
              "Category",
              "Location",
              "Status",
              "Priority",
              "Repair Cost",
              "Actions",
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
          {equipment.map((item, index) => {
            const id = item._id || item.id || index;

            const name =
              item.name || item.equipmentName || "Unnamed Equipment";

            const location =
              item.location ||
              item.room?.roomNumber ||
              item.roomNumber ||
              "Not assigned";

            const repairCost =
              item.totalRepairCost ??
              item.repairCost ??
              0;

            return (
              <tr
                key={id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="flex max-w-[260px] items-center gap-3 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600">
                      <Package size={19} />
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {name}
                      </span>

                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {item.equipmentCode || "No equipment code"}
                      </span>
                    </span>
                  </button>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                  {formatLabel(item.category)}
                </td>

                <td className="px-5 py-4">
                  <span className="flex max-w-[180px] items-center gap-1.5 text-sm text-slate-600">
                    <MapPin
                      size={14}
                      className="shrink-0 text-slate-400"
                    />
                    <span className="truncate">{location}</span>
                  </span>
                </td>

                <td className="px-5 py-4">
                  <StatusBadge status={item.status} />
                </td>

                <td className="px-5 py-4">
                  <PriorityBadge priority={item.priority} />
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(Number(repairCost) || 0)}
                </td>

                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      title="View Details"
                      aria-label={`View ${name}`}
                      className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Edit Equipment"
                      aria-label={`Edit ${name}`}
                      className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onReportIssue(item)}
                      title="Report Issue"
                      aria-label={`Report issue for ${name}`}
                      className="flex h-9 w-9 items-center justify-center rounded border border-amber-200 text-amber-700 transition-colors hover:bg-amber-50"
                    >
                      <AlertTriangle size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MaintenanceDashboard() {
  const [equipment, setEquipment] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalEquipment: 0,
    activeIssues: 0,
    underMaintenance: 0,
    outOfOrder: 0,
  });

  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [page, setPage] = useState(1);

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {};

      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search.trim()) params.search = filters.search.trim();

      const result = await maintenanceService.getEquipmentList(params);
      const list = unwrapList(result);

      setEquipment(list);

      setDashboardStats((current) => ({
        ...current,
        totalEquipment:
          result?.total ??
          result?.pagination?.total ??
          result?.totalEquipment ??
          list.length,
        underMaintenance:
          result?.underMaintenance ??
          list.filter((item) => item.status === "under_maintenance").length,
        outOfOrder:
          result?.outOfOrder ??
          list.filter((item) => item.status === "out_of_order").length,
      }));
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Unable to load equipment. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadDashboard = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");

    try {
      const result = await maintenanceService.getDashboard();
      setDashboardStats((current) => ({
        ...current,
        ...normalizeStats(result, equipment),
      }));
    } catch (requestError) {
      setStatsError(
        getErrorMessage(
          requestError,
          "Unable to load maintenance statistics."
        )
      );
    } finally {
      setStatsLoading(false);
    }
  }, [equipment]);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeout = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  const filteredEquipment = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return equipment.filter((item) => {
      const name = String(
        item.name || item.equipmentName || ""
      ).toLowerCase();

      const code = String(item.equipmentCode || "").toLowerCase();

      const location = String(
        item.location || item.room?.roomNumber || item.roomNumber || ""
      ).toLowerCase();

      const matchesSearch =
        !searchTerm ||
        name.includes(searchTerm) ||
        code.includes(searchTerm) ||
        location.includes(searchTerm);

      const matchesCategory =
        !filters.category || item.category === filters.category;

      const matchesStatus =
        !filters.status || item.status === filters.status;

      const matchesPriority =
        !filters.priority || item.priority === filters.priority;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesPriority
      );
    });
  }, [equipment, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEquipment.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedEquipment = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEquipment.slice(start, start + PAGE_SIZE);
  }, [filteredEquipment, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [
    filters.search,
    filters.category,
    filters.status,
    filters.priority,
  ]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
  };

  const openCreateForm = () => {
    setSelectedEquipment(null);
    setFormOpen(true);
  };

  const openEditForm = (item) => {
    setSelectedEquipment(item);
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const openIssueForm = (item) => {
    setSelectedEquipment(item);
    setDetailsOpen(false);
    setIssueFormOpen(true);
  };

  const openDetails = (item) => {
    setSelectedEquipment(item);
    setDetailsOpen(true);
  };

  const handleSaveEquipment = async (payload, originalEquipment) => {
    setSaving(true);

    try {
      if (originalEquipment?._id) {
        await maintenanceService.updateEquipment(
          originalEquipment._id,
          payload
        );
        setSuccessMessage("Equipment updated successfully.");
      } else {
        await maintenanceService.createEquipment(payload);
        setSuccessMessage("Equipment created successfully.");
      }

      setFormOpen(false);
      setSelectedEquipment(null);

      await Promise.all([loadEquipment(), loadDashboard()]);
    } catch (requestError) {
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const handleReportIssue = async (payload, item) => {
    if (!item?._id) {
      throw new Error("Please select equipment before reporting an issue.");
    }

    setSaving(true);

    try {
      await maintenanceService.reportIssue(item._id, payload);

      setIssueFormOpen(false);
      setSelectedEquipment(null);
      setSuccessMessage("Maintenance issue reported successfully.");

      await Promise.all([loadEquipment(), loadDashboard()]);
    } catch (requestError) {
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    loadEquipment();
    loadDashboard();
  };

  return (
    <main className="min-h-screen ">
      <div className="mx-auto max-w-[1600px]">
        {/* Page Header */}
        <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700">
              <Wrench size={16} />
              Hotel Operations
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Maintenance Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Monitor equipment health, manage maintenance issues, and track
              repairs across your hotel.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={loading || statsLoading}
              className={buttonClass}
            >
              <RefreshCw
                size={16}
                className={
                  loading || statsLoading ? "animate-spin" : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
            >
              <Plus size={17} />
              Add Equipment
            </button>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss notification"
              className="rounded p-1 hover:bg-emerald-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Dashboard Statistics */}
        <div className="mb-8">
          <MaintenanceStats
            stats={dashboardStats}
            loading={statsLoading}
            error={statsError}
            onRetry={loadDashboard}
          />
        </div>

        {/* Equipment Inventory */}
        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Equipment Inventory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Manage equipment and track its current condition.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                  <Package size={15} />
                  {filteredEquipment.length} equipment items
                </span>

                <button
                  type="button"
                  onClick={resetFilters}
                  className={buttonClass}
                >
                  <Filter size={15} />
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search equipment..."
                  aria-label="Search equipment"
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                aria-label="Filter by category"
                className={inputClass}
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option
                    key={category.value}
                    value={category.value}
                  >
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                aria-label="Filter by status"
                className={inputClass}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>

              <select
                name="priority"
                value={filters.priority}
                onChange={handleFilterChange}
                aria-label="Filter by priority"
                className={inputClass}
              >
                <option value="">All Priorities</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option
                    key={priority.value}
                    value={priority.value}
                  >
                    {priority.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Equipment Table */}
          {error ? (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-red-50 text-red-600">
                <CircleAlert size={23} />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                Unable to Load Equipment
              </h3>

              <p className="mt-2 max-w-lg text-sm text-slate-500">
                {error}
              </p>

              <button
                type="button"
                onClick={loadEquipment}
                className="mt-4 inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw size={15} />
                Try Again
              </button>
            </div>
          ) : !loading && filteredEquipment.length === 0 ? (
            <EmptyState
              onAddEquipment={openCreateForm}
              hasFilters={Boolean(
                filters.search ||
                  filters.category ||
                  filters.status ||
                  filters.priority
              )}
            />
          ) : (
            <EquipmentTable
              equipment={paginatedEquipment}
              loading={loading}
              onView={openDetails}
              onEdit={openEditForm}
              onReportIssue={openIssueForm}
            />
          )}

          {/* Pagination */}
          {!error && filteredEquipment.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>
                {" "}to{" "}
                <span className="font-semibold text-slate-700">
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredEquipment.length
                  )}
                </span>
                {" "}of{" "}
                <span className="font-semibold text-slate-700">
                  {filteredEquipment.length}
                </span>
                {" "}items
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                  className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={17} />
                </button>

                <span className="min-w-20 text-center text-sm font-medium text-slate-700">
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
                  className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Inline Equipment Form */}
        {formOpen && (
          <section
            id="equipment-form-section"
            className="mt-6 scroll-mt-6"
            aria-label="Equipment form"
          >
            <MaintenanceEquipmentForm
              open={formOpen}
              equipment={selectedEquipment}
              rooms={[]}
              saving={saving}
              onClose={() => {
                setFormOpen(false);
                setSelectedEquipment(null);
              }}
              onSubmit={handleSaveEquipment}
            />
          </section>
        )}

        {/* Issue Form */}
        <MaintenanceIssueForm
          open={issueFormOpen}
          equipment={selectedEquipment}
          saving={saving}
          onClose={() => {
            setIssueFormOpen(false);
            setSelectedEquipment(null);
          }}
          onSubmit={handleReportIssue}
        />

        {/* Equipment Details */}
        <MaintenanceDetails
          open={detailsOpen}
          equipment={selectedEquipment}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedEquipment(null);
          }}
          onEdit={openEditForm}
          onReportIssue={openIssueForm}
          onAssignTechnician={(item) => {
            setSuccessMessage(
              `Technician assignment for ${item.name || item.equipmentName} can be connected here.`
            );
          }}
          onUpdateStatus={(item) => {
            setSuccessMessage(
              `Status update for ${item.name || item.equipmentName} can be connected here.`
            );
          }}
          onAddRepair={(item) => {
            setSuccessMessage(
              `Repair record for ${item.name || item.equipmentName} can be connected here.`
            );
          }}
          onComplete={(item) => {
            setSuccessMessage(
              `Maintenance completion for ${item.name || item.equipmentName} can be connected here.`
            );
          }}
        />
      </div>
    </main>
  );
}
