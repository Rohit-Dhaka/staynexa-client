import { useCallback, useEffect, useMemo, useState } from "react";

import {

  Users,

  UserRound,

  Plus,

  Search,

  RefreshCw,

  Pencil,

  Trash2,

  X,

  Save,

  LoaderCircle,

  CheckCircle,

  AlertCircle,

  Phone,

  Mail,

  CreditCard,

  CalendarDays,

} from "lucide-react";

import {

  getCabDrivers,

  createCabDriver,

  updateCabDriver,

  deleteCabDriver,

} from "../services/cab.service";

const EMPTY_FORM = {

  name: "",

  phone: "",

  email: "",

  licenseNumber: "",

  licenseExpiry: "",

  address: "",

  isActive: true,

};

const inputClass =

  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50";

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

function getDriverId(driver) {

  return driver?._id || driver?.id;

}

function getDriverName(driver) {

  return (

    driver?.name ||

    driver?.fullName ||

    driver?.user?.name ||

    "Unnamed Driver"

  );

}

function getDriverStatus(driver) {

  return driver?.isActive !== false;

}

function getInitialForm(driver) {

  if (!driver) {

    return { ...EMPTY_FORM };

  }

  return {

    name: driver.name || driver.fullName || driver.user?.name || "",

    phone: driver.phone || driver.user?.phone || "",

    email: driver.email || driver.user?.email || "",

    licenseNumber: driver.licenseNumber || "",

    licenseExpiry: driver.licenseExpiry

      ? String(driver.licenseExpiry).slice(0, 10)

      : "",

    address: driver.address || "",

    isActive: driver.isActive !== false,

  };

}

