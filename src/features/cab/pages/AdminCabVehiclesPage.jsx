import { useCallback, useEffect, useState } from "react";
import {
  CarFront,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  getCabVehicles,
  createCabVehicle,
  updateCabVehicle,
  deleteCabVehicle,
  VEHICLE_TYPES,
} from "../services/cab.service";

const EMPTY_FORM = {
  registrationNumber: "",
  vehicleType: "sedan",
  brand: "",
  model: "",
  capacity: 4,
  isActive: true,
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-50";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded border px-4 py-2.5 text-sm font-medium  disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

function formatLabel(value = "") {
  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getVehicles(response) {
  const candidates = [
    response,
    response?.vehicles,
    response?.items,
    response?.data,
    response?.data?.vehicles,
    response?.data?.items,
    response?.data?.data,
    response?.data?.data?.vehicles,
  ];

  return candidates.find(Array.isArray) || [];
}

function getVehicleId(vehicle) {
  return vehicle?._id || vehicle?.id;
}

function getRegistrationNumber(vehicle) {
  return (
    vehicle?.registrationNumber ||
    vehicle?.vehicleNumber ||
    vehicle?.registrationNo ||
    ""
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function AdminCabVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getCabVehicles();
      setVehicles(getVehicles(response));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchText = [
      getRegistrationNumber(vehicle),
      vehicle.brand,
      vehicle.model,
      vehicle.vehicleType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase().trim());

    const active = vehicle.isActive !== false;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && active) ||
      (statusFilter === "inactive" && !active);

    return matchesSearch && matchesStatus;
  });

  const activeCount = vehicles.filter(
    (vehicle) => vehicle.isActive !== false,
  ).length;

  const inactiveCount = vehicles.length - activeCount;

  function openCreateModal() {
    setEditingVehicle(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEditModal(vehicle) {
    setEditingVehicle(vehicle);

    setForm({
      registrationNumber: getRegistrationNumber(vehicle),
      vehicleType: vehicle.vehicleType || "sedan",
      brand: vehicle.brand || "",
      model: vehicle.model || "",
      capacity: vehicle.capacity ?? 4,
      isActive: vehicle.isActive !== false,
    });

    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditingVehicle(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setNotice("");
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "registrationNumber"
            ? value.toUpperCase()
            : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    const registrationNumber = String(form.registrationNumber || "")
      .trim()
      .toUpperCase();

    const type = String(form.vehicleType || "")
      .trim()
      .toLowerCase();

    const seats = Number(form.capacity);

    if (!registrationNumber) {
      setError("Registration number is required.");
      return;
    }

    if (!type) {
      setError("Please select a vehicle type.");
      return;
    }

    if (!Number.isInteger(seats) || seats < 1 || seats > 60) {
      setError("Seating capacity must be between 1 and 60.");
      return;
    }

    const payload = {
      registrationNumber,
      type,
      make: String(form.brand || "").trim(),
      model: String(form.model || "").trim(),
      seats,
    };

    console.log("Vehicle API payload:", payload);

    try {
      setSaving(true);

      if (editingVehicle) {
        const vehicleId = getVehicleId(editingVehicle);

        if (!vehicleId) {
          throw new Error("Vehicle ID is missing.");
        }

        await updateCabVehicle(vehicleId, payload);
        setNotice("Vehicle updated successfully.");
      } else {
        await createCabVehicle(payload);
        setNotice("Vehicle created successfully.");
      }

      setModalOpen(false);
      setEditingVehicle(null);
      setForm({ ...EMPTY_FORM });

      await loadVehicles();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(vehicle) {
    if (saving) return;

    const vehicleId = getVehicleId(vehicle);

    if (!vehicleId) {
      setError("Vehicle ID is missing.");
      return;
    }

    const registrationNumber = getRegistrationNumber(vehicle);

    const confirmed = window.confirm(
      `Delete vehicle ${registrationNumber}? This action may be blocked if the vehicle is linked to existing bookings.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setNotice("");
      setSaving(true);

      await deleteCabVehicle(vehicleId);

      setNotice("Vehicle deleted successfully.");
      await loadVehicles();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
              <CarFront size={18} />
              Fleet Management
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">Cab Vehicles</h1>

            <p className="mt-2 text-sm text-slate-500">
              Register vehicles and manage your cab fleet.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadVehicles}
              disabled={loading || saving}
              className={`${buttonClass} border-slate-300 bg-white text-slate-700 `}
            >
              <RefreshCw size={16} className={loading ? "" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={saving}
              className={`${buttonClass} border-indigo-600 bg-black text-white `}
            >
              <Plus size={17} />
              Add Vehicle
            </button>
          </div>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} />
            <span className="flex-1">{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              className="rounded p-1"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && !modalOpen && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />

            <span className="flex-1">{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="rounded p-1"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Vehicles</p>
            <p className="mt-2 text-3xl font-bold">{vehicles.length}</p>
          </article>

          <article className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Active Vehicles</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {activeCount}
            </p>
          </article>

          <article className="rounded border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Inactive Vehicles</p>
            <p className="mt-2 text-3xl font-bold text-slate-600">
              {inactiveCount}
            </p>
          </article>
        </section>

        <section className="rounded border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <label className="relative block flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by registration, brand or model"
                className={`${inputClass} pl-10`}
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${inputClass} md:max-w-48`}
              aria-label="Filter vehicles by status"
            >
              <option value="all">All vehicles</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle size={20} className="" />
              Loading vehicles...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="rounded border border-dashed border-slate-300 p-10 text-center">
              <CarFront size={32} className="mx-auto text-slate-400" />

              <h2 className="mt-3 font-semibold text-slate-800">
                No vehicles found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Add a vehicle or change your search filters.
              </p>

              <button
                type="button"
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 rounded border border-indigo-600 bg-black px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Add Vehicle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-semibold">Vehicle</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Brand / Model</th>
                    <th className="px-3 py-3 font-semibold">Capacity</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVehicles.map((vehicle, index) => (
                    <tr
                      key={getVehicleId(vehicle) || index}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-indigo-600">
                            <CarFront size={19} />
                          </span>

                          <span className="font-semibold text-slate-900">
                            {getRegistrationNumber(vehicle) || "Not provided"}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {formatLabel(vehicle.vehicleType || "")}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {[vehicle.brand, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>

                      <td className="px-3 py-4 text-slate-600">
                        {vehicle.capacity ?? "—"} seats
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge active={vehicle.isActive !== false} />
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(vehicle)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(vehicle)}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="vehicle-modal-title"
              className="my-auto w-full max-w-xl rounded border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 id="vehicle-modal-title" className="text-xl font-bold">
                    {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter the vehicle information below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded border border-slate-200 p-2 text-slate-500"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span className="flex-1">{error}</span>

                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="rounded p-1"
                    aria-label="Dismiss error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">
                    Registration Number *
                  </span>

                  <input
                    name="registrationNumber"
                    value={form.registrationNumber}
                    onChange={handleChange}
                    placeholder="e.g. HR01AB1234"
                    autoComplete="off"
                    required
                    disabled={saving}
                    className={inputClass}
                  />

                  <span className="mt-1 block text-xs text-slate-500">
                    Enter the vehicle registration number.
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Vehicle Type *
                    </span>

                    <select
                      name="vehicleType"
                      value={form.vehicleType}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      className={inputClass}
                    >
                      {VEHICLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {formatLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Seating Capacity *
                    </span>

                    <input
                      type="number"
                      name="capacity"
                      value={form.capacity}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      required
                      disabled={saving}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Brand
                    </span>

                    <input
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                      placeholder="e.g. Maruti Suzuki"
                      disabled={saving}
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      Model
                    </span>

                    <input
                      name="model"
                      value={form.model}
                      onChange={handleChange}
                      placeholder="e.g. Dzire"
                      disabled={saving}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded border border-slate-200 p-4">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={Boolean(form.isActive)}
                    onChange={handleChange}
                    disabled={saving}
                    className="mt-1 h-4 w-4 rounded accent-indigo-600"
                  />

                  <span>
                    <span className="block text-sm font-semibold">
                      Active Vehicle
                    </span>

                    <span className="mt-1 block text-xs text-slate-500">
                      Mark this vehicle as active in the fleet.
                    </span>
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className={`${buttonClass} border-slate-300 bg-white text-slate-700 `}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className={`${buttonClass} border-indigo-600 bg-black text-white `}
                  >
                    {saving ? (
                      <LoaderCircle size={16} className="" />
                    ) : (
                      <Save size={16} />
                    )}

                    {saving
                      ? "Saving..."
                      : editingVehicle
                        ? "Update Vehicle"
                        : "Create Vehicle"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
