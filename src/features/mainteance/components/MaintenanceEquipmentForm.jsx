import { useEffect, useState } from "react";
import {
  Package,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Save,
  LoaderCircle,
  X,
} from "lucide-react";

const INITIAL_FORM = {
  equipmentCode: "",
  name: "",
  category: "air_conditioner",
  room: "",
  location: "",
  brand: "",
  modelNumber: "",
  serialNumber: "",
  purchaseDate: "",
  purchaseCost: "",
  estimatedReplacementCost: "",
  priority: "medium",
  warrantyStartDate: "",
  warrantyEndDate: "",
  warrantyProvider: "",
  warrantyTerms: "",
  notes: "",
};

const CATEGORIES = [
  { value: "air_conditioner", label: "Air Conditioning" },
  { value: "geyser", label: "Water Heater" },
  { value: "television", label: "Television" },
  { value: "refrigerator", label: "Refrigerator" },
  { value: "lift", label: "Elevator / Lift" },
  { value: "electrical", label: "Electrical Equipment" },
  { value: "plumbing", label: "Plumbing Equipment" },
  { value: "furniture", label: "Furniture" },
  { value: "kitchen_equipment", label: "Kitchen Equipment" },
  { value: "laundry_equipment", label: "Laundry Equipment" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const inputClass =
  "w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const errorClass = "mt-1.5 text-xs font-medium text-red-600";

function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
  step,
  error,
  disabled = false,
  children,
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children || (
        <input
          id={name}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          step={step}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={inputClass}
        />
      )}

      {error && (
        <p id={`${name}-error`} className={errorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-blue-100 bg-black text-blue-700">
        <Icon size={19} />
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function FormSection({ children }) {
  return (
    <section className="rounded border border-slate-200 p-4 sm:p-5">
      {children}
    </section>
  );
}

function toDateInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  // Use local date components to avoid shifting a date due to UTC conversion.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialForm(equipment) {
  if (!equipment) return { ...INITIAL_FORM };

  const warranty = equipment.warranty || {};
  const categoryValue =
    equipment.equipmentCategory || equipment.category || "other";

  return {
    ...INITIAL_FORM,
    equipmentCode: equipment.equipmentCode || "",
    name: equipment.equipmentName || equipment.name || "",
    category: CATEGORIES.some((item) => item.value === categoryValue)
      ? categoryValue
      : "other",
    room:
      typeof equipment.room === "object"
        ? equipment.room?._id || equipment.room?.id || ""
        : equipment.room || "",
    location: equipment.location || "",
    brand: equipment.brand || "",
    modelNumber: equipment.modelNumber || "",
    serialNumber: equipment.serialNumber || "",
    purchaseDate: toDateInput(equipment.purchaseDate),
    purchaseCost: equipment.purchaseCost ?? "",
    estimatedReplacementCost: equipment.estimatedReplacementCost ?? "",
    priority: PRIORITIES.some((item) => item.value === equipment.priority)
      ? equipment.priority
      : "medium",
    warrantyStartDate: toDateInput(
      warranty.startDate || equipment.warrantyStartDate
    ),
    warrantyEndDate: toDateInput(
      warranty.endDate || equipment.warrantyEndDate
    ),
    warrantyProvider: warranty.provider || equipment.warrantyProvider || "",
    warrantyTerms:
      warranty.coverageDetails ||
      warranty.terms ||
      equipment.warrantyTerms ||
      "",
    notes: equipment.notes || "",
  };
}

function getRoomId(room) {
  return room?._id || room?.id || "";
}

function getRoomLabel(room) {
  return (
    room?.roomNumber ||
    room?.roomName ||
    room?.name ||
    room?.number ||
    getRoomId(room)
  );
}

export default function MaintenanceEquipmentForm({
  open = true,
  equipment = null,
  rooms = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(equipment));
  const [errors, setErrors] = useState({});

  const isEditing = Boolean(equipment?._id || equipment?.id);

  useEffect(() => {
    setForm(getInitialForm(equipment));
    setErrors({});
  }, [equipment, open]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "", form: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Equipment name is required.";
    }

    if (!form.equipmentCode.trim()) {
      nextErrors.equipmentCode = "Equipment code is required.";
    }

    if (!CATEGORIES.some((item) => item.value === form.category)) {
      nextErrors.category = "Please select a valid category.";
    }

    if (
      form.purchaseCost !== "" &&
      (!Number.isFinite(Number(form.purchaseCost)) ||
        Number(form.purchaseCost) < 0)
    ) {
      nextErrors.purchaseCost = "Enter a valid purchase cost of zero or more.";
    }

    if (
      form.estimatedReplacementCost !== "" &&
      (!Number.isFinite(Number(form.estimatedReplacementCost)) ||
        Number(form.estimatedReplacementCost) < 0)
    ) {
      nextErrors.estimatedReplacementCost =
        "Enter a valid replacement cost of zero or more.";
    }

    if (
      form.warrantyStartDate &&
      form.warrantyEndDate &&
      form.warrantyEndDate < form.warrantyStartDate
    ) {
      nextErrors.warrantyEndDate =
        "Warranty end date must be on or after the start date.";
    }

    if (
      form.purchaseDate &&
      form.warrantyStartDate &&
      form.warrantyStartDate < form.purchaseDate
    ) {
      nextErrors.warrantyStartDate =
        "Warranty start date cannot be before the purchase date.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validate()) return;

    // Map frontend form names to the field names expected by the backend validator.
    const payload = {
      ...(!isEditing ? { equipmentCode: form.equipmentCode.trim() } : {}),
      equipmentName: form.name.trim(),
      equipmentCategory: form.category,
      ...(form.room ? { room: form.room } : {}),
      location: form.location.trim(),
      brand: form.brand.trim(),
      modelNumber: form.modelNumber.trim(),
      serialNumber: form.serialNumber.trim(),
      ...(form.purchaseDate ? { purchaseDate: form.purchaseDate } : {}),
      purchaseCost:
        form.purchaseCost === "" ? 0 : Number(form.purchaseCost),
      estimatedReplacementCost:
        form.estimatedReplacementCost === ""
          ? 0
          : Number(form.estimatedReplacementCost),
      priority: form.priority,
      warranty: {
        ...(form.warrantyProvider.trim()
          ? { provider: form.warrantyProvider.trim() }
          : {}),
        ...(form.warrantyStartDate
          ? { startDate: form.warrantyStartDate }
          : {}),
        ...(form.warrantyEndDate
          ? { endDate: form.warrantyEndDate }
          : {}),
        ...(form.warrantyTerms.trim()
          ? { coverageDetails: form.warrantyTerms.trim() }
          : {}),
      },
      notes: form.notes.trim(),
    };

    // Avoid sending an empty warranty object if no warranty fields were entered.
    if (Object.keys(payload.warranty).length === 0) {
      delete payload.warranty;
    }

    try {
      await onSubmit?.(payload, equipment);
    } catch (error) {
      setErrors((current) => ({
        ...current,
        form:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save equipment. Please try again.",
      }));
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  return (
    <section
      aria-labelledby="equipment-form-title"
      className="w-full overflow-hidden rounded border border-slate-200 bg-white"
    >
      <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-blue-100 bg-black text-blue-700">
            <Package size={21} />
          </div>

          <div className="min-w-0">
            <h2 id="equipment-form-title" className="text-lg font-bold text-slate-900">
              {isEditing ? "Edit Equipment" : "Add New Equipment"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditing
                ? "Update equipment information and maintenance details."
                : "Register equipment and keep its maintenance information organized."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          disabled={saving}
          aria-label="Close equipment form"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <X size={19} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 p-4 sm:p-6">
          {errors.form && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <span className="mt-0.5 font-bold">!</span>
              <p>{errors.form}</p>
            </div>
          )}

          <FormSection>
            <SectionHeading
              icon={Package}
              title="Basic Information"
              description="Identify the equipment and classify it correctly."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Equipment Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Room Air Conditioner"
                required
                error={errors.name}
                disabled={saving}
              />

              <FormField
                label="Equipment Code"
                name="equipmentCode"
                value={form.equipmentCode}
                onChange={handleChange}
                placeholder="e.g. EQ-001"
                required
                error={errors.equipmentCode}
                disabled={saving}
              />

              <FormField
                label="Category"
                name="category"
                required
                error={errors.category}
                disabled={saving}
              >
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  aria-invalid={Boolean(errors.category)}
                  className={inputClass}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Priority" name="priority" disabled={saving}>
                <select
                  id="priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  disabled={saving}
                  className={inputClass}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          </FormSection>

          {/* <FormSection>
            <SectionHeading
              icon={MapPin}
              title="Location Information"
              description="Specify where the equipment is installed."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Room" name="room" disabled={saving}>
                <select
                  id="room"
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">No room assigned</option>
                  {rooms.map((room, index) => {
                    const roomId = getRoomId(room);
                    if (!roomId) return null;

                    return (
                      <option key={roomId || index} value={roomId}>
                        {getRoomLabel(room)}
                      </option>
                    );
                  })}
                </select>
              </FormField>

              <FormField
                label="Location / Area"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="e.g. Second Floor, Room 204"
                disabled={saving}
              />
            </div>
          </FormSection> */}

          <FormSection>
            <SectionHeading
              icon={Package}
              title="Manufacturer Details"
              description="Record the equipment's model and serial information."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Brand"
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="e.g. Samsung"
                disabled={saving}
              />

              <FormField
                label="Model Number"
                name="modelNumber"
                value={form.modelNumber}
                onChange={handleChange}
                placeholder="Enter model number"
                disabled={saving}
              />

              <FormField
                label="Serial Number"
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="Enter serial number"
                disabled={saving}
              />
            </div>
          </FormSection>

          <FormSection>
            <SectionHeading
              icon={CalendarDays}
              title="Purchase Information"
              description="Track the acquisition date and equipment value."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Purchase Date"
                name="purchaseDate"
                type="date"
                value={form.purchaseDate}
                onChange={handleChange}
                disabled={saving}
              />

              <FormField
                label="Purchase Cost (INR)"
                name="purchaseCost"
                type="number"
                value={form.purchaseCost}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                error={errors.purchaseCost}
                disabled={saving}
              />

              <FormField
                label="Estimated Replacement Cost (INR)"
                name="estimatedReplacementCost"
                type="number"
                value={form.estimatedReplacementCost}
                onChange={handleChange}
                placeholder="0.00"
                min="0"
                step="0.01"
                error={errors.estimatedReplacementCost}
                disabled={saving}
              />
            </div>
          </FormSection>

          <FormSection>
            <SectionHeading
              icon={ShieldCheck}
              title="Warranty Information"
              description="Keep track of warranty coverage and expiry dates."
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Warranty Provider"
                name="warrantyProvider"
                value={form.warrantyProvider}
                onChange={handleChange}
                placeholder="e.g. Manufacturer"
                disabled={saving}
              />

              <FormField
                label="Warranty Start Date"
                name="warrantyStartDate"
                type="date"
                value={form.warrantyStartDate}
                onChange={handleChange}
                error={errors.warrantyStartDate}
                disabled={saving}
              />

              <FormField
                label="Warranty End Date"
                name="warrantyEndDate"
                type="date"
                value={form.warrantyEndDate}
                onChange={handleChange}
                error={errors.warrantyEndDate}
                disabled={saving}
              />

              <div className="md:col-span-2">
                <FormField
                  label="Warranty Terms"
                  name="warrantyTerms"
                  disabled={saving}
                >
                  <textarea
                    id="warrantyTerms"
                    name="warrantyTerms"
                    value={form.warrantyTerms}
                    onChange={handleChange}
                    rows={3}
                    disabled={saving}
                    placeholder="Enter warranty coverage and conditions"
                    className={`${inputClass} resize-y`}
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          <FormSection>
            <SectionHeading
              icon={ShieldCheck}
              title="Additional Notes"
              description="Add useful operational or maintenance information."
            />

            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              disabled={saving}
              placeholder="Enter additional notes..."
              className={`${inputClass} resize-y`}
            />
          </FormSection>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={16} />
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={17} />
                {isEditing ? "Update Equipment" : "Save Equipment"}
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
