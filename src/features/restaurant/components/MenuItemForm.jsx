import { useEffect, useMemo, useState } from "react";
import {
  createMenuItem,
  updateMenuItem,
} from "../services/restaurant.service";

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "egg", label: "Contains Egg" },
];


const legacyDietaryMap = {
  veg: "vegetarian",
  non_veg: "non_vegetarian",
};

const normalizeDietaryType = (value) =>
  legacyDietaryMap[value] || value || "vegetarian";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; 
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];


const getExistingImages = (item) => {
  const raw =
    Array.isArray(item?.images) && item.images.length
      ? item.images
      : [item?.image || item?.imageUrl].filter(Boolean);

  return raw
    .map((img) =>
      typeof img === "string"
        ? { url: img, publicId: "" }
        : { url: img?.url || "", publicId: img?.publicId || "" }
    )
    .filter((img) => img.url);
};

const getInitialForm = (item) => ({
  name: item?.title || item?.name || "",
  description: item?.description || "",
  category:
    typeof item?.category === "object"
      ? item.category?._id || item.category?.id || ""
      : item?.category || "",
  price: String(item?.price ?? ""),
  dietaryType: normalizeDietaryType(item?.dietaryType),
  isAvailable: item?.isAvailable !== false,
});

export default function MenuItemForm({
  item = null,
  categories = [],
  onSuccess,
  onCancel,
}) {
  const [form, setForm] = useState(() => getInitialForm(item));
  const [existingImages, setExistingImages] = useState(() =>
    getExistingImages(item)
  );
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(item?._id || item?.id);

  useEffect(() => {
    setForm(getInitialForm(item));
    setExistingImages(getExistingImages(item));
    setNewFiles([]);
    setError("");
  }, [item]);

  
  const previews = useMemo(
    () =>
      newFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [newFiles]
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews]
  );

  const totalImages = existingImages.length + newFiles.length;

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = ""; 
    setError("");

    if (!files.length) return;

    if (totalImages + files.length > MAX_IMAGES) {
      setError(`You can add up to ${MAX_IMAGES} images per item.`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Only JPG, PNG or WEBP images are allowed.");
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError(`"${file.name}" is larger than 5MB.`);
        return;
      }
    }

    setNewFiles((current) => [...current, ...files]);
  };

  const removeExistingImage = (index) => {
    setExistingImages((current) => current.filter((_, i) => i !== index));
  };

  const removeNewFile = (index) => {
    setNewFiles((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const title = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);

    if (!title) {
      setError("Menu item title is required.");
      return;
    }

    if (title.length > 150) {
      setError("Menu item title must not exceed 150 characters.");
      return;
    }

    if (!form.category) {
      setError("Please select a category.");
      return;
    }

    if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) {
      setError("Enter a valid price greater than or equal to zero.");
      return;
    }

    if (!DIETARY_OPTIONS.some((option) => option.value === form.dietaryType)) {
      setError("Please select a valid dietary type.");
      return;
    }

    
    const body = new FormData();
    body.append("title", title);
    body.append("description", description);
    body.append("category", form.category);
    body.append("price", String(price));
    body.append("dietaryType", form.dietaryType);
    body.append("isAvailable", String(form.isAvailable));    
    body.append("existingImages", JSON.stringify(existingImages));
    newFiles.forEach((file) => body.append("images", file));

    setSaving(true);

    try {
      let result;

      if (isEditing) {
        result = await updateMenuItem(item._id || item.id, body);
      } else {
        result = await createMenuItem(body);
      }

      setError("");
      onSuccess?.(result);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to save the menu item. Please check the details."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? "Edit Menu Item" : "Create Menu Item"}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter the food or drink details below.
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
            htmlFor="menu-item-name"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Item Title *
          </label>
          <input
            id="menu-item-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Paneer Tikka"
            maxLength={150}
            required
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />       
        </div>

        <div>
          <label
            htmlFor="menu-item-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="menu-item-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the item and its ingredients..."
            rows={3}
            maxLength={2000}
            className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="menu-item-category"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Category *
            </label>
            <select
              id="menu-item-category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
            >
              <option value="">Select category</option>
              {categories
                .filter((category) => category.isActive !== false)
                .map((category) => (
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
              htmlFor="menu-item-price"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Price (INR) *
            </label>
            <input
              id="menu-item-price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
              required
              className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
            />
          </div>
        </div>

        
        <div>
          <label
            htmlFor="menu-item-images"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Images{" "}
            <span className="font-normal text-gray-500">
              ({totalImages}/{MAX_IMAGES})
            </span>
          </label>

          <input
            id="menu-item-images"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFilesChange}
            disabled={saving || totalImages >= MAX_IMAGES}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG or WEBP, up to 5MB each.
          </p>

          {(existingImages.length > 0 || previews.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-3">
              {existingImages.map((image, index) => (
                <div key={`${image.url}-${index}`} className="relative">
                  <img
                    src={image.url}
                    alt={`Menu item ${index + 1}`}
                    className="h-24 w-24 rounded border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    disabled={saving}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}

              {previews.map((preview, index) => (
                <div key={preview.url} className="relative">
                  <img
                    src={preview.url}
                    alt={`New upload ${index + 1}`}
                    className="h-24 w-24 rounded border border-dashed border-gray-400 object-cover"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-gray-900/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    New
                  </span>
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    disabled={saving}
                    aria-label="Remove image"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="menu-item-dietary"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Dietary Type
          </label>
          <select
            id="menu-item-dietary"
            name="dietaryType"
            value={form.dietaryType}
            onChange={handleChange}
            className="w-full rounded border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-500"
          >
            {DIETARY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 rounded border border-gray-200 p-3">
          <input
            type="checkbox"
            name="isAvailable"
            checked={form.isAvailable}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 accent-gray-900"
          />
          <span className="text-sm font-medium text-gray-700">
            Available for ordering
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
                : "Create Menu Item"}
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