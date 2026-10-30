import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CarFront,
  Check,
  CircleDollarSign,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Save,
  X,
} from "lucide-react";
import {
  getCabRates,
  updateCabRate,
  VEHICLE_TYPES,
} from "../services/cab.service";

const EMPTY_RATE = {
  airportFlatFare: 0,
  localPerHour: 0,
  localMinHours: 4,
  perKm: 0,
  outstationPerDay: 0,
  minimumFare: 0,
  nightChargePercent: 0,
  waitingPerHour: 0,
  taxPercent: 5,
  isActive: true,
};

const FIELD_CONFIG = [
  {
    name: "airportFlatFare",
    label: "Airport Flat Fare",
    description: "Fixed fare for airport pickup and drop.",
    min: 0,
    step: "0.01",
  },
  {
    name: "localPerHour",
    label: "Local Rate Per Hour",
    description: "Hourly rate for local trips.",
    min: 0,
    step: "0.01",
  },
  {
    name: "localMinHours",
    label: "Local Minimum Hours",
    description: "Minimum billable hours for local trips.",
    min: 1,
    step: "1",
  },
  {
    name: "perKm",
    label: "Rate Per Kilometer",
    description: "Rate per kilometer for applicable trips.",
    min: 0,
    step: "0.01",
  },
  {
    name: "outstationPerDay",
    label: "Outstation Rate Per Day",
    description: "Daily rate for outstation trips.",
    min: 0,
    step: "0.01",
  },
  {
    name: "minimumFare",
    label: "Minimum Fare",
    description: "Minimum fare charged for a trip.",
    min: 0,
    step: "0.01",
  },
  {
    name: "nightChargePercent",
    label: "Night Charge (%)",
    description: "Additional percentage for night trips.",
    min: 0,
    max: 100,
    step: "0.01",
  },
  {
    name: "waitingPerHour",
    label: "Waiting Charge Per Hour",
    description: "Charge for waiting time.",
    min: 0,
    step: "0.01",
  },
  {
    name: "taxPercent",
    label: "Tax (%)",
    description: "Applicable tax percentage.",
    min: 0,
    max: 100,
    step: "0.01",
  },
];

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded border px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function formatVehicleType(value) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getRateForm(rate) {
  return { ...EMPTY_RATE, ...(rate || {}), isActive: rate?.isActive !== false };
}

