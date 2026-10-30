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
  MessageSquare,
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
  pending: "border-amber-300 text-amber-700",
  in_progress: "border-slate-400 text-slate-800",
  done: "border-emerald-300 text-emerald-700",
  cancelled: "border-slate-300 text-slate-500",
};

const formatStatus = (status = "") =>
  status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatReplyTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
      await createMyGuestRequest({ bookingNumber, type: form.type, description });
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
    if (!window.confirm("Are you sure you want to cancel this request?")) return;
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

  const scrollToForm = () => {
    document.getElementById("create-service-request")?.scrollIntoView({ block: "start" });
  };

  const pendingCount = requests.filter((request) => request.status === "pending").length;
  const inProgressCount = requests.filter((request) => request.status === "in_progress").length;
  const completedCount = requests.filter((request) => request.status === "done").length;

  return (
    <main className="w-full min-w-0 pb-8 text-slate-900">
      <div className="mx-auto w-full space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Guest assistance
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Service Requests</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Request hotel services, track progress, and read replies from your service team.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 sm:px-4"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={scrollToForm}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-black px-3 py-2.5 text-sm font-semibold text-white sm:px-4"
            >
              <Plus size={17} />
              New Request
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded border border-red-300 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} aria-label="Dismiss error" className="shrink-0 rounded p-1">
              <X size={17} />
            </button>
          </div>
        )}
        {success && (
          <div role="status" className="flex items-start justify-between gap-3 rounded border border-emerald-300 px-4 py-3 text-sm text-emerald-700">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss success" className="shrink-0 rounded p-1">
              <X size={17} />
            </button>
          </div>
        )}

        <section aria-label="Request summary" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard title="Pending" value={pendingCount} description="Awaiting staff" icon={Clock3} />
          <SummaryCard title="In Progress" value={inProgressCount} description="Currently being handled" icon={ClipboardList} />
          <SummaryCard title="Completed" value={completedCount} description="Successfully resolved" icon={CheckCircle2} />
        </section>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(280px,0.78fr)_minmax(0,1.55fr)]">
          <section id="create-service-request" className="min-w-0 scroll-mt-5 rounded border border-slate-200">
            <div className="flex items-start gap-3 border-b border-slate-200 p-4 sm:p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300">
                <Plus size={20} />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold">Create a Request</h2>
                <p className="mt-1 text-sm text-slate-600">Tell us what you need during your stay.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
              <div>
                <label htmlFor="bookingNumber" className="mb-1.5 block text-sm font-semibold text-slate-700">Booking Number</label>
                <input
                  id="bookingNumber"
                  name="bookingNumber"
                  value={form.bookingNumber}
                  onChange={handleChange}
                  placeholder="e.g. BK-2026-00125"
                  required
                  maxLength={100}
                  className="min-h-11 w-full rounded border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-700"
                />
              </div>

              <div>
                <label htmlFor="type" className="mb-1.5 block text-sm font-semibold text-slate-700">Service Type</label>
                <select
                  id="type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                  className="min-h-11 w-full rounded border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-700"
                >
                  {SERVICE_TYPES.map((service) => <option key={service.value} value={service.value}>{service.label}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="description" className="text-sm font-semibold text-slate-700">Request Details</label>
                  <span className="text-xs tabular-nums text-slate-500">{form.description.length}/500</span>
                </div>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the service you need..."
                  rows={4}
                  maxLength={500}
                  required
                  className="w-full resize-y rounded border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-slate-700"
                />
              </div>

              <button type="submit" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Request"}
                {!submitting && <ArrowUpRight size={17} />}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">Your request will be sent to the hotel service team.</p>
            </form>
          </section>

          <section className="min-w-0 rounded border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2 className="font-bold">My Requests</h2>
                  <p className="mt-1 text-sm text-slate-600">{requests.length} {requests.length === 1 ? "request" : "requests"} in total</p>
                </div>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <ClipboardList size={13} /> Request History
              </span>
            </div>

            <div className="space-y-3 p-3 sm:p-5">
              {loading ? (
                <div className="flex min-h-40 items-center justify-center gap-3 py-10 text-sm text-slate-600">
                  <RefreshCw size={18} /> Loading your requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="rounded border border-dashed border-slate-300 px-4 py-10 text-center sm:px-6">
                  <ConciergeBell size={28} className="mx-auto text-slate-500" />
                  <h3 className="mt-4 font-semibold">No service requests yet</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">Submit your first request and its status updates will appear here.</p>
                  <button type="button" onClick={scrollToForm} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">
                    <Plus size={16} /> Create Request
                  </button>
                </div>
              ) : (
                requests.map((request) => {
                  const bookingNumber = typeof request.booking === "object" ? request.booking?.bookingNumber : request.bookingNumber;
                  const canCancel = request.status === "pending";
                  const serviceLabel = SERVICE_TYPES.find((item) => item.value === request.type)?.label || formatStatus(request.type);

                  return (
                    <article key={request._id} className="min-w-0 rounded border border-slate-200 p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-300">
                            <ConciergeBell size={19} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="break-words font-bold">{serviceLabel}</h3>
                            <p className="mt-1 break-all text-xs text-slate-500">Request #{request.requestNumber || request._id}</p>
                          </div>
                        </div>
                        <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[request.status] || "border-slate-300 text-slate-600"}`}>
                          {formatStatus(request.status)}
                        </span>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{request.description}</p>

                      {request.adminReply ? (
                        <div className="mt-4 rounded border border-slate-300 p-3 sm:p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800"><MessageSquare size={14} /> Reply from hotel</p>
                            {request.repliedAt && <span className="text-xs text-slate-500">{formatReplyTime(request.repliedAt)}</span>}
                          </div>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{request.adminReply}</p>
                        </div>
                      ) : request.status !== "cancelled" && request.status !== "done" ? (
                        <p className="mt-4 text-xs text-slate-500">No reply from the hotel yet.</p>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
                        {bookingNumber && <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><ClipboardList size={14} className="shrink-0" /> Booking: {bookingNumber}</span>}
                        {request.createdAt && <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} /> {new Date(request.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                        {request.room?.roomNumber && <span className="inline-flex items-center gap-1.5"><BedDouble size={14} /> Room: {request.room.roomNumber}</span>}
                        {canCancel && (
                          <button type="button" onClick={() => handleCancel(request._id)} disabled={cancellingId === request._id} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded border border-red-300 px-3 py-2 font-semibold text-red-700 disabled:opacity-50 sm:ml-auto">
                            <X size={14} /> {cancellingId === request._id ? "Cancelling..." : "Cancel Request"}
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
    </main>
  );
}

function SummaryCard({ title, value, description, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded border border-slate-200 p-4 sm:p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-slate-300">
        <Icon size={21} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
