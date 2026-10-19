import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import toast from "react-hot-toast";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { Skeleton } from "../../../components/common/Skeleton";
import ExportButtons from "../../../components/common/ExportButtons";
import { deleteCatering, listCatering } from "../services/banquet.service";
import CateringFormModal from "../components/CateringFormModal";
import {
  FOOD_TYPE_OPTIONS,
  MEAL_TYPE_OPTIONS,
  formatINR,
  getErrorMessage,
  labelFor,
  primaryButton,
} from "../../../utils/banquet.utils";

const getPayload = (response) => response?.data ?? response ?? {};

const normalizePackages = (response) => {
  const payload = getPayload(response);
  const list = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.packages ?? payload?.cateringPackages ?? payload?.data ?? [];
  return Array.isArray(list) ? list.filter(Boolean) : [];
};

const cateringExportColumns = [
  { header: "Package Name", value: (pkg) => pkg?.name || "-" },
  {
    header: "Meal Type",
    value: (pkg) => labelFor(MEAL_TYPE_OPTIONS, pkg?.mealType) || pkg?.mealType || "-",
  },
  {
    header: "Food Type",
    value: (pkg) => labelFor(FOOD_TYPE_OPTIONS, pkg?.foodType) || pkg?.foodType || "-",
  },
  { header: "Price Per Plate", value: (pkg) => formatINR(pkg?.pricePerPlate) },
  { header: "Minimum Guests", value: (pkg) => pkg?.minGuests ?? 0 },
  {
    header: "Menu Items",
    value: (pkg) => (Array.isArray(pkg?.items) ? pkg.items.join(", ") : "-"),
  },
  { header: "Status", value: (pkg) => (pkg?.isActive ? "Active" : "Inactive") },
];

const CateringPackages = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listCatering();
      setPackages(normalizePackages(response));
    } catch (error) {
      setPackages([]);
      toast.error(getErrorMessage(error, "Could not load catering packages"));
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
      toast.error("Could not identify the catering package to remove");
      return;
    }

    setRemoveBusy(true);
    try {
      await deleteCatering(removing._id);
      toast.success("Package removed successfully");
      setRemoving(null);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove catering package"));
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catering Packages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Menus and per-plate prices that can be added to banquet bookings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Catering Packages"
            fileName="banquet-catering-packages"
            columns={cateringExportColumns}
            rows={packages}
          />
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={primaryButton}
          >
            <Plus size={16} />
            Add Package
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-56" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <div className="rounded-xl bg-slate-100 p-4 text-slate-500">
            <UtensilsCrossed size={28} />
          </div>
          <h3 className="font-semibold text-slate-800">
            No catering packages yet
          </h3>
          <p className="max-w-sm text-sm text-slate-500">
            Add menu packages so they can be selected while creating a booking.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={primaryButton}
          >
            <Plus size={16} />
            Add Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg._id || pkg.id || pkg.name}
              className={`rounded-xl border border-slate-200 bg-white p-5 ${
                pkg.isActive ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {labelFor(MEAL_TYPE_OPTIONS, pkg.mealType) || pkg.mealType || "-"},{" "}
                    {labelFor(FOOD_TYPE_OPTIONS, pkg.foodType) || pkg.foodType || "-"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    pkg.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pkg.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-3 text-lg font-bold text-slate-900">
                {formatINR(pkg.pricePerPlate)}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  per plate, minimum {pkg.minGuests ?? 0} plates
                </span>
              </p>

              {Array.isArray(pkg.items) && pkg.items.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {pkg.items.slice(0, 5).map((item, index) => (
                    <li key={`${item}-${index}`}>- {item}</li>
                  ))}
                  {pkg.items.length > 5 && (
                    <li className="text-xs text-slate-400">
                      +{pkg.items.length - 5} more items
                    </li>
                  )}
                </ul>
              )}

              <div className="mt-4 flex justify-end gap-1 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(pkg)}
                  aria-label={`Edit ${pkg.name || "package"}`}
                  title="Edit package"
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  <Pencil size={16} />
                </button>
                {pkg.isActive && (
                  <button
                    type="button"
                    onClick={() => setRemoving(pkg)}
                    aria-label={`Remove ${pkg.name || "package"}`}
                    title="Remove package"
                    className="rounded-md p-2 text-rose-500 hover:bg-rose-50"
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
        <CateringFormModal
          pkg={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this package?"
        message={
          removing
            ? `${removing.name} will no longer be selectable for new bookings. Existing bookings keep their menu.`
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

export default CateringPackages;
