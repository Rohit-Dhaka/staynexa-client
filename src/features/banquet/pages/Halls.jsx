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
    <div className="space-y-4 sm:space-y-5">
      <section className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700 sm:h-11 sm:w-11">
            <Building2 size={21} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Banquet Halls</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
              Manage halls, capacity, pricing, amenities, and setup buffers.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ExportButtons
              title="Banquet Halls"
              fileName="banquet-halls"
              columns={hallExportColumns}
              rows={halls}
            />
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${primaryButton} flex w-full items-center justify-center gap-2 whitespace-nowrap sm:w-auto`}
          >
            <Plus size={16} />
            Add Hall
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-52 rounded" />
          ))}
        </div>
      ) : halls.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded border border-slate-200 bg-white px-4 py-10 text-center sm:py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-slate-600">
            <Building2 size={25} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">No halls yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-slate-500">
              Add your first banquet hall to start taking event bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${primaryButton} flex items-center justify-center gap-2`}
          >
            <Plus size={16} />
            Add Hall
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {halls.map((hall) => (
            <article
              key={hall._id || hall.id || hall.code || hall.name}
              className={`flex min-w-0 flex-col rounded border bg-white p-4 sm:p-5 ${
                hall.isActive ? "border-slate-200" : "border-slate-200 opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-slate-900">{hall.name}</h3>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {hall.code ? `${hall.code} · ` : ""}
                    Floor {hall.floor ?? "-"}
                    {hall.areaSqFt ? ` · ${hall.areaSqFt} sq ft` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    hall.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {hall.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 rounded border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users size={16} className="shrink-0 text-slate-500" />
                  <span>
                    {hall.capacityMin ? `${hall.capacityMin} to ` : "Up to "}
                    {hall.capacityMax ?? "-"} guests
                  </span>
                </div>
                <p className="mt-2 break-words text-lg font-bold text-slate-900">
                  {formatINR(hall.rate)}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    {(labelFor(PRICING_TYPE_OPTIONS, hall.pricingType) || "").toLowerCase()}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {hall.bufferMinutes ?? 0} minute buffer between events
                </p>
              </div>

              {Array.isArray(hall.amenities) && hall.amenities.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Amenities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {hall.amenities.map((amenity, index) => (
                      <span
                        key={`${amenity}-${index}`}
                        className="max-w-full break-words rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(hall)}
                  aria-label={`Edit ${hall.name || "hall"}`}
                  title="Edit hall"
                  className="flex items-center justify-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <Pencil size={15} />
                  Edit
                </button>
                {hall.isActive && (
                  <button
                    type="button"
                    onClick={() => setRemoving(hall)}
                    aria-label={`Remove ${hall.name || "hall"}`}
                    title="Remove hall"
                    className="flex items-center justify-center gap-2 rounded border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
              </div>
            </article>
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
