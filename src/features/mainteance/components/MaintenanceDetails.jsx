
import { useEffect, useState } from "react";
import {
  X,
  Wrench,
  UserRound,
  CalendarDays,
  CircleDollarSign,
  ShieldCheck,
  Clock,
  MapPin,
  Package,
  AlertTriangle,
  History,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import maintenanceService from "../services/maintenanceService";

const formatDate = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatLabel = (value) =>
  String(value || "Not available")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded border border-slate-200 bg-white p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value ?? "Not available"}
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon size={18} className="text-slate-500" />
        {title}
      </h3>

      {action}
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const colors = {
    operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    under_maintenance: "border-amber-200 bg-amber-50 text-amber-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    waiting_for_parts: "border-orange-200 bg-orange-50 text-orange-700",
    out_of_order: "border-red-200 bg-red-50 text-red-700",
    critical: "border-red-200 bg-red-50 text-red-700",
    reported: "border-blue-200 bg-black text-blue-700",
    assigned: "border-violet-200 bg-violet-50 text-violet-700",
    retired: "border-slate-200 bg-slate-100 text-slate-600",
    cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded border px-3 py-1.5 text-xs font-semibold ${
        colors[normalized] ||
        "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {formatLabel(status)}
    </span>
  );
}

export default function MaintenanceDetails({
  equipment,
  open = true,
  onClose,
  onEdit,
  onReportIssue,
  onAssignTechnician,
  onUpdateStatus,
  onAddRepair,
  onComplete,
}) {
  const [details, setDetails] = useState(equipment || null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDetails(equipment || null);
  }, [equipment]);

  useEffect(() => {
    if (!open || !equipment?._id) return;

    let active = true;

    const loadDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const [equipmentResult, historyResult] = await Promise.allSettled([
          maintenanceService.getEquipmentById(equipment._id),
          maintenanceService.getMaintenanceHistory(equipment._id),
        ]);

        if (!active) return;

        if (equipmentResult.status === "fulfilled") {
          const result = equipmentResult.value;
          const item = result?.equipment || result?.data || result;

          if (item && typeof item === "object") {
            setDetails(item);
          }
        } else {
          setError(
            equipmentResult.reason?.response?.data?.message ||
              "Unable to load the latest equipment details."
          );
        }

        if (historyResult.status === "fulfilled") {
          const result = historyResult.value;

          const records = Array.isArray(result)
            ? result
            : result?.history || result?.records || result?.data || [];

          setHistory(Array.isArray(records) ? records : []);
        }
      } catch {
        if (active) {
          setError("Unable to load equipment information.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDetails();

    return () => {
      active = false;
    };
  }, [open, equipment?._id]);

  if (!open || !equipment) return null;

  const item = details || equipment;

  const warranty = item.warranty || {};
  const repairs = Array.isArray(item.repairHistory)
    ? item.repairHistory
    : Array.isArray(item.repairs)
      ? item.repairs
      : [];

  const technicians = Array.isArray(item.technicians)
    ? item.technicians
    : item.assignedTechnician
      ? [item.assignedTechnician]
      : item.technician
        ? [item.technician]
        : [];

  const repairCost =
    item.totalRepairCost ??
    repairs.reduce(
      (total, repair) =>
        total +
        (Number(repair.totalCost) ||
          Number(repair.cost) ||
          Number(repair.repairCost) ||
          0),
      0
    );

  const warrantyEnd = warranty.endDate || item.warrantyEndDate;
  const warrantyActive =
    warrantyEnd &&
    new Date(warrantyEnd).getTime() >= Date.now();

  const handleRefresh = async () => {
    if (!item._id) return;

    setLoading(true);
    setError("");

    try {
      const result = await maintenanceService.getEquipmentById(item._id);
      const refreshed = result?.equipment || result?.data || result;

      if (refreshed && typeof refreshed === "object") {
        setDetails(refreshed);
      }

      const historyResult =
        await maintenanceService.getMaintenanceHistory(item._id);

      const records = Array.isArray(historyResult)
        ? historyResult
        : historyResult?.history || historyResult?.records || [];

      setHistory(Array.isArray(records) ? records : []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          "Unable to refresh equipment details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-details-title"
        className="my-auto w-full max-w-5xl overflow-hidden rounded border border-slate-200 bg-white"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-black text-blue-700">
              <Package size={23} />
            </div>

            <div className="min-w-0">
              <h2
                id="maintenance-details-title"
                className="truncate text-lg font-bold text-slate-900 sm:text-xl"
              >
                Equipment Details
              </h2>

              <p className="mt-1 truncate text-sm text-slate-500">
                {item.equipmentCode || "Equipment"} ·{" "}
                {item.name || item.equipmentName || "Unnamed Equipment"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close equipment details"
              className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-5 py-6 sm:px-7">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {loading && (
            <div className="mb-5 flex items-center gap-2 rounded border border-blue-200 bg-black p-3 text-sm text-blue-700">
              <LoaderCircle size={17} className="animate-spin" />
              Loading equipment information...
            </div>
          )}

          {/* Equipment Overview */}
          <div className="mb-7 rounded border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Equipment Name
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {item.name || item.equipmentName || "Unnamed Equipment"}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.brand || "Unknown Brand"}
                  {item.modelNumber ? ` · ${item.modelNumber}` : ""}
                </p>
              </div>

              <StatusBadge status={item.status} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatLabel(item.category)}
              </span>

              <span className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                {formatLabel(item.priority || "medium")} Priority
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-8 flex flex-wrap gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Edit Equipment
              </button>
            )}

            {onReportIssue && (
              <button
                type="button"
                onClick={() => onReportIssue(item)}
                className="inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
              >
                <AlertTriangle size={16} />
                Report Issue
              </button>
            )}

            {onAssignTechnician && (
              <button
                type="button"
                onClick={() => onAssignTechnician(item)}
                className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <UserRound size={16} />
                Assign Technician
              </button>
            )}

            {onUpdateStatus && (
              <button
                type="button"
                onClick={() => onUpdateStatus(item)}
                className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw size={16} />
                Update Status
              </button>
            )}

            {onAddRepair && (
              <button
                type="button"
                onClick={() => onAddRepair(item)}
                className="inline-flex items-center gap-2 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Wrench size={16} />
                Add Repair
              </button>
            )}

            {onComplete && (
              <button
                type="button"
                onClick={() => onComplete(item)}
                className="inline-flex items-center gap-2 rounded border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
              >
                <CheckCircle2 size={16} />
                Complete Maintenance
              </button>
            )}
          </div>

          {/* Equipment Information */}
          <section className="mb-8">
            <SectionTitle icon={Package} title="Equipment Information" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem
                icon={Package}
                label="Equipment Code"
                value={item.equipmentCode || "Not assigned"}
              />

              <DetailItem
                icon={Wrench}
                label="Category"
                value={formatLabel(item.category)}
              />

              <DetailItem
                icon={MapPin}
                label="Location"
                value={
                  item.location ||
                  item.room?.roomNumber ||
                  item.roomNumber ||
                  "Not assigned"
                }
              />

              <DetailItem
                icon={Package}
                label="Brand"
                value={item.brand || "Not specified"}
              />

              <DetailItem
                icon={Package}
                label="Model Number"
                value={item.modelNumber || "Not specified"}
              />

              <DetailItem
                icon={Package}
                label="Serial Number"
                value={item.serialNumber || "Not specified"}
              />

              <DetailItem
                icon={CalendarDays}
                label="Purchase Date"
                value={formatDate(item.purchaseDate)}
              />

              <DetailItem
                icon={CircleDollarSign}
                label="Purchase Cost"
                value={formatCurrency(item.purchaseCost)}
              />

              <DetailItem
                icon={CircleDollarSign}
                label="Estimated Replacement Cost"
                value={formatCurrency(item.estimatedReplacementCost)}
              />
            </div>

            {item.notes && (
              <div className="mt-3 rounded border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Equipment Notes
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {item.notes}
                </p>
              </div>
            )}
          </section>

          {/* Technician Information */}
          <section className="mb-8">
            <SectionTitle icon={UserRound} title="Assigned Technicians" />

            {technicians.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {technicians.map((technician, index) => {
                  const technicianName =
                    typeof technician === "string"
                      ? technician
                      : technician.name ||
                        technician.fullName ||
                        technician.employeeName ||
                        "Assigned Technician";

                  const technicianId =
                    typeof technician === "object"
                      ? technician._id || technician.id || index
                      : `${technician}-${index}`;

                  return (
                    <div
                      key={technicianId}
                      className="flex items-center gap-3 rounded border border-slate-200 p-4"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                        <UserRound size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {technicianName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {typeof technician === "object"
                            ? technician.phone ||
                              technician.email ||
                              "Technician"
                            : "Technician"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded border border-dashed border-slate-300 p-6 text-center">
                <UserRound
                  size={25}
                  className="mx-auto text-slate-400"
                />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No Technician Assigned
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Assign a technician to manage maintenance work.
                </p>
              </div>
            )}
          </section>

          {/* Warranty Information */}
          <section className="mb-8">
            <SectionTitle icon={ShieldCheck} title="Warranty Information" />

            <div className="rounded border border-slate-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {warranty.provider ||
                      item.warrantyProvider ||
                      "Warranty Provider"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Warranty coverage details
                  </p>
                </div>

                <span
                  className={`rounded border px-3 py-1.5 text-xs font-semibold ${
                    warrantyActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  {warrantyActive ? "Warranty Active" : "Warranty Expired or Unavailable"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Start Date</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(warranty.startDate || item.warrantyStartDate)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Expiry Date</p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {formatDate(warrantyEnd)}
                  </p>
                </div>
              </div>

              {(warranty.terms || item.warrantyTerms) && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">Warranty Terms</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {warranty.terms || item.warrantyTerms}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Repair Summary */}
          <section className="mb-8">
            <SectionTitle icon={Wrench} title="Repair Summary" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Total Repairs
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {item.repairCount ?? repairs.length}
                </p>
              </div>

              <div className="rounded border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Total Repair Cost
                </p>
                <p className="mt-2 break-words text-xl font-bold text-slate-900">
                  {formatCurrency(repairCost)}
                </p>
              </div>

              <div className="rounded border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">
                  Downtime
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {item.downtimeDays ?? item.totalDowntimeDays ?? 0}
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    days
                  </span>
                </p>
              </div>
            </div>

            {repairs.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Repair</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Technician</th>
                      <th className="px-4 py-3 font-semibold">Cost</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {repairs.map((repair, index) => (
                      <tr key={repair._id || repair.id || index}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {repair.description ||
                            repair.title ||
                            repair.repairType ||
                            `Repair ${index + 1}`}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(
                            repair.repairDate ||
                              repair.completedAt ||
                              repair.createdAt
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {repair.technicianName ||
                            repair.technician?.name ||
                            "Not specified"}
                        </td>

                        <td className="px-4 py-3 font-medium text-slate-800">
                          {formatCurrency(
                            repair.totalCost ||
                              repair.cost ||
                              repair.repairCost
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <StatusBadge
                            status={repair.status || "completed"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {repairs.length === 0 && (
              <p className="mt-3 rounded border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                No repair records available.
              </p>
            )}
          </section>

          {/* Maintenance History */}
          <section>
            <SectionTitle icon={History} title="Maintenance History" />

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((record, index) => (
                  <div
                    key={record._id || record.id || index}
                    className="flex gap-3 rounded border border-slate-200 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-blue-700">
                      {record.status === "completed" ? (
                        <CheckCircle2 size={19} />
                      ) : (
                        <Clock size={19} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {record.title ||
                            record.description ||
                            record.issueTitle ||
                            formatLabel(record.status) ||
                            "Maintenance Activity"}
                        </p>

                        <span className="text-xs text-slate-500">
                          {formatDate(
                            record.createdAt ||
                              record.date ||
                              record.updatedAt
                          )}
                        </span>
                      </div>

                      {record.description && record.title && (
                        <p className="mt-1 text-sm text-slate-600">
                          {record.description}
                        </p>
                      )}

                      {record.status && (
                        <div className="mt-2">
                          <StatusBadge status={record.status} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-slate-300 p-6 text-center">
                <History
                  size={25}
                  className="mx-auto text-slate-400"
                />
                <p className="mt-2 text-sm font-medium text-slate-700">
                  No Maintenance History
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Maintenance activities will appear here when available.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <p className="text-xs text-slate-500">
            Last Updated: {formatDate(item.updatedAt)}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
