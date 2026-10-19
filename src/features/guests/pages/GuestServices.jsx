import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Play, Plus, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import {
  createRequest,
  getRequestList,
  getRequestSummary,
  setRequestStatus,
} from "../services/guestExperience.service";

const TYPES = ["housekeeping", "laundry", "food", "amenities", "maintenance", "transport", "other"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

const STATUS_STYLE = {
  pending: "bg-amber-50 text-amber-700",
  in_progress: "bg-sky-50 text-sky-700",
  done: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const PRIORITY_STYLE = {
  low: "text-slate-500",
  normal: "text-slate-700",
  high: "text-orange-600",
  urgent: "font-semibold text-rose-600",
};

const label = (v) => String(v).replace(/_/g, " ");

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const emptyForm = {
  bookingNumber: "",
  type: "housekeeping",
  priority: "normal",
  description: "",
  assignedToName: "",
  charge: "",
};

const GuestServices = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
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

      const [list, sum] = await Promise.all([getRequestList(params), getRequestSummary()]);
      setItems(list.items);
      setSummary(sum.summary);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [status, type]);

  useEffect(() => {
    load();
  }, [load]);

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

  const submit = async () => {
    if (!form.bookingNumber.trim()) return toast.error("Enter the booking number");
    if (!form.description.trim()) return toast.error("Describe the request");

    setSaving(true);
    try {
      await createRequest({
        ...form,
        bookingNumber: form.bookingNumber.trim(),
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

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guest Services</h1>
          <p className="text-sm text-slate-500">Housekeeping, laundry, food and other guest requests</p>
        </div>
        {/* <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <Plus size={16} />
          New request
        </button> */}
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {["pending", "in_progress", "done", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(status === s ? "" : s)}
              className={`rounded-xl border bg-white p-4 text-left transition ${
                status === s ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"
              }`}
            >
              <p className="text-xs capitalize text-slate-500">{label(s)}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{summary[s]}</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputClass} sm:w-56`}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {label(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Request</th>
                <th className="px-5 py-3 font-semibold">Guest and room</th>
                <th className="px-5 py-3 font-semibold">Priority</th>
                <th className="px-5 py-3 font-semibold">Assigned to</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                    <Loader2 className="mx-auto animate-spin" size={22} />
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                    No requests found
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((r) => {
                  const closed = r.status === "done" || r.status === "cancelled";
                  return (
                    <tr key={r._id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold capitalize text-slate-900">{label(r.type)}</p>
                        <p className="max-w-xs text-xs text-slate-500">{r.description}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{r.requestNumber}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{r.booking?.guestDetails?.name || "-"}</p>
                        <p className="text-xs text-slate-500">Room {r.room?.roomNumber || "-"}</p>
                      </td>
                      <td className={`px-5 py-4 capitalize ${PRIORITY_STYLE[r.priority]}`}>{r.priority}</td>
                      <td className="px-5 py-4 text-slate-600">{r.assignedToName || "-"}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status]}`}
                        >
                          {label(r.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {busyId === r._id && <Loader2 size={16} className="animate-spin text-slate-400" />}
                          {!closed && r.status === "pending" && (
                            <button
                              onClick={() => changeStatus(r, "in_progress")}
                              disabled={busyId === r._id}
                              title="Start"
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-sky-600"
                            >
                              <Play size={16} />
                            </button>
                          )}
                          {!closed && (
                            <>
                              <button
                                onClick={() => changeStatus(r, "done")}
                                disabled={busyId === r._id}
                                title="Mark done"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => changeStatus(r, "cancelled")}
                                disabled={busyId === r._id}
                                title="Cancel"
                                className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <XCircle size={16} />
                              </button>
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
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">New request</h2>

            <input
              name="bookingNumber"
              value={form.bookingNumber}
              onChange={change}
              placeholder="Booking number (e.g. BK-XXXX)"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-3">
              <select name="type" value={form.type} onChange={change} className={inputClass}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
              <select name="priority" value={form.priority} onChange={change} className={inputClass}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              name="description"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={change}
              placeholder="What does the guest need?"
              className={inputClass}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                name="assignedToName"
                value={form.assignedToName}
                onChange={change}
                placeholder="Assign to (name)"
                className={inputClass}
              />
              <input
                name="charge"
                type="number"
                min="0"
                value={form.charge}
                onChange={change}
                placeholder="Charge (optional)"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestServices;