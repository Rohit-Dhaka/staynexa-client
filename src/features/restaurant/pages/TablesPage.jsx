
import { useCallback, useEffect, useState } from "react";
import {
  getTables,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "../services/restaurant.service";

const getList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const initialForm = {
  tableNumber: "",
  name: "",
  capacity: "2",
  location: "",
  isActive: true,
};

const TABLE_STATUSES = [
  "available",
  "cleaning",
  "maintenance",
];

const formatStatus = (status = "available") =>
  status.replaceAll("_", " ");

function StatusBadge({ status }) {
  const styles = {
    available: "bg-emerald-50 text-emerald-700",
    reserved: "bg-black text-blue-700",
    occupied: "bg-amber-50 text-amber-700",
    cleaning: "bg-purple-50 text-purple-700",
    maintenance: "bg-red-50 text-red-700",
  };

  const normalized = String(status || "available").toLowerCase();

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ${
        styles[normalized] || "bg-gray-100 text-gray-600"
      }`}
    >
      {formatStatus(normalized)}
    </span>
  );
}

export default function TablesPage() {
  const [tables, setTables] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getTables({ page: 1, limit: 100 });
      setTables(getList(result));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load restaurant tables."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const filteredTables = tables.filter((table) => {
    const query = search.trim().toLowerCase();
    const status = String(table.status || "available").toLowerCase();

    const matchesSearch =
      !query ||
      String(table.tableNumber || "").toLowerCase().includes(query) ||
      String(table.name || "").toLowerCase().includes(query) ||
      String(table.location || "").toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (table) => {
    setEditingId(table._id || table.id);
    setForm({
      tableNumber: String(table.tableNumber || ""),
      name: table.name || "",
      capacity: String(table.capacity ?? 2),
      location: table.location || "",
      isActive: table.isActive !== false,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleFieldChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const capacity = Number(form.capacity);

    if (!form.tableNumber.trim()) {
      setError("Table number is required.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a whole number greater than zero.");
      return;
    }

    const payload = {
      tableNumber: form.tableNumber.trim(),
      name: form.name.trim(),
      capacity,
      location: form.location.trim(),
      isActive: form.isActive,
    };

    setSaving(true);

    try {
      if (editingId) {
        await updateTable(editingId, payload);
        setSuccess("Table updated successfully.");
      } else {
        await createTable(payload);
        setSuccess("Table created successfully.");
      }

      closeForm();
      await loadTables();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to save table. Check the required fields."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (table, status) => {
    const id = table._id || table.id;
    if (!id) return;

    setActionLoading(id);
    setError("");
    setSuccess("");

    try {
      await updateTableStatus(id, status);
      setTables((current) =>
        current.map((entry) =>
          (entry._id || entry.id) === id
            ? { ...entry, status }
            : entry
        )
      );
      setSuccess("Table status updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update table status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (table) => {
    const id = table._id || table.id;
    if (!id) return;

    if (
      !window.confirm(
        `Are you sure you want to delete table "${table.tableNumber}"?`
      )
    ) {
      return;
    }

    setActionLoading(id);
    setError("");
    setSuccess("");

    try {
      await deleteTable(id);
      setTables((current) =>
        current.filter((entry) => (entry._id || entry.id) !== id)
      );
      setSuccess("Table deleted successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete table. It may be in use."
      );
    } finally {
      setActionLoading("");
    }
  };

  const statusCounts = tables.reduce(
    (counts, table) => {
      const status = String(table.status || "available").toLowerCase();
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    {}
  );

  return (
    <div className="min-h-screen  p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Table Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage seating capacity and table availability.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Table
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Tables", value: tables.length },
            { label: "Available", value: statusCounts.available || 0 },
            { label: "Occupied", value: statusCounts.occupied || 0 },
            { label: "Reserved", value: statusCounts.reserved || 0 },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded border border-gray-200 bg-white p-4"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {showForm && (
          <section className="rounded border border-gray-200 bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Table" : "Create Table"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="table-number"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Table Number *
                </label>
                <input
                  id="table-number"
                  name="tableNumber"
                  value={form.tableNumber}
                  onChange={handleFieldChange}
                  placeholder="e.g. T-01"
                  required
                  maxLength={30}
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="table-name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Table Name
                </label>
                <input
                  id="table-name"
                  name="name"
                  value={form.name}
                  onChange={handleFieldChange}
                  placeholder="e.g. Window Seating"
                  maxLength={100}
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="table-capacity"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Seating Capacity *
                </label>
                <input
                  id="table-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={handleFieldChange}
                  required
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="table-location"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Location
                </label>
                <input
                  id="table-location"
                  name="location"
                  value={form.location}
                  onChange={handleFieldChange}
                  placeholder="e.g. Indoor, Terrace"
                  maxLength={100}
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <label className="flex items-center gap-3 rounded border border-gray-200 p-3 sm:col-span-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                />
                <span className="text-sm font-medium text-gray-700">
                  Active table
                </span>
              </label>

              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Table"}
                </button>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="table-search"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Search Tables
            </label>
            <input
              id="table-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search table number or location..."
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="table-status"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Filter by Status
            </label>
            <select
              id="table-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="occupied">Occupied</option>
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </section>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {filteredTables.length} tables found
          </p>
          <button
            type="button"
            onClick={loadTables}
            disabled={loading}
            className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading tables...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-10 text-center">
            <h2 className="font-semibold text-gray-900">No tables found</h2>
            <p className="mt-1 text-sm text-gray-500">
              Add a table or change your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTables.map((table, index) => {
              const id = table._id || table.id || index;
              const status = String(table.status || "available").toLowerCase();
              const canChangeStatus = ["available", "cleaning", "maintenance"].includes(status);

              return (
                <article
                  key={id}
                  className="rounded border border-gray-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Table
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-gray-900">
                        {table.tableNumber || table.name || "Unnamed table"}
                      </h2>
                      {table.name && table.tableNumber && (
                        <p className="mt-1 text-sm text-gray-500">
                          {table.name}
                        </p>
                      )}
                    </div>

                    <StatusBadge status={status} />
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-500">Capacity</span>
                      <span className="font-medium text-gray-900">
                        {table.capacity ?? 0} guests
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-gray-900">
                        {table.location || "Not specified"}
                      </span>
                    </div>

                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-500">Record status</span>
                      <span className="font-medium text-gray-900">
                        {table.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <label
                      htmlFor={`status-${id}`}
                      className="block text-xs font-medium text-gray-600"
                    >
                      Update table status
                    </label>
                    <select
                      id={`status-${id}`}
                      value={TABLE_STATUSES.includes(status) ? status : ""}
                      disabled={!canChangeStatus || actionLoading === id}
                      onChange={(event) =>
                        handleStatusChange(table, event.target.value)
                      }
                      className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm capitalize outline-none focus:border-gray-500 disabled: disabled:text-gray-400"
                    >
                      {!TABLE_STATUSES.includes(status) && (
                        <option value="">
                          {formatStatus(status)} — managed by order flow
                        </option>
                      )}
                      {TABLE_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {formatStatus(value)}
                        </option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(table)}
                        className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === id}
                        onClick={() => handleDelete(table)}
                        className="flex-1 rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {actionLoading === id ? "Please wait..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