function StatusBadge({ active }) {

  return (

    <span

      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${

        active

          ? "border-emerald-200 bg-emerald-50 text-emerald-700"

          : "border-slate-200 bg-slate-100 text-slate-600"

      }`}

    >

      <span

        className={`h-1.5 w-1.5 rounded-full ${

          active ? "bg-emerald-500" : "bg-slate-400"

        }`}

      />

      {active ? "Active" : "Inactive"}

    </span>

  );

}

function DriverModal({

  driver,

  saving,

  onClose,

  onSubmit,

}) {

  const [form, setForm] = useState(() => getInitialForm(driver));

  const [formError, setFormError] = useState("");

  function handleChange(event) {

    const { name, value, checked, type } = event.target;

    setForm((current) => ({

      ...current,

      [name]: type === "checkbox" ? checked : value,

    }));

  }

  function handleSubmit(event) {

    event.preventDefault();

    setFormError("");

    if (!form.name.trim()) {

      setFormError("Driver name is required.");

      return;

    }

    if (!form.phone.trim()) {

      setFormError("Phone number is required.");

      return;

    }

    if (!form.licenseNumber.trim()) {

      setFormError("Driving license number is required.");

      return;

    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {

      setFormError("Enter a valid email address.");

      return;

    }

    onSubmit({

      ...form,

      name: form.name.trim(),

      phone: form.phone.trim(),

      email: form.email.trim(),

      licenseNumber: form.licenseNumber.trim(),

      address: form.address.trim(),

      licenseExpiry: form.licenseExpiry || undefined,

    }).catch((error) => {

      setFormError(getErrorMessage(error));

    });

  }

  return (

    <div

      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"

      onMouseDown={(event) => {

        if (event.target === event.currentTarget && !saving) {

          onClose();

        }

      }}

    >

      <section

        role="dialog"

        aria-modal="true"

        aria-labelledby="driver-modal-title"

        className="my-auto w-full max-w-2xl rounded border border-slate-200 bg-white"

      >

        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">

              <UserRound size={18} />

              Driver Management

            </div>

            <h2

              id="driver-modal-title"

              className="text-xl font-bold text-slate-900"

            >

              {driver ? "Edit Driver" : "Add New Driver"}

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              Enter the driver's contact and license information.

            </p>

          </div>

          <button

            type="button"

            onClick={onClose}

            disabled={saving}

            aria-label="Close dialog"

            className="rounded border border-slate-200 p-2 text-slate-500"

          >

            <X size={18} />

          </button>

        </header>

        <form onSubmit={handleSubmit}>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Driver Name <span className="text-rose-600">\*</span>

              </span>

              <input

                name="name"

                value={form.name}

                onChange={handleChange}

                placeholder="Enter driver name"

                autoComplete="name"

                maxLength={100}

                required

                disabled={saving}

                className={inputClass}

              />

            </label>

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Phone Number <span className="text-rose-600">\*</span>

              </span>

              <input

                name="phone"

                type="tel"

                value={form.phone}

                onChange={handleChange}

                placeholder="Enter phone number"

                autoComplete="tel"

                maxLength={20}

                required

                disabled={saving}

                className={inputClass}

              />

            </label>

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Email Address

              </span>

              <input

                name="email"

                type="email"

                value={form.email}

                onChange={handleChange}

                placeholder="driver@example.com"

                autoComplete="email"

                maxLength={150}

                disabled={saving}

                className={inputClass}

              />

            </label>

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Driving License Number{" "}

                <span className="text-rose-600">\*</span>

              </span>

              <input

                name="licenseNumber"

                value={form.licenseNumber}

                onChange={handleChange}

                placeholder="Enter license number"

                maxLength={50}

                required

                disabled={saving}

                className={inputClass}

              />

            </label>

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                License Expiry Date

              </span>

              <input

                name="licenseExpiry"

                type="date"

                value={form.licenseExpiry}

                onChange={handleChange}

                disabled={saving}

                className={inputClass}

              />

            </label>

            <label className="block">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Account Status

              </span>

              <select

                name="isActive"

                value={form.isActive ? "active" : "inactive"}

                onChange={(event) =>

                  setForm((current) => ({

                    ...current,

                    isActive: event.target.value === "active",

                  }))

                }

                disabled={saving}

                className={inputClass}

              >

                <option value="active">Active</option>

                <option value="inactive">Inactive</option>

              </select>

            </label>

            <label className="block sm:col-span-2">

              <span className="mb-1.5 block text-sm font-semibold text-slate-700">

                Address

              </span>

              <textarea

                name="address"

                value={form.address}

                onChange={handleChange}

                placeholder="Enter driver's address"

                rows={3}

                maxLength={500}

                disabled={saving}

                className={`${inputClass} resize-y`}

              />

            </label>

            {formError && (

              <div

                role="alert"

                className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2"

              >

                <AlertCircle size={18} className="mt-0.5 shrink-0" />

                <span>{formError}</span>

              </div>

            )}

            <div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 p-3 sm:col-span-2">

              <input

                id="driver-active"

                type="checkbox"

                checked={Boolean(form.isActive)}

                onChange={(event) =>

                  setForm((current) => ({

                    ...current,

                    isActive: event.target.checked,

                  }))

                }

                disabled={saving}

                className="h-4 w-4 rounded accent-indigo-600"

              />

              <label

                htmlFor="driver-active"

                className="cursor-pointer text-sm font-medium text-slate-700"

              >

                Driver is available for cab assignments

              </label>

            </div>

          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end sm:p-6">

            <button

              type="button"

              onClick={onClose}

              disabled={saving}

              className={`${buttonClass} border-slate-300 bg-white text-slate-700 `}

            >

              Cancel

            </button>

            <button

              type="submit"

              disabled={saving}

              className={`${buttonClass} border-indigo-600 bg-black text-white `}

            >

              {saving ? (

                <LoaderCircle size={16} className="" />

              ) : (

                <Save size={16} />

              )}

              {saving

                ? "Saving..."

                : driver

                  ? "Update Driver"

                  : "Create Driver"}

            </button>

          </footer>

        </form>

      </section>

    </div>

  );

}

export default function AdminCabDriversPage() {

  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");

  const [actionError, setActionError] = useState("");

  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);

  const [selectedDriver, setSelectedDriver] = useState(null);

  const loadDrivers = useCallback(async () => {

    try {

      setLoading(true);

      setPageError("");

      const response = await getCabDrivers();

      const candidates = [
        response,
        response?.data,
        response?.data?.data,
        response?.result,
        response?.data?.result,
      ];
      let list = [];

      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          list = candidate;
          break;
        }
        if (Array.isArray(candidate?.drivers)) {
          list = candidate.drivers;
          break;
        }
        if (Array.isArray(candidate?.items)) {
          list = candidate.items;
          break;
        }
        if (Array.isArray(candidate?.results)) {
          list = candidate.results;
          break;
        }
      }

      setDrivers(list);

    } catch (error) {

      setPageError(getErrorMessage(error));

    } finally {

      setLoading(false);

    }

  }, []);

  useEffect(() => {

    loadDrivers();

  }, [loadDrivers]);

  const filteredDrivers = useMemo(() => {

    const query = search.trim().toLowerCase();

    return drivers.filter((driver) => {

      const name = getDriverName(driver);

      const searchableText = [

        name,

        driver.phone,

        driver.email,

        driver.licenseNumber,

        driver.user?.name,

        driver.user?.phone,

        driver.user?.email,

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      const matchesSearch = searchableText.includes(query);

      const active = getDriverStatus(driver);

      const matchesStatus =

        statusFilter === "all" ||

        (statusFilter === "active" && active) ||

        (statusFilter === "inactive" && !active);

      return matchesSearch && matchesStatus;

    });

  }, [drivers, search, statusFilter]);

  const activeCount = drivers.filter(getDriverStatus).length;

  const inactiveCount = drivers.length - activeCount;

  function openCreateModal() {

    setSelectedDriver(null);

    setActionError("");

    setNotice("");

    setModalOpen(true);

  }

  function openEditModal(driver) {

    setSelectedDriver(driver);

    setActionError("");

    setNotice("");

    setModalOpen(true);

  }

  async function handleSaveDriver(formData) {

    try {

      setSaving(true);

      setActionError("");

      setNotice("");

      if (selectedDriver) {

        await updateCabDriver(getDriverId(selectedDriver), formData);

        setNotice("Driver updated successfully.");

      } else {

        await createCabDriver(formData);

        setNotice("Driver created successfully.");

      }

      setModalOpen(false);

      setSelectedDriver(null);

      await loadDrivers();

    } catch (error) {

      setActionError(getErrorMessage(error));

      throw error;

    } finally {

      setSaving(false);

    }

  }

  async function handleDeleteDriver(driver) {

    const driverName = getDriverName(driver);

    const confirmed = window.confirm(

      `Are you sure you want to delete ${driverName}? This action may not be reversible.`

    );

    if (!confirmed) return;

    try {

      setSaving(true);

      setActionError("");

      setNotice("");

      await deleteCabDriver(getDriverId(driver));

      setNotice(`${driverName} deleted successfully.`);

      await loadDrivers();

    } catch (error) {

      setActionError(getErrorMessage(error));

    } finally {

      setSaving(false);

    }

  }

  return (

    <main className="min-h-screen ">

      <div className="mx-auto max-w-7xl space-y-6">

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>

            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">

              <Users size={18} />

              Fleet Management

            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">

              Cab Driver Management

            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">

              Manage driver profiles, contact information and license details.

            </p>

          </div>

          <div className="flex flex-wrap gap-2">

            <button

              type="button"

              onClick={loadDrivers}

              disabled={loading || saving}

              className={`${buttonClass} border-slate-300 bg-white text-slate-700 `}

            >

              <RefreshCw

                size={16}

                className={loading ? "" : ""}

              />

              Refresh

            </button>

            <button

              type="button"

              onClick={openCreateModal}

              disabled={saving}

              className={`${buttonClass} border-indigo-600 bg-black text-white `}

            >

              <Plus size={17} />

              Add Driver

            </button>

          </div>

        </header>

        {(pageError || actionError) && (

          <div

            role="alert"

            className="flex items-start justify-between gap-3 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"

          >

            <span className="flex items-start gap-2">

              <AlertCircle size={18} className="mt-0.5 shrink-0" />

              {actionError || pageError}

            </span>

            <button

              type="button"

              onClick={() => {

                setPageError("");

                setActionError("");

              }}

              aria-label="Dismiss error"

              className="rounded p-1 "

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

            <CheckCircle size={18} className="mt-0.5 shrink-0" />

            {notice}

          </div>

        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {[

            {

              label: "Total Drivers",

              value: drivers.length,

              icon: Users,

              textColor: "text-slate-900",

            },

            {

              label: "Active Drivers",

              value: activeCount,

              icon: CheckCircle,

              textColor: "text-emerald-700",

            },

            {

              label: "Inactive Drivers",

              value: inactiveCount,

              icon: UserRound,

              textColor: "text-slate-600",

            },

          ].map((item) => {

            const Icon = item.icon;

            return (

              <article

                key={item.label}

                className="rounded border border-slate-200 bg-white p-5"

              >

                <div className="flex items-start justify-between gap-3">

                  <div>

                    <p className="text-sm text-slate-500">{item.label}</p>

                    <p className={`mt-2 text-3xl font-bold ${item.textColor}`}>

                      {item.value}

                    </p>

                  </div>

                  <span className="flex h-11 w-11 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">

                    <Icon size={21} />

                  </span>

                </div>

              </article>

            );

          })}

        </section>

        <section className="overflow-hidden rounded border border-slate-200 bg-white">

          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">

            <div>

              <h2 className="text-lg font-semibold">Driver Directory</h2>

              <p className="mt-1 text-sm text-slate-500">

                Search and manage your registered cab drivers.

              </p>

            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_180px]">

              <label className="relative block">

                <span className="sr-only">Search drivers</span>

                <Search

                  size={17}

                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

                />

                <input

                  type="search"

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                  placeholder="Search name, phone, license..."

                  className={`${inputClass} pl-9`}

                />

              </label>

              <label>

                <span className="sr-only">Filter by status</span>

                <select

                  value={statusFilter}

                  onChange={(event) => setStatusFilter(event.target.value)}

                  className={inputClass}

                >

                  <option value="all">All Drivers</option>

                  <option value="active">Active Drivers</option>

                  <option value="inactive">Inactive Drivers</option>

                </select>

              </label>

            </div>

          </div>

          {loading ? (

            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">

              <LoaderCircle size={21} className="" />

              Loading drivers...

            </div>

          ) : filteredDrivers.length === 0 ? (

            <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">

              <span className="flex h-14 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">

                <Users size={25} />

              </span>

              <h3 className="mt-4 text-base font-semibold text-slate-900">

                {drivers.length === 0

                  ? "No Drivers Added"

                  : "No Matching Drivers"}

              </h3>

              <p className="mt-2 max-w-sm text-sm text-slate-500">

                {drivers.length === 0

                  ? "Add your first cab driver to start managing driver assignments."

                  : "Try changing your search term or status filter."}

              </p>

              {drivers.length === 0 && (

                <button

                  type="button"

                  onClick={openCreateModal}

                  className={`${buttonClass} mt-5 border-indigo-600 bg-black text-white`}

                >

                  <Plus size={16} />

                  Add First Driver

                </button>

              )}

            </div>

          ) : (

            <>

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full min-w-[850px] text-left">

                  <thead className="border-b border-slate-200 bg-slate-50">

                    <tr>

                      {[

                        "Driver",

                        "Contact",

                        "License Details",

                        "Status",

                        "Actions",

                      ].map((heading) => (

                        <th

                          key={heading}

                          className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500"

                        >

                          {heading}

                        </th>

                      ))}

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {filteredDrivers.map((driver) => {

                      const id = getDriverId(driver);

                      const active = getDriverStatus(driver);

                      const name = getDriverName(driver);

                      return (

                        <tr

                          key={id}

                          className=""

                        >

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-indigo-100 bg-black text-sm font-bold text-white">

                                {name.charAt(0).toUpperCase()}

                              </span>

                              <div>

                                <p className="font-semibold text-slate-900">

                                  {name}

                                </p>

                                <p className="mt-1 text-xs text-slate-500">

                                  ID: {String(id || "").slice(-8) || "N/A"}

                                </p>

                              </div>

                            </div>

                          </td>

                          <td className="px-5 py-4">

                            <div className="space-y-1.5 text-sm">

                              <p className="flex items-center gap-2 text-slate-700">

                                <Phone

                                  size={14}

                                  className="shrink-0 text-slate-400"

                                />

                                {driver.phone || driver.user?.phone || "—"}

                              </p>

                              <p className="flex items-center gap-2 text-slate-500">

                                <Mail

                                  size={14}

                                  className="shrink-0 text-slate-400"

                                />

                                <span className="max-w-48 truncate">

                                  {driver.email || driver.user?.email || "—"}

                                </span>

                              </p>

                            </div>

                          </td>

                          <td className="px-5 py-4">

                            <p className="flex items-center gap-2 text-sm font-medium text-slate-800">

                              <CreditCard

                                size={15}

                                className="shrink-0 text-slate-400"

                              />

                              {driver.licenseNumber || "Not provided"}

                            </p>

                            {driver.licenseExpiry && (

                              <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">

                                <CalendarDays size={13} />

                                Expires:{" "}

                                {new Date(

                                  driver.licenseExpiry

                                ).toLocaleDateString("en-IN")}

                              </p>

                            )}

                          </td>

                          <td className="px-5 py-4">

                            <StatusBadge active={active} />

                          </td>

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2">

                              <button

                                type="button"

                                onClick={() => openEditModal(driver)}

                                disabled={saving}

                                title="Edit driver"

                                aria-label={`Edit ${name}`}

                                className="rounded border border-slate-200 p-2.5 text-slate-600"

                              >

                                <Pencil size={16} />

                              </button>

                              <button

                                type="button"

                                onClick={() => handleDeleteDriver(driver)}

                                disabled={saving}

                                title="Delete driver"

                                aria-label={`Delete ${name}`}

                                className="rounded border border-slate-200 p-2.5 text-slate-600"

                              >

                                <Trash2 size={16} />

                              </button>

                            </div>

                          </td>

                        </tr>

                      );

                    })}

                  </tbody>

                </table>

              </div>

              <div className="grid grid-cols-1 gap-3 p-4 md:hidden">

                {filteredDrivers.map((driver) => {

                  const id = getDriverId(driver);

                  const active = getDriverStatus(driver);

                  const name = getDriverName(driver);

                  return (

                    <article

                      key={id}

                      className="rounded border border-slate-200 p-4"

                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-indigo-100 bg-black font-bold text-indigo-700">

                            {name.charAt(0).toUpperCase()}

                          </span>

                          <div className="min-w-0">

                            <h3 className="truncate font-semibold text-slate-900">

                              {name}

                            </h3>

                            <p className="mt-1 text-xs text-slate-500">

                              ID: {String(id || "").slice(-8) || "N/A"}

                            </p>

                          </div>

                        </div>

                        <StatusBadge active={active} />

                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">

                        <p className="flex items-center gap-2 break-all">

                          <Phone size={15} className="shrink-0" />

                          {driver.phone || driver.user?.phone || "—"}

                        </p>

                        <p className="flex items-center gap-2 break-all">

                          <Mail size={15} className="shrink-0" />

                          {driver.email || driver.user?.email || "—"}

                        </p>

                        <p className="flex items-center gap-2 break-all">

                          <CreditCard size={15} className="shrink-0" />

                          {driver.licenseNumber || "License not provided"}

                        </p>

                        {driver.licenseExpiry && (

                          <p className="flex items-center gap-2">

                            <CalendarDays size={15} className="shrink-0" />

                            Expires:{" "}

                            {new Date(

                              driver.licenseExpiry

                            ).toLocaleDateString("en-IN")}

                          </p>

                        )}

                      </div>

                      <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">

                        <button

                          type="button"

                          onClick={() => openEditModal(driver)}

                          disabled={saving}

                          className={`${buttonClass} flex-1 border-slate-300 bg-white text-slate-700`}

                        >

                          <Pencil size={15} />

                          Edit

                        </button>

                        <button

                          type="button"

                          onClick={() => handleDeleteDriver(driver)}

                          disabled={saving}

                          className={`${buttonClass} flex-1 border-rose-200 bg-white text-rose-700`}

                        >

                          <Trash2 size={15} />

                          Delete

                        </button>

                      </div>

                    </article>

                  );

                })}

              </div>

            </>

          )}

          {!loading && filteredDrivers.length > 0 && (

            <footer className="border-t border-slate-200 px-4 py-3.5 text-sm text-slate-500 sm:px-5">

              Showing{" "}

              <span className="font-semibold text-slate-900">

                {filteredDrivers.length}

              </span>{" "}

              of{" "}

              <span className="font-semibold text-slate-900">

                {drivers.length}

              </span>{" "}

              drivers

            </footer>

          )}

        </section>

      </div>

      {modalOpen && (

        <DriverModal

          key={getDriverId(selectedDriver) || "new-driver"}

          driver={selectedDriver}

          saving={saving}

          onClose={() => {

            if (!saving) {

              setModalOpen(false);

              setSelectedDriver(null);

            }

          }}

          onSubmit={handleSaveDriver}

        />

      )}

    </main>

  );

}
