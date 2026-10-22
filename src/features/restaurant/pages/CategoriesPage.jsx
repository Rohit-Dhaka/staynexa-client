
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/restaurant.service";

const getList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.categories)) return result.categories;
  if (Array.isArray(result?.data?.categories)) {
    return result.data.categories;
  }
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const initialForm = {
  name: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getCategories({ page: 1, limit: 100 });
      setCategories(getList(result));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load categories. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    return categories.filter((category) =>
      category.name?.toLowerCase().includes(query)
    );
  }, [categories, search]);

  const updateField = (event) => {
    setForm({ name: event.target.value });
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingId(category._id || category.id);
    setForm({
      name: category.name || "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    if (name.length > 100) {
      setError("Category name must not exceed 100 characters.");
      return;
    }

    const payload = { name };

    setSaving(true);

    try {
      if (editingId) {
        await updateCategory(editingId, payload);
        setSuccess("Category updated successfully.");
      } else {
        await createCategory(payload);
        setSuccess("Category created successfully.");
      }

      closeForm();
      await loadCategories();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to save category. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    const id = category._id || category.id;

    if (!id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteCategory(id);

      setCategories((current) =>
        current.filter((item) => (item._id || item.id) !== id)
      );

      setSuccess("Category deleted successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete category. It may still be linked to menu items."
      );
    }
  };

  return (
    <div className="min-h-screen  p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Menu Categories
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage restaurant menu categories.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Category
          </button>
        </div>

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

        {showForm && (
          <section className="rounded border border-gray-200 bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Category" : "Create Category"}
              </h2>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Close
              </button>
            </div>

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
                  type="text"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Food, Drinks, Desserts"
                  maxLength={100}
                  required
                  autoFocus
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Category"}
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

        <section className="rounded border border-gray-200 bg-white p-4 sm:p-5">
          <label
            htmlFor="category-search"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Search Categories
          </label>

          <input
            id="category-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by category name..."
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </section>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {filteredCategories.length} categories
          </p>

          <button
            type="button"
            onClick={loadCategories}
            disabled={loading}
            className="rounded border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-10 text-center">
            <h2 className="font-semibold text-gray-900">
              No categories found
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {search.trim()
                ? "Try a different search term."
                : "Create your first menu category to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-gray-200 bg-white">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-gray-200  text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-medium">Category Name</th>
                  <th className="px-5 py-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCategories.map((category) => {
                  const id = category._id || category.id;

                  return (
                    <tr key={id} className="hover:">
                      <td className="px-5 py-4">
                        <span className="font-medium text-gray-900">
                          {category.name}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(category)}
                            className="rounded border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            className="rounded border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
