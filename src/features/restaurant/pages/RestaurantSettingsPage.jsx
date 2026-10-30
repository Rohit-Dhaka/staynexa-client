import { useCallback, useEffect, useState } from "react";
import {
  Save,
  RotateCcw,
  Settings2,
  ReceiptText,
  Utensils,
  Truck,
  BedDouble,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import {
  getRestaurantSettings,
  updateRestaurantSettings,
} from "../services/restaurant.service";

const initialForm = {
  name: "",
  taxPercent: "0",
  serviceChargePercent: "0",
  allowDineIn: true,
  allowTakeaway: true,
  allowRoomService: false,
  isActive: true,
};

function extractSettings(result) {
  if (result?.settings && typeof result.settings === "object") {
    return result.settings;
  }

  if (result?.data && typeof result.data === "object") {
    return result.data;
  }

  return result || {};
}

const inputClasses =
  "w-full min-w-0 rounded border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-gray-400";

function SectionHeading({ title, description, icon: Icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-600">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-gray-900 sm:text-base">
          {title}
        </h2>
        <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function RestaurantSettingsPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = await getRestaurantSettings();
      const settings = extractSettings(result);

      setForm({
        name: settings.name || "",
        taxPercent: String(settings.taxPercent ?? 0),
        serviceChargePercent: String(settings.serviceChargePercent ?? 0),
        allowDineIn: settings.allowDineIn !== false,
        allowTakeaway: settings.allowTakeaway !== false,
        allowRoomService: settings.allowRoomService === true,
        isActive: settings.isActive !== false,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load restaurant settings.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (event) => {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const taxPercent = Number(form.taxPercent);
    const serviceChargePercent = Number(form.serviceChargePercent);

    if (!form.name.trim()) {
      setError("Restaurant name is required.");
      return;
    }

    if (
      form.taxPercent.trim() === "" ||
      !Number.isFinite(taxPercent) ||
      taxPercent < 0 ||
      taxPercent > 100
    ) {
      setError("Tax percentage must be between 0 and 100.");
      return;
    }

    if (
      form.serviceChargePercent.trim() === "" ||
      !Number.isFinite(serviceChargePercent) ||
      serviceChargePercent < 0 ||
      serviceChargePercent > 100
    ) {
      setError("Service charge percentage must be between 0 and 100.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      taxPercent,
      serviceChargePercent,
      allowDineIn: form.allowDineIn,
      allowTakeaway: form.allowTakeaway,
      allowRoomService: form.allowRoomService,
      isActive: form.isActive,
    };

    setSaving(true);

    try {
      await updateRestaurantSettings(payload);
      setSuccess("Restaurant settings updated successfully.");
      await loadSettings();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to update restaurant settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-w-0 p-3 sm:p-4 lg:p-6">
        <div className="mx-auto max-w-4xl rounded border border-gray-200 bg-white p-6 text-center sm:p-10">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-gray-500">
            <Settings2 size={20} />
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Loading restaurant settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 ">
      <div className="mx-auto  space-y-4 sm:space-y-5">
        
        <header className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
            Restaurant Settings
          </h1>
          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
            Configure restaurant details, charges, and order availability.
          </p>
        </header>

        
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 break-words">{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 sm:p-4"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 break-words">{success}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-5 rounded border border-gray-200 bg-white p-3 sm:space-y-6 sm:p-5 lg:p-6"
        >
        
          <section className="space-y-4">
            <SectionHeading
              title="General Information"
              description="Basic restaurant details."
              icon={Settings2}
            />

            <div>
              <label
                htmlFor="restaurant-name"
                className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm"
              >
                Restaurant Name <span className="text-red-600">*</span>
              </label>

              <input
                id="restaurant-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Enter restaurant name"
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-gray-400">
                Maximum 150 characters.
              </p>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          
          <section className="space-y-4">
            <SectionHeading
              title="Charges and Tax"
              description="Configure percentages applied to restaurant orders."
              icon={ReceiptText}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <label
                  htmlFor="restaurant-tax"
                  className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm"
                >
                  Tax Percentage (%)
                </label>
                <input
                  id="restaurant-tax"
                  name="taxPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={form.taxPercent}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor="restaurant-service-charge"
                  className="mb-1.5 block text-xs font-medium text-gray-700 sm:text-sm"
                >
                  Service Charge (%)
                </label>
                <input
                  id="restaurant-service-charge"
                  name="serviceChargePercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={form.serviceChargePercent}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs leading-5 text-amber-800">
                These settings must also be applied by the backend when
                calculating order totals. Updating percentages here does not
                change existing orders automatically.
              </p>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          
          <section className="space-y-4">
            <SectionHeading
              title="Order Availability"
              description="Choose which ordering methods the restaurant accepts."
              icon={Utensils}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  name: "allowDineIn",
                  title: "Dine-in",
                  description: "Allow guests to order at restaurant tables.",
                  icon: Utensils,
                },
                {
                  name: "allowTakeaway",
                  title: "Takeaway",
                  description: "Accept takeaway orders.",
                  icon: Truck,
                },
                {
                  name: "allowRoomService",
                  title: "Room Service",
                  description: "Allow orders delivered to guest rooms.",
                  icon: BedDouble,
                },
              ].map((setting) => {
                const Icon = setting.icon;

                return (
                  <label
                    key={setting.name}
                    className="flex min-w-0 cursor-pointer items-start gap-3 rounded border border-gray-200 p-3 sm:p-4"
                  >
                    <input
                      type="checkbox"
                      name={setting.name}
                      checked={form[setting.name]}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 shrink-0 rounded accent-gray-900"
                    />

                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      <Icon
                        size={17}
                        className="mt-0.5 shrink-0 text-gray-500"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-gray-900">
                          {setting.title}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          {setting.description}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          
          <section className="flex min-w-0 items-start gap-3 rounded border border-gray-200 p-3 sm:p-4">
            <input
              id="restaurant-active"
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="mt-1 h-4 w-4 shrink-0 rounded accent-gray-900"
            />

            <label htmlFor="restaurant-active" className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-gray-900">
                Restaurant Active
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-500">
                Enable or disable the restaurant according to your operational
                requirements.
              </span>
            </label>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                form.isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {form.isActive ? "Active" : "Inactive"}
            </span>
          </section>

          
          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end sm:pt-5">
            <button
              type="button"
              onClick={loadSettings}
              disabled={saving || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <RotateCcw size={16} />
              Reset Changes
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <Save size={16} />
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
