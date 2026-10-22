import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { Skeleton } from "../../../components/common/Skeleton";
import ExportButtons from "../../../components/common/ExportButtons";
import { deleteHall, listHalls } from "../services/banquet.service";
import HallFormModal from "../components/HallFormModal";
import {
  formatINR,
  getErrorMessage,
  labelFor,
  PRICING_TYPE_OPTIONS,
  primaryButton,
} from "../../../utils/banquet.utils";

const getPayload = (response) => response?.data ?? response ?? {};

const normalizeHalls = (response) => {
  const payload = getPayload(response);
  const list =
    Array.isArray(payload) ? payload : payload?.items ?? payload?.halls ?? payload?.data ?? [];
  return Array.isArray(list) ? list.filter(Boolean) : [];
};

const hallExportColumns = [
  { header: "Hall Name", value: (hall) => hall?.name || "-" },
  { header: "Hall Code", value: (hall) => hall?.code || "-" },
  { header: "Floor", value: (hall) => hall?.floor ?? "-" },
  { header: "Area (sq ft)", value: (hall) => hall?.areaSqFt ?? "-" },
  { header: "Minimum Capacity", value: (hall) => hall?.capacityMin ?? "-" },
  { header: "Maximum Capacity", value: (hall) => hall?.capacityMax ?? "-" },
  { header: "Rate", value: (hall) => formatINR(hall?.rate) },
  {
    header: "Pricing Type",
    value: (hall) =>
      labelFor(PRICING_TYPE_OPTIONS, hall?.pricingType) || hall?.pricingType || "-",
  },
  { header: "Buffer Minutes", value: (hall) => hall?.bufferMinutes ?? 0 },
  {
    header: "Amenities",
    value: (hall) =>
      Array.isArray(hall?.amenities) ? hall.amenities.join(", ") : "-",
  },
  { header: "Status", value: (hall) => (hall?.isActive ? "Active" : "Inactive") },
];

const Halls = () => {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listHalls();
      setHalls(normalizeHalls(response));
    } catch (error) {
      setHalls([]);
      toast.error(getErrorMessage(error, "Could not load halls"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = () => {
    setEditing(null);
    setCreating(false);
    load();
  };

  const confirmRemove = async () => {
    if (!removing?._id) {
      toast.error("Could not identify the hall to remove");
      return;
    }

    setRemoveBusy(true);
    try {
      await deleteHall(removing._id);
      toast.success("Hall removed successfully");
      setRemoving(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove hall"));
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Banquet Halls</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage halls, capacity, pricing and setup buffers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Banquet Halls"
            fileName="banquet-halls"
            columns={hallExportColumns}
            rows={halls}
          />
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={primaryButton}
          >
            <Plus size={16} />
            Add Hall
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-52" />
          ))}
        </div>
      ) : halls.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded border border-slate-200 bg-white px-4 py-16 text-center">
          <div className="rounded bg-slate-100 p-4 text-slate-500">
            <Building2 size={28} />
          </div>
          <h3 className="font-semibold text-slate-800">No halls yet</h3>
          <p className="max-w-sm text-sm text-slate-500">
            Add your first banquet hall to start taking event bookings.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={primaryButton}
          >
            <Plus size={16} />
            Add Hall
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {halls.map((hall) => (
            <div
              key={hall._id || hall.id || hall.code || hall.name}
              className={`rounded border bg-white p-5 ${
                hall.isActive
                  ? "border-slate-200"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{hall.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {hall.code ? `${hall.code}, ` : ""}
                    Floor {hall.floor ?? "-"}
                    {hall.areaSqFt ? `, ${hall.areaSqFt} sq ft` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    hall.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hall.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-700">
                <Users size={15} className="text-slate-400" />
                {hall.capacityMin ? `${hall.capacityMin} to ` : "Up to "}
                {hall.capacityMax ?? "-"} guests
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {formatINR(hall.rate)}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  {(labelFor(PRICING_TYPE_OPTIONS, hall.pricingType) || "")
                    .toLowerCase()}
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {hall.bufferMinutes ?? 0} minute buffer between events
              </p>

              {Array.isArray(hall.amenities) && hall.amenities.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hall.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(hall)}
                  aria-label={`Edit ${hall.name || "hall"}`}
                  title="Edit hall"
                  className="rounded p-2 text-slate-500 hover:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
                {hall.isActive && (
                  <button
                    type="button"
                    onClick={() => setRemoving(hall)}
                    aria-label={`Remove ${hall.name || "hall"}`}
                    title="Remove hall"
                    className="rounded p-2 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <HallFormModal
          hall={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this hall?"
        message={
          removing
            ? `${removing.name} will no longer be available for new bookings. Existing records are kept.`
            : ""
        }
        confirmText="Remove"
        loading={removeBusy}
        onConfirm={confirmRemove}
        onCancel={() => {
          if (!removeBusy) setRemoving(null);
        }}
      />
    </div>
  );
};

export default Halls;
