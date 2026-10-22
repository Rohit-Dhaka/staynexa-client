
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getCategories,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem,
} from "../services/restaurant.service";

import MenuItemCard from "../components/MenuItemCard";
import MenuItemForm from "../components/MenuItemForm";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  ConfirmDialog,
} from "../components/RestaurantCommon";


const getList = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.categories)) return result.categories;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.categories)) {
    return result.data.categories;
  }
  return [];
};


const getId = (value) => {
  if (value && typeof value === "object") {
    return value._id || value.id || "";
  }

  return value || "";
};

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [updatingId, setUpdatingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);

    setError("");

    const results = await Promise.allSettled([
      getMenuItems({ limit: 100, page: 1 }),
      getCategories({ limit: 100, page: 1 }),
    ]);

    const [menuResult, categoryResult] = results;
    const failed = [];

    if (menuResult.status === "fulfilled") {
      setMenuItems(getList(menuResult.value));
    } else {
      failed.push("menu items");
    }

    if (categoryResult.status === "fulfilled") {
      setCategories(getList(categoryResult.value));
    } else {
      failed.push("categories");
    }

    if (failed.length) {
      setError(
        `Unable to load ${failed.join(" and ")}. Please refresh and try again.`
      );
    }

    if (showLoader) setLoading(false);

    return failed.length === 0;
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return menuItems.filter((item) => {
      const itemName = String(item.name || item.title || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();
      const categoryId = getId(item.category);

      const matchesSearch =
        !query ||
        itemName.includes(query) ||
        description.includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        categoryId === categoryFilter;

      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" &&
          item.isAvailable === true) ||
        (availabilityFilter === "unavailable" &&
          item.isAvailable !== true);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesAvailability
      );
    });
  }, [menuItems, search, categoryFilter, availabilityFilter]);

  const openCreateForm = () => {
    setSelectedItem(null);
    setError("");
    setNotice("");
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setSelectedItem(item);
    setError("");
    setNotice("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedItem(null);
  };

const handleSave = async (payload) => {
  setError("");
  setNotice("");

  try {
    const itemId = selectedItem?._id || selectedItem?.id;

    if (selectedItem && itemId) {
      await updateMenuItem(itemId, payload);
      setNotice("Menu item updated successfully.");
    } else {
      await createMenuItem(payload);
      setNotice("Menu item created successfully.");
    }

    closeForm();
    await loadData(false);
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Unable to save the menu item. Please try again.";

    setError(message);
  }
};

  const handleAvailabilityChange = async (id, isAvailable) => {
    if (!id) return;

    setUpdatingId(id);
    setError("");
    setNotice("");

    try {
      await updateMenuItemAvailability(id, isAvailable);

      setMenuItems((current) =>
        current.map((item) =>
          (item._id || item.id) === id
            ? { ...item, isAvailable }
            : item
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
          "Unable to update availability. Please try again."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const id = deleteTarget._id || deleteTarget.id;

    if (!id) {
      setError("Unable to identify the menu item.");
      setDeleteTarget(null);
      return;
    }

    setDeleting(true);
    setError("");
    setNotice("");

    try {
      await deleteMenuItem(id);

      setMenuItems((current) =>
        current.filter((item) => (item._id || item.id) !== id)
      );

      setNotice("Menu item deleted successfully.");
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to delete the menu item. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const availableCount = menuItems.filter(
    (item) => item.isAvailable === true
  ).length;

  return (
    <div className="min-h-screen  p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Menu Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create, update, and manage restaurant menu items.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
              onClick={openCreateForm}
              className="rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              + Add Menu Item
            </button>
          </div>
        </header>

        {error && (
          <ErrorState
            message={error}
            onRetry={() => loadData()}
          />
        )}

        {notice && !error && (
          <div
            role="status"
            className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            {notice}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Total Menu Items</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {menuItems.length}
            </p>
          </div>

          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Available Items</p>
            <p className="mt-2 text-2xl font-semibold text-green-700">
              {availableCount}
            </p>
          </div>

          <div className="rounded border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Unavailable Items</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">
              {menuItems.length - availableCount}
            </p>
          </div>
        </div>

     {showForm && (
  <MenuItemForm
    item={selectedItem}
    categories={categories}
    onSubmit={handleSave}
    onCancel={closeForm}
  />
)}

        <section className="rounded border border-gray-200 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                htmlFor="menu-search"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Search Menu
              </label>

              <input
                id="menu-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or description..."
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="menu-category-filter"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Category
              </label>

              <select
                id="menu-category-filter"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
                className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
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
            </div>

            <div>
              <label
                htmlFor="menu-availability-filter"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Availability
              </label>

              <select
                id="menu-availability-filter"
                value={availabilityFilter}
                onChange={(event) =>
                  setAvailabilityFilter(event.target.value)
                }
                className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              >
                <option value="all">All Items</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">
              Showing {filteredItems.length} of {menuItems.length} items
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setAvailabilityFilter("all");
              }}
              className="rounded px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Clear Filters
            </button>
          </div>
        </section>

        {loading ? (
          <LoadingState message="Loading menu items..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={
              menuItems.length === 0
                ? "No Menu Items Yet"
                : "No Matching Menu Items"
            }
            description={
              menuItems.length === 0
                ? "Create your first menu item to start building your restaurant menu."
                : "Try changing your search or filters."
            }
            actionLabel={
              menuItems.length === 0 ? "Add Menu Item" : undefined
            }
            onAction={
              menuItems.length === 0 ? openCreateForm : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item._id || item.id}
                item={item}
                onEdit={openEditForm}
                onDelete={(target) => setDeleteTarget(target)}
                onAvailabilityChange={handleAvailabilityChange}
                updating={
                  updatingId === (item._id || item.id)
                }
              />
            ))}
          </div>
        )}

        <ConfirmDialog
          open={Boolean(deleteTarget)}
          title="Delete Menu Item"
          message={`Are you sure you want to delete "${
            deleteTarget?.name || deleteTarget?.title || "this item"
          }"? This action cannot be undone.`}
          confirmLabel="Delete Item"
          cancelLabel="Keep Item"
          destructive
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleting) setDeleteTarget(null);
          }}
        />
      </div>
    </div>
  );
}
