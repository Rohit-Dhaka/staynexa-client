import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  Filter,
  Loader2,
  Plus,
  Play,
  Search,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createRequest,
  getRequestList,
  getRequestSummary,
  setRequestStatus,
} from "../services/guestExperience.service";

const TYPES = [
  "housekeeping",
  "laundry",
  "food",
  "amenities",
  "maintenance",
  "transport",
  "other",
];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const STATUSES = ["pending", "in_progress", "done", "cancelled"];

const STATUS_STYLE = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  in_progress: "border-sky-200 bg-sky-50 text-sky-700",
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
};

const PRIORITY_STYLE = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-50 text-blue-700",
  high: "bg-orange-50 text-orange-700",
  urgent: "bg-rose-50 text-rose-700",
};

const label = (value = "") => String(value).replace(/_/g, " ");

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500";

const emptyForm = {
  bookingNumber: "",
  type: "housekeeping",
  priority: "normal",
  description: "",
  assignedToName: "",
  charge: "",
};

const SUMMARY_CARDS = [
  { key: "pending", title: "Pending", icon: Clock3, iconStyle: "bg-amber-50 text-amber-700" },
  { key: "in_progress", title: "In progress", icon: Play, iconStyle: "bg-sky-50 text-sky-700" },
  { key: "done", title: "Completed", icon: CheckCircle2, iconStyle: "bg-emerald-50 text-emerald-700" },
  { key: "cancelled", title: "Cancelled", icon: XCircle, iconStyle: "bg-slate-100 text-slate-600" },
];

