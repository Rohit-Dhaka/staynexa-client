import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  updateMenuItemAvailability,
  deleteMenuItem,
  getTables,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "../services/restaurant.service";
import MenuItemCard from "../components/MenuItemCard";
import MenuItemForm from "../components/MenuItemForm";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog,
} from "../components/RestaurantCommon";

const getList = (result, key) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.[key])) return result[key];
  if (Array.isArray(result?.data?.[key])) return result.data[key];
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
};

const getId = (value) =>
  value && typeof value === "object"
    ? value._id || value.id || ""
    : value || "";

const navItems = [
  { label: "Menu Items", path: "menu" },
  { label: "Categories", path: "categories" },
  { label: "Tables", path: "tables" },
];

export default function RestaurantManagementLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex  items-center justify-between">
          <div className="">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Restaurant Management
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage menu items, categories, and restaurant tables.
              </p>
          </div>


             <nav
          aria-label="Restaurant management sections"
          className="flex flex-wrap gap-2 rounded border border-gray-200 bg-white p-2"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `rounded px-4 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        </header>

     
        <Outlet key={location.pathname} />
      </div>
    </div>
  );
}



export function MenuSection() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      getMenuItems({ page: 1, limit: 100 }),
      getCategories({ page: 1, limit: 100 }),
    ]);

    const [menuResult, categoryResult] = results;
    const failed = [];

    if (menuResult.status === "fulfilled") {
      setItems(getList(menuResult.value, "items"));
    } else {
      failed.push("menu items");
    }

    if (categoryResult.status === "fulfilled") {
      setCategories(getList(categoryResult.value, "categories"));
    } else {
      failed.push("categories");
    }

    if (failed.length) {
      setError(`Unable to load ${failed.join(" and ")}.`);
    }

    if (showLoader) setLoading(false);
    return failed.length === 0;
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const name = String(item.title || item.name || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const categoryId = getId(item.category);

      const matchesSearch =
        !query || name.includes(query) || description.includes(query);
      const matchesCategory =
        categoryFilter === "all" || categoryId === categoryFilter;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && item.isAvailable === true) ||
        (availabilityFilter === "unavailable" && item.isAvailable !== true);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [items, search, categoryFilter, availabilityFilter]);

  
  const handleFormSuccess = async () => {
    setError("");
    setNotice(
      selectedItem
        ? "Menu item updated successfully."
        : "Menu item created successfully."
    );
    setShowForm(false);
    setSelectedItem(null);
    await loadData(false);
  };

  const handleAvailability = async (id, isAvailable) => {
    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      await updateMenuItemAvailability(id, isAvailable);
      setItems((current) =>
        current.map((item) =>
          (item._id || item.id) === id ? { ...item, isAvailable } : item
        )
      );
      setNotice(
        isAvailable
          ? "Menu item is now available."
          : "Menu item is now unavailable."
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update menu item availability."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;
    if (!id) return;

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await deleteMenuItem(id);
      setItems((current) =>
        current.filter((item) => (item._id || item.id) !== id)
      );
      setNotice("Menu item deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to delete the menu item."
      );
    } finally {
      setDeleting(false);
    }
  };

  const availableCount = items.filter(
    (item) => item.isAvailable === true
  ).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Menu Items</h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage your restaurant menu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            className="rounded border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedItem(null);
              setError("");
              setNotice("");
              setShowForm(true);
            }}
            className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Menu Item
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => loadData()} />}
      {notice && !error && (
        <p
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Menu Items", value: items.length },
          { label: "Available Items", value: availableCount },
          { label: "Unavailable Items", value: items.length - availableCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <MenuItemForm
          item={selectedItem}
          categories={categories}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setSelectedItem(null);
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          type="search"
          aria-label="Search menu items"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or description..."
          className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
        />
        <select
          aria-label="Filter by category"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option
              key={category._id || category.id}
              value={category._id || category.id}
            >
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by availability"
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value)}
          className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="all">All Items</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
      </div>

      <p className="text-sm text-gray-500">
        Showing {filteredItems.length} of {items.length} menu items
      </p>

      {loading ? (
        <LoadingState message="Loading menu items..." />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={items.length ? "No Matching Menu Items" : "No Menu Items Yet"}
          description={
            items.length
              ? "Try changing your search or filters."
              : "Create your first menu item to get started."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item._id || item.id}
              item={item}
              onEdit={(target) => {
                setSelectedItem(target);
                setError("");
                setNotice("");
                setShowForm(true);
              }}
              onDelete={setDeleteTarget}
              onAvailabilityChange={handleAvailability}
              updating={updatingId === (item._id || item.id)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteTarget?.title || deleteTarget?.name || "this item"}"? This action cannot be undone.`}
        confirmLabel="Delete Item"
        cancelLabel="Keep Item"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </section>
  );
}

