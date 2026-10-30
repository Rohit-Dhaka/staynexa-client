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
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-700 sm:h-11 sm:w-11">
              <UtensilsCrossed size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Catering Packages</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm">
                Manage menus and per-plate prices available for banquet bookings.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="w-full sm:w-auto">
              <ExportButtons
                title="Catering Packages"
                fileName="banquet-catering-packages"
                columns={cateringExportColumns}
                rows={packages}
              />
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${primaryButton} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
            >
              <Plus size={16} />
              Add Package
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-52 rounded" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded border border-slate-200 bg-white px-4 py-10 text-center sm:py-14">
          <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-slate-600">
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 sm:text-base">No catering packages yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500 sm:text-sm">
              Add a menu package to make it available when creating a banquet booking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${primaryButton} inline-flex items-center justify-center gap-2`}
          >
            <Plus size={16} />
            Add Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
          {packages.map((pkg) => (
            <article
              key={pkg._id || pkg.id || pkg.name}
              className={`flex min-w-0 flex-col rounded border border-slate-200 bg-white p-4 sm:p-5 ${
                pkg.isActive ? "" : "opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-semibold text-slate-900 sm:text-base">
                    {pkg.name || "Unnamed Package"}
                  </h3>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {labelFor(MEAL_TYPE_OPTIONS, pkg.mealType) || pkg.mealType || "-"}
                    <span className="px-1.5 text-slate-300">|</span>
                    {labelFor(FOOD_TYPE_OPTIONS, pkg.foodType) || pkg.foodType || "-"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    pkg.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {pkg.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 rounded border border-slate-100 bg-slate-50 p-3">
                <p className="text-lg font-bold leading-6 text-slate-900 sm:text-xl">
                  {formatINR(pkg.pricePerPlate)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Per plate <span className="px-1 text-slate-300">|</span> Minimum {pkg.minGuests ?? 0} plates
                </p>
              </div>

              <div className="mt-4 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menu Items</p>
                {Array.isArray(pkg.items) && pkg.items.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600 sm:text-sm">
                    {pkg.items.slice(0, 5).map((item, index) => (
                      <li key={`${item}-${index}`} className="flex min-w-0 gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                    {pkg.items.length > 5 && (
                      <li className="pt-1 text-xs text-slate-400">
                        +{pkg.items.length - 5} more items
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">No menu items added.</p>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setEditing(pkg)}
                  aria-label={`Edit ${pkg.name || "package"}`}
                  title="Edit package"
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-slate-200 px-3 text-xs font-medium text-slate-600 sm:text-sm"
                >
                  <Pencil size={15} />
                  <span>Edit</span>
                </button>
                {pkg.isActive && (
                  <button
                    type="button"
                    onClick={() => setRemoving(pkg)}
                    aria-label={`Remove ${pkg.name || "package"}`}
                    title="Remove package"
                    className="inline-flex min-h-9 items-center justify-center gap-2 rounded border border-rose-200 px-3 text-xs font-medium text-rose-600 sm:text-sm"
                  >
                    <Trash2 size={15} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </article>
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
