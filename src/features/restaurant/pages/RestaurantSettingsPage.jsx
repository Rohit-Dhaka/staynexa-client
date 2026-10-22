
import { useCallback, useEffect, useState } from "react";
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
          "Unable to load restaurant settings."
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
      !Number.isFinite(taxPercent) ||
      taxPercent < 0 ||
      taxPercent > 100
    ) {
      setError("Tax percentage must be between 0 and 100.");
      return;
    }

    if (
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
          "Unable to update restaurant settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen  p-6 lg:p-8">
        <div className="mx-auto max-w-4xl rounded border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          Loading restaurant settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="mx-auto  space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Restaurant Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure restaurant details, charges, and order availability.
          </p>
        </header>

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

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded border border-gray-200 bg-white p-5 sm:p-7"
        >
          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                General Information
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Basic restaurant details 
              </p>
            </div>

            <div>
              <label
                htmlFor="restaurant-name"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Restaurant Name *
              </label>
              <input
                id="restaurant-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Enter restaurant name"
                className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
              />
            </div>

        
          </section>

          <div className="border-t border-gray-100" />

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Charges and Tax
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure the percentages applied to restaurant orders.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="restaurant-tax"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                  value={form.taxPercent}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="restaurant-service-charge"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
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
                  value={form.serviceChargePercent}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>

            <p className="rounded  p-3 text-xs leading-5 text-gray-500">
              The backend must apply these settings when calculating an order.
              Changing a percentage here does not automatically update order
              calculations unless the service uses these fields.
            </p>
          </section>

          <div className="border-t border-gray-100" />

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Order Availability
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Choose which ordering methods the restaurant accepts.
              </p>
            </div>

            {[
              {
                name: "allowDineIn",
                title: "Dine-in",
                description: "Allow guests to order for restaurant tables.",
              },
              {
                name: "allowTakeaway",
                title: "Takeaway",
                description: "Allow takeaway orders.",
              },
              {
                name: "allowRoomService",
                title: "Room Service",
                description: "Allow orders delivered to guest rooms.",
              },
         
            ].map((setting) => (
              <label
                key={setting.name}
                className="flex cursor-pointer items-start gap-3 rounded border border-gray-200 p-4"
              >
                <input
                  type="checkbox"
                  name={setting.name}
                  checked={form[setting.name]}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-gray-900"
                />

                <span className="flex-1">
                  <span className="block text-sm font-medium text-gray-900">
                    {setting.title}
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {setting.description}
                  </span>
                </span>
              </label>
            ))}
          </section>

          <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving Settings..." : "Save Settings"}
            </button>

            <button
              type="button"
              onClick={loadSettings}
              disabled={saving}
              className="rounded border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover: disabled:opacity-50"
            >
              Reset Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
