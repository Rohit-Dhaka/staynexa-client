
import { useEffect, useState } from "react";
import {
  X,
  AlertTriangle,
  Wrench,
  CalendarDays,
  FileText,
  Send,
  LoaderCircle,
  MapPin,
  Package,
} from "lucide-react";

const INITIAL_FORM = {
  issueTitle: "",
  issueDescription: "",
  priority: "medium",
  equipmentStatus: "under_maintenance",
  reportedBy: "",
  reportedDate: new Date().toISOString().slice(0, 10),
  estimatedCost: "",
  remarks: "",
};

const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    description: "Can be handled during routine maintenance.",
    color: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Requires attention but is not urgent.",
    color: "border-blue-200 bg-black text-blue-700",
  },
  {
    value: "high",
    label: "High",
    description: "Needs prompt attention to prevent disruption.",
    color: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "critical",
    label: "Critical",
    description: "Immediate attention is required.",
    color: "border-red-200 bg-red-50 text-red-700",
  },
];

const inputClass =
  "w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700";

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

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
        className={inputClass}
      />
    </div>
  );
}

export default function MaintenanceIssueForm({
  open = true,
  equipment = null,
  saving = false,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;

    setForm({
      ...INITIAL_FORM,
      issueTitle: "",
      issueDescription: "",
      priority: equipment?.priority || "medium",
      equipmentStatus: "under_maintenance",
      reportedBy: "",
      reportedDate: new Date().toISOString().slice(0, 10),
      estimatedCost: "",
      remarks: "",
    });

    setErrors({});
  }, [open, equipment?._id]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
      form: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.issueTitle.trim()) {
      nextErrors.issueTitle = "Issue title is required.";
    }

    if (!form.issueDescription.trim()) {
      nextErrors.issueDescription =
        "Please describe the problem.";
    }

    if (!form.reportedDate) {
      nextErrors.reportedDate = "Report date is required.";
    }

    if (
      form.estimatedCost !== "" &&
      Number(form.estimatedCost) < 0
    ) {
      nextErrors.estimatedCost =
        "Estimated cost cannot be negative.";
    }

    if (
      form.reportedDate &&
      form.reportedDate >
        new Date().toISOString().slice(0, 10)
    ) {
      nextErrors.reportedDate =
        "Report date cannot be in the future.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validate()) return;

    const payload = {
      issueTitle: form.issueTitle.trim(),
      issueDescription: form.issueDescription.trim(),
      priority: form.priority,
      equipmentStatus: form.equipmentStatus,
      reportedBy: form.reportedBy.trim(),
      reportedDate: form.reportedDate,
      estimatedCost:
        form.estimatedCost === ""
          ? undefined
          : Number(form.estimatedCost),
      remarks: form.remarks.trim(),
    };

    try {
      await onSubmit?.(payload, equipment);
    } catch (error) {
      setErrors({
        form:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to report the issue. Please try again.",
      });
    }
  };

  const selectedPriority = PRIORITIES.find(
    (priority) => priority.value === form.priority
  );

  const equipmentName =
    equipment?.name ||
    equipment?.equipmentName ||
    "Selected Equipment";

  const equipmentLocation =
    equipment?.location ||
    equipment?.room?.roomNumber ||
    equipment?.roomNumber ||
    "Location not specified";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose?.();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-issue-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded border border-slate-200 bg-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </div>

            <div>
              <h2
                id="maintenance-issue-title"
                className="text-lg font-bold text-slate-900"
              >
                Report Maintenance Issue
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Record an equipment problem for maintenance follow-up.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close issue form"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-6 sm:px-7">
            {errors.form && (
              <div
                role="alert"
                className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {errors.form}
              </div>
            )}

            {/* Equipment Summary */}
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600">
                  <Package size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">
                    Equipment
                  </p>

                  <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                    {equipmentName}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    {equipment?.equipmentCode && (
                      <span>
                        Code: {equipment.equipmentCode}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} />
                      {equipmentLocation}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Information */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText size={18} className="text-slate-500" />
                Issue Information
              </h3>

              <div className="space-y-4">
                <FormField
                  label="Issue Title"
                  name="issueTitle"
                  value={form.issueTitle}
                  onChange={handleChange}
                  placeholder="e.g. Air conditioner not cooling"
                  required
                />

                {errors.issueTitle && (
                  <p className="-mt-2 text-xs text-red-600">
                    {errors.issueTitle}
                  </p>
                )}

                <div>
                  <label
                    htmlFor="issueDescription"
                    className={labelClass}
                  >
                    Problem Description
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <textarea
                    id="issueDescription"
                    name="issueDescription"
                    value={form.issueDescription}
                    onChange={handleChange}
                    rows={4}
                    required
                    placeholder="Describe the issue, symptoms, and any impact on hotel operations..."
                    className={`${inputClass} resize-y`}
                  />

                  {errors.issueDescription && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.issueDescription}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    label="Reported By"
                    name="reportedBy"
                    value={form.reportedBy}
                    onChange={handleChange}
                    placeholder="Staff member name"
                  />

                  <FormField
                    label="Report Date"
                    name="reportedDate"
                    type="date"
                    value={form.reportedDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                {errors.reportedDate && (
                  <p className="-mt-2 text-xs text-red-600">
                    {errors.reportedDate}
                  </p>
                )}
              </div>
            </section>

            {/* Priority */}
            <section>
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <AlertTriangle size={18} className="text-slate-500" />
                Issue Priority
              </h3>

              <p className="mb-4 text-xs text-slate-500">
                Select the urgency level for this issue.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PRIORITIES.map((priority) => {
                  const selected =
                    form.priority === priority.value;

                  return (
                    <label
                      key={priority.value}
                      className={`flex cursor-pointer items-start gap-3 rounded border p-3.5 transition-colors ${
                        selected
                          ? "border-blue-500 bg-black"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={priority.value}
                        checked={selected}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 accent-blue-600"
                      />

                      <span className="min-w-0">
                        <span
                          className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${priority.color}`}
                        >
                          {priority.label}
                        </span>

                        <span className="mt-2 block text-xs leading-5 text-slate-500">
                          {priority.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              {selectedPriority && (
                <p className="mt-3 text-xs text-slate-500">
                  Selected priority:{" "}
                  <span className="font-semibold text-slate-700">
                    {selectedPriority.label}
                  </span>
                </p>
              )}
            </section>

            {/* Equipment Status */}
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wrench size={18} className="text-slate-500" />
                Equipment Status
              </h3>

              <label
                htmlFor="equipmentStatus"
                className={labelClass}
              >
                Status After Reporting
              </label>

              <select
                id="equipmentStatus"
                name="equipmentStatus"
                value={form.equipmentStatus}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="under_maintenance">
                  Under Maintenance
                </option>

                <option value="out_of_order">
                  Out of Order
                </option>

                <option value="operational">
                  Operational
                </option>
              </select>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Choose the current operational status. Reporting an issue
                does not automatically mean the equipment is unusable.
              </p>
            </section>

            {/* Estimated Cost */}
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Wrench size={18} className="text-slate-500" />
                Additional Information
              </h3>

              <div className="space-y-4">
                <FormField
                  label="Estimated Repair Cost (INR)"
                  name="estimatedCost"
                  type="number"
                  value={form.estimatedCost}
                  onChange={handleChange}
                  placeholder="Enter estimated cost"
                  min="0"
                  step="0.01"
                />

                {errors.estimatedCost && (
                  <p className="-mt-2 text-xs text-red-600">
                    {errors.estimatedCost}
                  </p>
                )}

                <div>
                  <label
                    htmlFor="remarks"
                    className={labelClass}
                  >
                    Additional Remarks
                  </label>

                  <textarea
                    id="remarks"
                    name="remarks"
                    value={form.remarks}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Any additional observations or instructions..."
                    className={`${inputClass} resize-y`}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3.5">
              <CalendarDays
                size={17}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <p className="text-xs leading-5 text-amber-800">
                After reporting, assign a technician and track the repair
                through the maintenance workflow.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !equipment?._id}
              className="inline-flex items-center justify-center gap-2 rounded bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={17} />
                  Submit Issue
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
