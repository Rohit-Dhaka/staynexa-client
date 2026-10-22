
import { useCallback, useEffect, useState } from "react";
import {
  getMyGuestRequests,
  createMyGuestRequest,
  cancelMyGuestRequest,
} from "../services/GuestServiceRequests.service.js";
import {
  ClipboardList,
  Clock3,
  CheckCircle2,
  Plus,
  RefreshCw,
  X,
  ArrowUpRight,
  CalendarDays,
  BedDouble,
  ConciergeBell,
} from "lucide-react";

const INITIAL_FORM = {
  bookingNumber: "",
  type: "housekeeping",
  description: "",
};

const SERVICE_TYPES = [
  { value: "housekeeping", label: "Housekeeping" },
  { value: "laundry", label: "Laundry" },
  { value: "food", label: "Food / Room Service" },
  { value: "amenities", label: "Extra Amenities" },
  { value: "maintenance", label: "Maintenance" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  in_progress: "bg-black text-blue-700 ring-blue-200",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const formatStatus = (status = "") =>
  status.replaceAll("_", " ").replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function GuestServiceRequests() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getMyGuestRequests();
      setRequests(result?.requests ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const bookingNumber = form.bookingNumber.trim();
    const description = form.description.trim();

    if (!bookingNumber || !description) {
      setError("Please enter your booking number and request details.");
      return;
    }

    if (description.length > 500) {
      setError("Request details must not exceed 500 characters.");
      return;
    }

    setSubmitting(true);

    try {
      await createMyGuestRequest({
        bookingNumber,
        type: form.type,
        description,
      });

      setForm(INITIAL_FORM);
      setSuccess("Your service request has been submitted successfully.");
      await loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (requestId) => {
    if (!window.confirm("Are you sure you want to cancel this request?")) {
      return;
    }

    setError("");
    setSuccess("");
    setCancellingId(requestId);

    try {
      await cancelMyGuestRequest(requestId);
      setSuccess("Your service request has been cancelled.");
      await loadRequests();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const inProgressCount = requests.filter(
    (request) => request.status === "in_progress"
  ).length;

  const completedCount = requests.filter(
    (request) => request.status === "done"
  ).length;

  return (
    <div className="w-full min-w-0 pb-6">
      <div className="mx-auto w-full max-w-none space-y-5">
        {/* Compact header with actions on the right */}
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">        
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Service Requests
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Request assistance and follow your service updates.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700  transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("create-service-request")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white  transition "
            >
              <Plus size={17} />
              New Request
            </button>
          </div>
        </header>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {success}
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Compact summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            title="Pending"
            value={pendingCount}
            description="Awaiting staff"
            icon={Clock3}
            color="amber"
          />
          <SummaryCard
            title="In Progress"
            value={inProgressCount}
            description="Being handled"
            icon={ClipboardList}
            color="blue"
          />
          <SummaryCard
            title="Completed"
            value={completedCount}
            description="Successfully done"
            icon={CheckCircle2}
            color="emerald"
          />
        </div>

        {/* Main content uses the available width */}
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.6fr)]">
          {/* Create request */}
          <section
            id="create-service-request"
            className="min-w-0 scroll-mt-5 overflow-hidden rounded border border-slate-200 bg-white "
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-indigo-100 text-indigo-700">
                  <Plus size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">
                    Create a Request
                  </h2>
                  <p className="text-xs text-slate-500">
                    How can we help you?
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label
                  htmlFor="bookingNumber"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Booking Number
                </label>
                <input
                  id="bookingNumber"
                  name="bookingNumber"
                  value={form.bookingNumber}
                  onChange={handleChange}
                  placeholder="e.g. BK-2026-00125"
                  required
                  maxLength={100}
                  className="w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Service Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                >
                  {SERVICE_TYPES.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Request Details
                  </label>
                  <span className="text-xs text-slate-400">
                    {form.description.length}/500
                  </span>
                </div>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Tell us what you need..."
                  rows={4}
                  maxLength={500}
                  required
                  className="w-full resize-y rounded border border-slate-200 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded bg-black px-4 py-3 text-sm font-semibold text-white  transition  disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Request"}
                {!submitting && <ArrowUpRight size={17} />}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                Your request will be sent to our hotel service team.
              </p>
            </form>
          </section>

          {/* Request history: larger area */}
          <section className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white ">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-slate-700">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">My Requests</h2>
                  <p className="text-xs text-slate-500">
                    {requests.length}{" "}
                    {requests.length === 1 ? "request" : "requests"} in total
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Request History
              </span>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
                  <RefreshCw size={18} className="animate-spin" />
                  Loading your requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded border border-dashed border-slate-200 bg-slate-50/60 px-5 py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-white text-indigo-600 ">
                    <ConciergeBell size={24} />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-800">
                    No service requests yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-xs text-sm leading-6 text-slate-500">
                    Submit your first request and it will appear here with
                    status updates.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("create-service-request")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white "
                  >
                    <Plus size={16} />
                    Create Request
                  </button>
                </div>
              ) : (
                requests.map((request) => {
                  const bookingNumber =
                    typeof request.booking === "object"
                      ? request.booking?.bookingNumber
                      : request.bookingNumber;

                  const canCancel = request.status === "pending";

                  const serviceLabel =
                    SERVICE_TYPES.find(
                      (item) => item.value === request.type
                    )?.label || formatStatus(request.type);

                  return (
                    <article
                      key={request._id}
                      className="rounded border border-slate-200 p-4 transition hover:border-indigo-200  sm:p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-600">
                            <ConciergeBell size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="break-words font-bold text-slate-900">
                              {serviceLabel}
                            </h3>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              Request #{request.requestNumber || request._id}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                            STATUS_STYLES[request.status] ||
                            "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          {formatStatus(request.status)}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {request.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                        {bookingNumber && (
                          <span className="inline-flex items-center gap-1.5">
                            <ClipboardList size={14} />
                            Booking: {bookingNumber}
                          </span>
                        )}

                        {request.createdAt && (
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        )}

                        {request.room?.roomNumber && (
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble size={14} />
                            Room: {request.room.roomNumber}
                          </span>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancel(request._id)}
                            disabled={cancellingId === request._id}
                            className="ml-auto inline-flex items-center gap-1.5 font-semibold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                          >
                            <X size={14} />
                            {cancellingId === request._id
                              ? "Cancelling..."
                              : "Cancel Request"}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, description, icon: Icon, color }) {
  const styles = {
    amber: {
      icon: "bg-amber-50 text-amber-600",
      number: "text-amber-700",
      dot: "bg-amber-500",
    },
    blue: {
      icon: "bg-black text-blue-600",
      number: "text-blue-700",
      dot: "bg-black0",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      number: "text-emerald-700",
      dot: "bg-emerald-500",
    },
  };

  const theme = styles[color];

  return (
    <div className="flex min-w-0 items-center gap-4 rounded border border-slate-200 bg-white p-4  transition hover:border-slate-300 sm:p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${theme.icon}`}
      >
        <Icon size={21} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className={`text-2xl font-bold ${theme.number}`}>{value}</p>
          <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