/* =========================================================
   CATEGORIES
========================================================= */

export function CategoriesSection() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getCategories({ page: 1, limit: 100 });
      setCategories(getList(result, "categories"));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) =>
      String(category.name || "").toLowerCase().includes(query)
    );
  }, [categories, search]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const name = form.name.trim();
    if (!name) return setError("Category name is required.");
    if (name.length > 100) {
      return setError("Category name must not exceed 100 characters.");
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name });
        setNotice("Category updated successfully.");
      } else {
        await createCategory({ name });
        setNotice("Category created successfully.");
      }
      closeForm();
      await loadCategories();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;
    if (!id) return;

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await deleteCategory(id);
      setCategories((current) =>
        current.filter((category) => (category._id || category.id) !== id)
      );
      setNotice("Category deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete category. It may still be linked to menu items."
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Menu Categories
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage menu categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "" });
            setError("");
            setNotice("");
            setShowForm(true);
          }}
          className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add Category
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadCategories} />}
      {notice && !error && (
        <p
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      {showForm && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Category" : "Create Category"}
          </h3>
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
                value={form.name}
                onChange={(event) => setForm({ name: event.target.value })}
                placeholder="e.g. Food, Drinks, Desserts"
                maxLength={100}
                required
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
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
                className="rounded border border-gray-200 px-5 py-2.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          aria-label="Search categories"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by category name..."
          className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
        />
        <button
          type="button"
          onClick={loadCategories}
          disabled={loading}
          className="rounded border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <p className="text-sm text-gray-500">{filtered.length} categories</p>

      {loading ? (
        <LoadingState message="Loading categories..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Categories Found"
          description={
            search
              ? "Try a different search term."
              : "Create your first menu category to get started."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b border-gray-200  text-gray-600">
              <tr>
                <th className="px-5 py-4 font-medium">Category Name</th>
                <th className="px-5 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((category) => {
                const id = category._id || category.id;
                return (
                  <tr key={id} className="hover:">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {category.name}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(id);
                            setForm({ name: category.name || "" });
                            setError("");
                            setNotice("");
                            setShowForm(true);
                          }}
                          className="rounded border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category)}
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name || "this category"}"?`}
        confirmLabel="Delete Category"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </section>
  );
}

/* =========================================================
   TABLES
========================================================= */

const TABLE_STATUSES = ["available", "cleaning", "maintenance"];

const tableInitialForm = {
  tableNumber: "",
  name: "",
  capacity: "2",
  location: "",
  isActive: true,
};


const formatStatus = (status) => {
  const STATUS_LABELS = {
    available: "Available",
    occupied: "In Use",
    reserved: "Reserved",
    cleaning: "Cleaning",
    maintenance: "Maintenance",
    out_of_order: "Out of Order",
  };

  return (
    STATUS_LABELS[String(status || "").toLowerCase()] ||
    String(status || "Unknown").replace(/_/g, " ")
  );
};





function TableStatusBadge({ status }) {
  const normalizedStatus = String(status || "available").toLowerCase();

  const statusStyles = {
    available: "bg-green-50 text-green-700",
    occupied: "bg-black text-blue-700",
    reserved: "bg-yellow-50 text-yellow-700",
    cleaning: "bg-orange-50 text-orange-700",
    maintenance: "bg-red-50 text-red-700",
    out_of_order: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${
        statusStyles[normalizedStatus] || "bg-gray-100 text-gray-600"
      }`}
    >
      {formatStatus(normalizedStatus)}
    </span>
  );
}

export function TablesSection() {
  const [tables, setTables] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(tableInitialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTables = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getTables({ page: 1, limit: 100 });
      setTables(getList(result, "tables"));
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to load restaurant tables."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tables.filter((table) => {
      const status = String(table.status || "available").toLowerCase();
      const matchesSearch =
        !query ||
        String(table.tableNumber || "").toLowerCase().includes(query) ||
        String(table.name || "").toLowerCase().includes(query) ||
        String(table.location || table.section || "")
          .toLowerCase()
          .includes(query);

      return (
        matchesSearch && (statusFilter === "all" || status === statusFilter)
      );
    });
  }, [tables, search, statusFilter]);

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(tableInitialForm);
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
    setNotice("");

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
      section: form.location.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateTable(editingId, payload);
        setNotice("Table updated successfully.");
      } else {
        await createTable(payload);
        setNotice("Table created successfully.");
      }
      closeForm();
      await loadTables();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save table.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (table, status) => {
    const id = table._id || table.id;
    if (!id) return;

    setActionLoading(id);
    setError("");
    setNotice("");

    try {
      await updateTableStatus(id, status);
      setTables((current) =>
        current.map((entry) =>
          (entry._id || entry.id) === id ? { ...entry, status } : entry
        )
      );
      setNotice("Table status updated successfully.");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to update table status."
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;
    if (!id) return;

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await deleteTable(id);
      setTables((current) =>
        current.filter((table) => (table._id || table.id) !== id)
      );
      setNotice("Table deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete table.");
    } finally {
      setDeleting(false);
    }
  };

  const statusCounts = tables.reduce((counts, table) => {
    const status = String(table.status || "available").toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Table Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage seating capacity and table availability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(tableInitialForm);
            setError("");
            setNotice("");
            setShowForm(true);
          }}
          className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
        >
          Add Table
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadTables} />}
      {notice && !error && (
        <p
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Tables", value: tables.length },
          { label: "Available", value: statusCounts.available || 0 },
          { label: "Occupied", value: statusCounts.occupied || 0 },
          { label: "Reserved", value: statusCounts.reserved || 0 },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded border border-gray-200 bg-white p-4"
          >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Table" : "Create Table"}
          </h3>
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
                maxLength={30}
                required
                placeholder="e.g. T-01"
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm"
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
                maxLength={100}
                placeholder="e.g. Window Seating"
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm"
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
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="table-location"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Section
              </label>
              <input
                id="table-location"
                name="location"
                value={form.location}
                onChange={handleFieldChange}
                maxLength={100}
                placeholder="e.g. Indoor, Terrace"
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <label className="flex items-center gap-3 rounded border border-gray-200 p-3 sm:col-span-2">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleFieldChange}
                className="h-4 w-4 rounded accent-gray-900"
              />
              <span className="text-sm font-medium text-gray-700">
                Active table
              </span>
            </label>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
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
                className="rounded border border-gray-200 px-5 py-2.5 text-sm text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            placeholder="Search table number or section..."
            className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="table-status-filter"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Filter by Status
          </label>
          <select
            id="table-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="occupied">Occupied</option>
            <option value="cleaning">Cleaning</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{filtered.length} tables found</p>
        <button
          type="button"
          onClick={loadTables}
          disabled={loading}
          className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading tables..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Tables Found"
          description="Add a table or change your filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((table) => {
            const id = table._id || table.id;
            const status = String(table.status || "available").toLowerCase();
            const canChangeStatus = TABLE_STATUSES.includes(status);

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
                    <h3 className="mt-1 text-xl font-semibold text-gray-900">
                      {table.tableNumber || table.name || "Unnamed table"}
                    </h3>
                    {table.name && table.tableNumber && (
                      <p className="mt-1 text-sm text-gray-500">{table.name}</p>
                    )}
                  </div>
                  <TableStatusBadge status={status} />
                </div>

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium text-gray-900">
                      {table.capacity ?? 0} guests
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Section</span>
                    <span className="font-medium text-gray-900">
                      {table.section || table.location || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Record Status</span>
                    <span className="font-medium text-gray-900">
                      {table.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <label
                    htmlFor={`table-status-${id}`}
                    className="block text-xs font-medium text-gray-600"
                  >
                    Update Table Status
                  </label>
                  <select
  id={`table-status-${id}`}
  value={canChangeStatus ? status : ""}
  disabled={!canChangeStatus || actionLoading === id}
  onChange={(event) =>
    handleStatusChange(table, event.target.value)
  }
  className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm capitalize disabled: disabled:text-gray-400"
>
  {!canChangeStatus && (
    <option value={status}>
      {formatStatus(status)}
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
                      onClick={() => {
                        setEditingId(id);
                        setForm({
                          tableNumber: String(table.tableNumber || ""),
                          name: table.name || "",
                          capacity: String(table.capacity ?? 2),
                          location: table.section || table.location || "",
                          isActive: table.isActive !== false,
                        });
                        setError("");
                        setNotice("");
                        setShowForm(true);
                      }}
                      className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === id || deleting}
                      onClick={() => setDeleteTarget(table)}
                      className="flex-1 rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Table"
        message={`Are you sure you want to delete table "${deleteTarget?.tableNumber || deleteTarget?.name || ""}"?`}
        confirmLabel="Delete Table"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
    </section>
  );
}