
import { useEffect, useState } from "react";

const getInitialForm = (category) => ({
  name: category?.name || "",
  description: category?.description || "",
  sortOrder: String(category?.sortOrder ?? 0),
  isActive: category?.isActive !== false,
});

export default function CategoryForm({
  category = null,
  onSubmit,
  onCancel,
  saving = false,
}) {
  const [form, setForm] = useState(getInitialForm(category));
  const [error, setError] = useState("");

  const isEditing = Boolean(category?._id || category?.id);

  useEffect(() => {
    setForm(getInitialForm(category));
    setError("");
  }, [category]);

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

    const name = form.name.trim();
    const sortOrder = Number(form.sortOrder);

    if (!name) {
      setError("Category name is required.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setError("Sort order must be a non-negative whole number.");
      return;
    }

    try {
      await onSubmit?.({
        name,
        description: form.description.trim(),
        sortOrder,
        isActive: form.isActive,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save the category. Please try again."
      );
    }
  };

  return (
    <section className="rounded border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Category" : "Create Category"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Organize menu items into categories.
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
        <div>
          <label
            htmlFor="category-name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Category Name *
          </label>

          <input
            id="category-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Starters"
            maxLength={100}
            required
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="category-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Description
          </label>

          <textarea
            id="category-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe this category..."
            rows={3}
            maxLength={500}
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="category-sort-order"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Display Order
          </label>

          <input
            id="category-sort-order"
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            value={form.sortOrder}
            onChange={handleChange}
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />

          <p className="mt-1 text-xs text-gray-500">
            Lower numbers appear first.
          </p>
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
              Active Category
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              Show this category when selecting menu items.
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
                : "Create Category"}
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