function createRatePayload(form, vehicleType) {
  const payload = { vehicleType, isActive: Boolean(form.isActive) };
  for (const field of FIELD_CONFIG)
    payload[field.name] = Number(form[field.name]);
  return payload;
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function normalizeRatesResponse(response) {
  const candidates = [
    response?.rates,
    response?.data?.rates,
    response?.data?.data?.rates,
    response?.data,
    response?.data?.data,
    response,
  ];
  return candidates.find(Array.isArray) || [];
}

export default function AdminCabRatesPage() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedType, setSelectedType] = useState(VEHICLE_TYPES[0]);
  const [form, setForm] = useState({ ...EMPTY_RATE });
  const [editing, setEditing] = useState(false);

  const loadRates = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");
      const response = await getCabRates(true);
      setRates(normalizeRatesResponse(response));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const rateMap = useMemo(
    () => Object.fromEntries(rates.map((rate) => [rate.vehicleType, rate])),
    [rates],
  );
  const selectedRate = rateMap[selectedType];

  useEffect(() => {
    setForm(getRateForm(selectedRate));
    setEditing(false);
    setActionError("");
  }, [selectedType, rates]);

  const filteredTypes = VEHICLE_TYPES.filter((type) => {
    const rate = rateMap[type];
    const matchesSearch = formatVehicleType(type)
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && rate?.isActive === true) ||
      (statusFilter === "inactive" && rate?.isActive === false) ||
      (statusFilter === "missing" && !rate);
    return matchesSearch && matchesStatus;
  });

  function handleFieldChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function validateForm() {
    for (const field of FIELD_CONFIG) {
      if (form[field.name] === "" || form[field.name] == null)
        return `${field.label} is required.`;
      const value = Number(form[field.name]);
      if (!Number.isFinite(value))
        return `${field.label} must be a valid number.`;
      if (value < field.min)
        return `${field.label} cannot be less than ${field.min}.`;
      if (field.max !== undefined && value > field.max)
        return `${field.label} cannot exceed ${field.max}.`;
    }
    return "";
  }

  async function handleSave(event) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setActionError(validationError);
      return;
    }
    try {
      setSaving(true);
      setActionError("");
      setNotice("");
      await updateCabRate(selectedType, createRatePayload(form, selectedType));
      setNotice(`${formatVehicleType(selectedType)} rates saved successfully.`);
      setEditing(false);
      await loadRates();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!selectedRate) return;
    const nextStatus = selectedRate.isActive === false;
    if (
      !window.confirm(
        `${nextStatus ? "Activate" : "Deactivate"} ${formatVehicleType(selectedType)} rates?`,
      )
    )
      return;
    try {
      setSaving(true);
      setActionError("");
      setNotice("");
      const payload = createRatePayload(
        getRateForm(selectedRate),
        selectedType,
      );
      payload.isActive = nextStatus;
      await updateCabRate(selectedType, payload);
      setNotice(
        `${formatVehicleType(selectedType)} rates ${nextStatus ? "activated" : "deactivated"} successfully.`,
      );
      setEditing(false);
      await loadRates();
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const activeCount = rates.filter((rate) => rate.isActive === true).length;
  const inactiveCount = rates.filter((rate) => rate.isActive === false).length;
  const missingCount = VEHICLE_TYPES.filter((type) => !rateMap[type]).length;

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
              <CarFront size={18} />
              Fleet Management
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cab Rate Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Configure fares, taxes and availability for each vehicle type.
            </p>
          </div>
          <button
            type="button"
            onClick={loadRates}
            disabled={loading || saving}
            className={`${buttonClass} border-slate-300 bg-white text-slate-700`}
          >
            <RefreshCw size={16} />
            Refresh Rates
          </button>
        </header>

        {(pageError || actionError) && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <span className="flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0" />
              {actionError || pageError}
            </span>
            <button
              type="button"
              onClick={() => {
                setPageError("");
                setActionError("");
              }}
              className="rounded p-1"
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <Check size={18} className="mt-0.5 shrink-0" />
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Vehicle Types",
              value: VEHICLE_TYPES.length,
              color: "text-slate-900",
            },
            {
              label: "Active Rate Cards",
              value: activeCount,
              color: "text-emerald-700",
            },
            {
              label: "Inactive Rate Cards",
              value: inactiveCount,
              color: "text-amber-700",
            },
            {
              label: "Missing Rate Cards",
              value: missingCount,
              color: "text-rose-700",
            },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Vehicle Types</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a vehicle to manage its rates.
              </p>
            </div>
            <label className="mb-3 block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Search Vehicle
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search vehicle type"
                className={inputClass}
              />
            </label>
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Rate Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="all">All Rate Cards</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="missing">Missing Rates</option>
              </select>
            </label>
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded border border-slate-200 p-6 text-sm text-slate-500">
                <LoaderCircle size={18} />
                Loading rates...
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTypes.map((type) => {
                  const rate = rateMap[type];
                  const selected = selectedType === type;
                  return (
                    <button
                      type="button"
                      key={type}
                      onClick={() => {
                        setSelectedType(type);
                        setNotice("");
                        setActionError("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded border p-3 text-left ${selected ? "border-indigo-300 bg-slate-100" : "border-slate-200 bg-white"}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-white text-slate-600">
                          <CarFront size={19} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {formatVehicleType(type)}
                          </span>
                          <span className="mt-1 block text-xs text-slate-500">
                            {rate
                              ? rate.isActive
                                ? "Rate card configured"
                                : "Inactive rate card"
                              : "Rates not configured"}
                          </span>
                        </span>
                      </span>
                      {rate ? (
                        <StatusBadge active={rate.isActive !== false} />
                      ) : (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                          Missing
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredTypes.length === 0 && (
                  <p className="rounded border border-slate-200 p-4 text-sm text-slate-500">
                    No matching vehicle types found.
                  </p>
                )}
              </div>
            )}
          </aside>

          <section className="min-w-0 rounded border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-indigo-600">
                  <CircleDollarSign size={18} />
                  Rate Configuration
                </div>
                <h2 className="text-xl font-bold">
                  {formatVehicleType(selectedType)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRate
                    ? "Review or update the configured rate card."
                    : "No rate card exists yet. Configure the rates below."}
                </p>
                <div className="mt-3">
                  {selectedRate ? (
                    <StatusBadge active={selectedRate.isActive !== false} />
                  ) : (
                    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(getRateForm(selectedRate));
                    setActionError("");
                    setNotice("");
                    setEditing(true);
                  }}
                  disabled={loading || saving}
                  className={`${buttonClass} border-slate-900 bg-slate-900 text-white`}
                >
                  <Pencil size={16} />
                  {selectedRate ? "Edit Rates" : "Configure Rates"}
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <LoaderCircle size={20} />
                Loading rate configuration...
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {FIELD_CONFIG.map((field) => (
                    <label key={field.name} className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-slate-800">
                        {field.label}
                      </span>
                      <input
                        type="number"
                        name={field.name}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        value={form[field.name] ?? ""}
                        onChange={handleFieldChange}
                        disabled={!editing || saving}
                        required
                        className={inputClass}
                      />
                      <span className="mt-1.5 block text-xs text-slate-500">
                        {field.description}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-6 rounded border border-slate-200 p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={Boolean(form.isActive)}
                      onChange={handleFieldChange}
                      disabled={!editing || saving}
                      className="mt-1 h-4 w-4 rounded border-slate-300 accent-indigo-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        Active Rate Card
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">
                        Active rates can be used for new guest fare estimates
                        and cab bookings.
                      </span>
                    </span>
                  </label>
                </div>
                <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Minimum Fare Preview
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(form.minimumFare)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This is the configured minimum fare. The final quote depends
                    on the backend pricing rules.
                  </p>
                </div>
                {editing && (
                  <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setForm(getRateForm(selectedRate));
                        setEditing(false);
                        setActionError("");
                      }}
                      disabled={saving}
                      className={`${buttonClass} border-slate-300 bg-white text-slate-700`}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className={`${buttonClass} border-slate-900 bg-slate-900 text-white`}
                    >
                      {saving ? <LoaderCircle size={16} /> : <Save size={16} />}
                      {saving ? "Saving..." : "Save Rate Card"}
                    </button>
                  </div>
                )}
              </form>
            )}
            {!editing && selectedRate && (
              <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">
                  {selectedRate.isActive
                    ? "This rate card is available for new bookings."
                    : "This rate card is hidden from guest rate selection."}
                </p>
                <button
                  type="button"
                  onClick={handleToggleStatus}
                  disabled={saving}
                  className={`${buttonClass} ${selectedRate.isActive ? "border-rose-200 bg-white text-rose-700" : "border-emerald-200 bg-white text-emerald-700"}`}
                >
                  {saving ? <LoaderCircle size={16} /> : <Check size={16} />}
                  {selectedRate.isActive ? "Deactivate Rate" : "Activate Rate"}
                </button>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
