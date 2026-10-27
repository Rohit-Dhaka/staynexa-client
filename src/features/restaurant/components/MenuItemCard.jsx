const formatCurrency = (amount = 0, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getCategoryName = (category) => {
  if (typeof category === "object" && category !== null) {
    return category.name || category.title || "Uncategorized";
  }

  return "Uncategorized";
};


const getImageUrl = (item) => {
  const first = Array.isArray(item?.images) ? item.images[0] : null;

  if (typeof first === "string") return first;
  if (first?.url) return first.url;

  return item?.image || item?.imageUrl || "";
};


const getDietaryStyle = (type = "vegetarian") => {
  const styles = {
    vegetarian: "border-green-200 text-green-700",
    veg: "border-green-200 text-green-700",
    vegan: "border-emerald-200 text-emerald-700",
    non_vegetarian: "border-red-200 text-red-700",
    non_veg: "border-red-200 text-red-700",
    egg: "border-amber-200 text-amber-700",
  };

  return (
    styles[String(type).toLowerCase()] || "border-gray-200 text-gray-600"
  );
};

const formatLabel = (value = "") =>
  String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onAvailabilityChange,
  updating = false,
  currency = "INR",
}) {
  if (!item) return null;

  const itemId = item._id || item.id;
  const name = item.name || item.title || "Menu Item";
  const image = getImageUrl(item);
  const price = Number(item.price ?? item.basePrice ?? 0);
  const isAvailable = item.isAvailable !== false;
  const dietaryType = item.dietaryType || "vegetarian";

  return (
    <article className="overflow-hidden rounded border border-gray-200 bg-white transition-colors hover:border-gray-300">
      <div className="relative aspect-[16/10] bg-gray-100">
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="h-12 w-12 text-gray-400"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="3" />
              <circle cx="8.5" cy="9" r="1.5" />
              <path
                d="m21 15-5-5L5 20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full border bg-white px-2.5 py-1 text-xs font-medium ${
            isAvailable
              ? "border-green-200 text-green-700"
              : "border-red-200 text-red-700"
          }`}
        >
          {isAvailable ? "Available" : "Unavailable"}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-gray-900">
              {name}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {getCategoryName(item.category)}
            </p>
          </div>

          <span
            title={formatLabel(dietaryType)}
            className={`shrink-0 rounded border px-2 py-1 text-xs font-medium ${getDietaryStyle(
              dietaryType
            )}`}
          >
            {formatLabel(dietaryType)}
          </span>
        </div>

        {item.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-gray-600">
            {item.description}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(price, currency)}
          </p>

          {typeof onAvailabilityChange === "function" && (
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              aria-label={`Set ${name} ${
                isAvailable ? "unavailable" : "available"
              }`}
              disabled={updating}
              onClick={() => onAvailabilityChange(itemId, !isAvailable)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isAvailable ? "bg-green-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  isAvailable ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="mt-4 flex gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(item)}
                disabled={updating}
                className="flex-1 rounded border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
              >
                Edit
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                disabled={updating}
                className="flex-1 rounded border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}