const GuestServices = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (status) params.status = status;
      if (type) params.type = type;

      const [list, sum] = await Promise.all([
        getRequestList(params),
        getRequestSummary(),
      ]);
      setItems(Array.isArray(list?.items) ? list.items : []);
      setSummary(sum?.summary || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((request) => {
      const searchable = [
        request.requestNumber,
        request.type,
        request.description,
        request.booking?.guestDetails?.name,
        request.room?.roomNumber,
        request.assignedToName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [items, search]);

  const changeStatus = async (request, next) => {
    setBusyId(request._id);
    try {
      await setRequestStatus(request._id, next);
      toast.success(`Marked as ${label(next)}`);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.bookingNumber.trim()) return toast.error("Enter the booking number");
    if (!form.description.trim()) return toast.error("Describe the request");

    setSaving(true);
    try {
      await createRequest({
        ...form,
        bookingNumber: form.bookingNumber.trim(),
        description: form.description.trim(),
        assignedToName: form.assignedToName.trim(),
        charge: Number(form.charge) || 0,
      });
      toast.success("Request created successfully");
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create request");
    } finally {
      setSaving(false);
    }
  };

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  return (
    <div className="min-w-0 space-y-5 text-slate-800">
      <section className="flex flex-col gap-4 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-indigo-50 text-indigo-700">
            <ClipboardList size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Guest Services</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage housekeeping, laundry, food, maintenance, and other guest requests.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
        >
          <Plus size={17} /> New request
        </button>
      </section>

      {summary && (
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {SUMMARY_CARDS.map(({ key, title, icon: Icon, iconStyle }) => {
            const selected = status === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(selected ? "" : key)}
                aria-pressed={selected}
                className={`rounded border bg-white p-4 text-left sm:p-5 ${
                  selected ? "border-indigo-500" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500 sm:text-sm">{title}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded ${iconStyle}`}>
                    <Icon size={18} />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900">{summary[key] ?? 0}</p>
                <p className="mt-1 text-xs text-slate-500">{selected ? "Filter active" : "View requests"}</p>
              </button>
            );
          })}
        </section>
      )}

      <section className="rounded border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Filter size={16} /> Filters
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_220px_220px_auto]">
          <label className="relative block min-w-0">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, room, request..."
              className={`${inputClass} pl-9`}
              aria-label="Search guest service requests"
            />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value)} className={inputClass} aria-label="Filter by request type">
            <option value="">All request types</option>
            {TYPES.map((itemType) => <option key={itemType} value={itemType}>{label(itemType)}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((itemStatus) => <option key={itemStatus} value={itemStatus}>{label(itemStatus)}</option>)}
          </select>
          <button
            type="button"
            onClick={() => { setSearch(""); setType(""); setStatus(""); }}
            className="rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            Clear filters
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold text-slate-900">Service requests</h2>
            <p className="mt-1 text-xs text-slate-500">Review request details and update progress.</p>
          </div>
          <p className="text-sm text-slate-500">{filteredItems.length} requests</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Request details</th>
                <th className="px-5 py-3 font-semibold">Guest / room</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Assigned to</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-5 py-14 text-center text-slate-500"><Loader2 className="mx-auto" size={22} /><span className="mt-2 block text-sm">Loading requests...</span></td></tr>
              )}
              {!loading && filteredItems.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-14 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded bg-slate-100 text-slate-500"><ClipboardList size={21} /></div><p className="mt-3 font-medium text-slate-700">No requests found</p><p className="mt-1 text-xs text-slate-500">Try changing your filters or create a new request.</p></td></tr>
              )}
              {!loading && filteredItems.map((request) => {
                const closed = request.status === "done" || request.status === "cancelled";
                const busy = busyId === request._id;
                return (
                  <tr key={request._id}>
                    <td className="max-w-sm px-5 py-4">
                      <p className="font-semibold capitalize text-slate-900">{label(request.type)}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">{request.description}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{request.requestNumber || "No request number"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{request.booking?.guestDetails?.name || "Unknown guest"}</p>
                      <p className="mt-1 text-xs text-slate-500">Room {request.room?.roomNumber || "-"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PRIORITY_STYLE[request.priority] || PRIORITY_STYLE.normal}`}>
                        {label(request.priority || "normal")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{request.assignedToName || "Unassigned"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[request.status] || STATUS_STYLE.pending}`}>
                        {label(request.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {busy && <Loader2 size={16} className="mr-1 text-slate-400" />}
                        {!closed && request.status === "pending" && (
                          <button type="button" onClick={() => changeStatus(request, "in_progress")} disabled={busy} title="Start request" aria-label="Start request" className="rounded border border-slate-200 p-2 text-sky-700 disabled:opacity-50"><Play size={16} /></button>
                        )}
                        {!closed && (
                          <>
                            <button type="button" onClick={() => changeStatus(request, "done")} disabled={busy} title="Mark completed" aria-label="Mark completed" className="rounded border border-slate-200 p-2 text-emerald-700 disabled:opacity-50"><CheckCircle2 size={16} /></button>
                            <button type="button" onClick={() => changeStatus(request, "cancelled")} disabled={busy} title="Cancel request" aria-label="Cancel request" className="rounded border border-slate-200 p-2 text-rose-700 disabled:opacity-50"><XCircle size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <form onSubmit={submit} className="my-auto w-full max-w-xl rounded border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create service request</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the booking and service details below.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={saving} aria-label="Close dialog" className="rounded border border-slate-200 p-2 text-slate-500 disabled:opacity-50"><X size={17} /></button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Booking number <span className="text-rose-600">*</span>
                <input name="bookingNumber" value={form.bookingNumber} onChange={change} placeholder="e.g. BK-XXXX" className={inputClass} required />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Request type
                <select name="type" value={form.type} onChange={change} className={inputClass}>{TYPES.map((itemType) => <option key={itemType} value={itemType}>{label(itemType)}</option>)}</select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Priority
                <select name="priority" value={form.priority} onChange={change} className={inputClass}>{PRIORITIES.map((itemPriority) => <option key={itemPriority} value={itemPriority}>{label(itemPriority)}</option>)}</select>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Request description <span className="text-rose-600">*</span>
                <textarea name="description" rows={4} maxLength={500} value={form.description} onChange={change} placeholder="Describe what the guest needs..." className={`${inputClass} resize-y`} required />
                <span className="block text-right text-xs font-normal text-slate-400">{form.description.length}/500</span>
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Assigned to
                <input name="assignedToName" value={form.assignedToName} onChange={change} placeholder="Staff member name" className={inputClass} />
              </label>
              <label className="space-y-1.5 text-sm font-medium text-slate-700">
                Charge (optional)
                <input name="charge" type="number" min="0" step="0.01" value={form.charge} onChange={change} placeholder="0.00" className={inputClass} />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? "Creating..." : "Create request"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default GuestServices;
