import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MessageSquare, Plus, Star } from "lucide-react";
import toast from "react-hot-toast";

import {
  createReview,
  getReviewList,
  getReviewSummary,
  replyToReview,
  setReviewStatus,
} from "../services/guestExperience.service";

const CATEGORIES = [
  ["cleanliness", "Cleanliness"],
  ["service", "Service"],
  ["comfort", "Comfort"],
  ["food", "Food"],
  ["valueForMoney", "Value for money"],
];

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

const Stars = ({ value, size = 14 }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}
      />
    ))}
  </span>
);

const StarPicker = ({ value, onChange }) => (
  <span className="inline-flex gap-1">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" onClick={() => onChange(n === value ? 0 : n)}>
        <Star size={20} className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      </button>
    ))}
  </span>
);

const emptyForm = { bookingNumber: "", rating: 0, comment: "", categories: {} };

const Reviews = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [replyFor, setReplyFor] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (ratingFilter) params.rating = ratingFilter;
      if (statusFilter) params.status = statusFilter;

      const [list, sum] = await Promise.all([getReviewList(params), getReviewSummary()]);
      setItems(list.items);
      setSummary(sum.summary);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleStatus = async (review) => {
    setBusyId(review._id);
    try {
      await setReviewStatus(review._id, review.status === "published" ? "hidden" : "published");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async () => {
    if (!replyText.trim()) return toast.error("Enter a reply");
    setBusyId(replyFor);
    try {
      await replyToReview(replyFor, replyText.trim());
      toast.success("Reply saved");
      setReplyFor(null);
      setReplyText("");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save reply");
    } finally {
      setBusyId(null);
    }
  };

  const submit = async () => {
    if (!form.bookingNumber.trim()) return toast.error("Enter the booking number");
    if (!form.rating) return toast.error("Select an overall rating");

    setSaving(true);
    try {
      await createReview({
        bookingNumber: form.bookingNumber.trim(),
        rating: form.rating,
        comment: form.comment.trim(),
        categories: form.categories,
      });
      toast.success("Review added successfully");
      setOpen(false);
      setForm(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not add review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reviews &amp; Feedback</h1>
          <p className="text-sm text-slate-500">Guest ratings and comments after check-out</p>
        </div>
    
      </div>

      {summary && (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded border border-slate-200 bg-white p-5">
            <p className="text-xs text-slate-500">Average rating</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{summary.average || "-"}</p>
            <div className="mt-1 flex items-center gap-2">
              <Stars value={Math.round(summary.average)} />
              <span className="text-xs text-slate-500">
                {summary.total} published, {summary.hidden} hidden
              </span>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-5 lg:col-span-2">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = summary.distribution[n] || 0;
              const pct = summary.total ? (count / summary.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="w-3">{n}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded border border-slate-200 bg-white p-4 sm:flex-row">
        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="">All ratings</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="">Published and hidden</option>
          <option value="published">Published</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded border border-slate-200 bg-white px-4 py-16 text-center text-sm text-slate-500">
          No reviews yet
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r._id}
              className={`rounded border bg-white p-5 ${
                r.status === "hidden" ? "border-slate-200 opacity-70" : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{r.guestName || "Guest"}</p>
                    <Stars value={r.rating} />
                    {r.status === "hidden" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Hidden</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {r.booking?.bookingNumber} | Room {r.room?.roomNumber || "-"} |{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setReplyFor(r._id);
                      setReplyText(r.reply?.text || "");
                    }}
                    title="Reply"
                    className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button
                    onClick={() => toggleStatus(r)}
                    disabled={busyId === r._id}
                    title={r.status === "published" ? "Hide" : "Publish"}
                    className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600 disabled:opacity-40"
                  >
                    {r.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {r.comment && <p className="mt-3 text-sm text-slate-700">{r.comment}</p>}

              {Object.keys(r.categories || {}).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                  {CATEGORIES.filter(([k]) => r.categories?.[k]).map(([k, name]) => (
                    <span key={k}>
                      {name}: <span className="font-semibold text-slate-700">{r.categories[k]}/5</span>
                    </span>
                  ))}
                </div>
              )}

              {r.reply?.text && (
                <div className="mt-3 rounded bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="text-xs font-semibold text-slate-500">Hotel reply</p>
                  {r.reply.text}
                </div>
              )}

              {replyFor === r._id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply"
                    className={inputClass}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReplyFor(null)}
                      className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveReply}
                      disabled={busyId === r._id}
                      className="rounded bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
                    >
                      Save reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded bg-white p-6 ">
            <h2 className="text-lg font-bold text-slate-900">Add review</h2>

            <input
              value={form.bookingNumber}
              onChange={(e) => setForm({ ...form, bookingNumber: e.target.value })}
              placeholder="Booking number (checked-out booking)"
              className={inputClass}
            />

            <div>
              <p className="mb-1 text-xs font-medium text-slate-700">Overall rating</p>
              <StarPicker value={form.rating} onChange={(n) => setForm({ ...form, rating: n })} />
            </div>

            <div className="space-y-2">
              {CATEGORIES.map(([key, name]) => (
                <div key={key} className="flex items-center justify-between text-sm text-slate-600">
                  {name}
                  <StarPicker
                    value={form.categories[key] || 0}
                    onChange={(n) =>
                      setForm({ ...form, categories: { ...form.categories, [key]: n || undefined } })
                    }
                  />
                </div>
              ))}
            </div>

            <textarea
              rows={3}
              maxLength={1000}
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Guest comment"
              className={inputClass}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="flex items-center gap-2 rounded bg-[#1a1a1a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-70"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;