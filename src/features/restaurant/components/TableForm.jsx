
import { useEffect, useState } from "react";

const INITIAL_FORM = {
  tableNumber: "",
  name: "",
  capacity: "2",
  location: "",
  isActive: true,
};

const getFormValues = (table) => ({
  tableNumber: table?.tableNumber || "",
  name: table?.name || "",
  capacity: String(table?.capacity ?? 2),
  location: table?.location || "",
  isActive: table?.isActive !== false,
});

export default function TableForm({
  table = null,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const [form, setForm] = useState(getFormValues(table));
  const [error, setError] = useState("");

  const isEditing = Boolean(table?._id || table?.id);

  useEffect(() => {
    setForm(getFormValues(table));
    setError("");
  }, [table]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const tableNumber = form.tableNumber.trim();
    const capacity = Number(form.capacity);

    if (!tableNumber) {
      setError("Table number is required.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      setError("Capacity must be a whole number greater than zero.");
      return;
    }

    const payload = {
      tableNumber,
      name: form.name.trim(),
      capacity,
      location: form.location.trim(),
      isActive: form.isActive,
    };

    try {
      await onSubmit?.(payload);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save the table. Please try again."
      );
    }
  };

  return (
    <section className="rounded border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Table" : "Create Table"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Configure the table number, seating capacity, and location.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              onChange={handleChange}
              placeholder="e.g. T-01"
              maxLength={30}
              required
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
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="table-name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Display Name
          </label>

          <input
            id="table-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Window Table"
            maxLength={100}
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
            onChange={handleChange}
            placeholder="e.g. Indoor, Outdoor, or Terrace"
            maxLength={100}
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <label className="flex items-center gap-3 rounded border border-gray-200 p-3">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 accent-gray-900"
          />

          <span>
            <span className="block text-sm font-medium text-gray-800">
              Active Table
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Allow this table to be used for restaurant orders.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create Table"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
