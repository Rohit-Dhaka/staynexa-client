import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";
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
  "w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500";

const STATUS_STYLES = {
  published: "bg-emerald-50 text-emerald-700",
  hidden: "bg-slate-100 text-slate-600",
};

const emptyForm = { bookingNumber: "", rating: 0, comment: "", categories: {} };
const label = (value) => String(value || "").replace(/_/g, " ");

const Stars = ({ value = 0, size = 14 }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className={n <= Number(value) ? "fill-amber-400 text-amber-400" : "text-slate-300"}
      />
    ))}
  </span>
);

const StarPicker = ({ value = 0, onChange }) => (
  <div className="inline-flex items-center gap-1" role="group" aria-label="Choose rating">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        onClick={() => onChange(n === value ? 0 : n)}
        aria-label={`${n} star${n === 1 ? "" : "s"}`}
        aria-pressed={n <= value}
        className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        <Star size={20} className={n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
      </button>
    ))}
  </div>
);

const Reviews = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
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
      setItems(Array.isArray(list?.items) ? list.items : []);
      setSummary(sum?.summary || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [ratingFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((review) => {
      const searchable = [
        review.guestName,
        review.booking?.bookingNumber,
        review.room?.roomNumber,
        review.comment,
        review.reply?.text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [items, search]);

  const toggleStatus = async (review) => {
    setBusyId(review._id);
    try {
      const nextStatus = review.status === "published" ? "hidden" : "published";
      await setReviewStatus(review._id, nextStatus);
      toast.success(nextStatus === "published" ? "Review published" : "Review hidden");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const saveReply = async () => {
    if (!replyText.trim()) {
      toast.error("Enter a reply");
      return;
    }
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

  const submit = async (event) => {
    event.preventDefault();
    if (!form.bookingNumber.trim()) {
      toast.error("Enter the booking number");
      return;
    }
    if (!form.rating) {
      toast.error("Select an overall rating");
      return;
    }

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

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const average = Number(summary?.average || 0);
  const distribution = summary?.distribution || {};

  return (
    <div className="space-y-5 text-slate-800">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Guest experience</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Reviews &amp; Feedback</h1>
          <p className="mt-1 text-sm text-slate-500">Manage guest ratings, comments, and hotel replies.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={17} /> Add review
        </button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-4 sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-slate-500">Average rating</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <span className="text-3xl font-bold text-slate-900">{summary ? average.toFixed(1) : "—"}</span>
            <span className="pb-1 text-sm text-slate-500">/ 5</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Stars value={Math.round(average)} size={16} />
            <span className="text-xs text-slate-500">{summary?.total ?? 0} published reviews</span>
          </div>
        </div>

        {[
          { key: "published", title: "Published", value: summary?.total ?? 0, tone: "text-emerald-700", marker: "bg-emerald-500" },
          { key: "hidden", title: "Hidden", value: summary?.hidden ?? 0, tone: "text-slate-600", marker: "bg-slate-400" },
          { key: "all", title: "All ratings", value: items.length, tone: "text-indigo-700", marker: "bg-indigo-500" },
        ].map((stat) => (
          <button
            type="button"
            key={stat.key}
            onClick={() => setStatusFilter(stat.key === "all" ? "" : stat.key)}
            className={`rounded border bg-white p-4 text-left ${
              (stat.key === "all" && !statusFilter) || statusFilter === stat.key
                ? "border-indigo-400"
                : "border-slate-200"
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-slate-500">
              <span className={`h-2 w-2 rounded-full ${stat.marker}`} />
              {stat.title}
            </span>
            <span className={`mt-2 block text-2xl font-bold ${stat.tone}`}>{stat.value}</span>
          </button>
        ))}
      </section>

      {summary?.distribution && (
        <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Rating distribution</h2>
            <span className="text-xs text-slate-500">Published reviews</span>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-5">
            {[5, 4, 3, 2, 1].map((n) => {
              const count = Number(distribution[n] || 0);
              const percent = summary.total ? Math.min(100, (count / summary.total) * 100) : 0;
              return (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRatingFilter(ratingFilter === String(n) ? "" : String(n))}
                  className="min-w-0 rounded text-left focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">{n} <Star size={12} className="fill-amber-400 text-amber-400" /></span>
                    <span>{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${percent}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded border border-slate-200 bg-white p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px_190px]">
          <label className="relative block">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, booking, room or comment"
              className={`${inputClass} pl-9`}
              aria-label="Search reviews"
            />
          </label>
          <select value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value)} className={inputClass}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
            <option value="">Published and hidden</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{loading ? "Loading reviews…" : `${visibleItems.length} review${visibleItems.length === 1 ? "" : "s"} shown`}</span>
          {(search || ratingFilter || statusFilter) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setRatingFilter(""); setStatusFilter(""); }}
              className="rounded border border-slate-200 px-3 py-1.5 font-medium text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded border border-slate-200 bg-white text-slate-500">
          <Loader2 size={22} /> <span className="ml-2 text-sm">Loading reviews</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white px-4 py-14 text-center">
          <MessageSquare size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-800">No reviews found</p>
          <p className="mt-1 text-sm text-slate-500">Try changing your filters or add a new review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((review) => {
            const isBusy = busyId === review._id;
            return (
              <article key={review._id} className="rounded border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{review.guestName || "Guest"}</h3>
                      <Stars value={review.rating} size={15} />
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[review.status] || STATUS_STYLES.hidden}`}>
                        {label(review.status)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>Booking: {review.booking?.bookingNumber || "—"}</span>
                      <span>Room: {review.room?.roomNumber || "—"}</span>
                      <span>{review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-IN") : "—"}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setReplyFor(replyFor === review._id ? null : review._id); setReplyText(review.reply?.text || ""); }}
                      title="Reply to review"
                      aria-label="Reply to review"
                      className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700"
                    >
                      <MessageSquare size={15} /> Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStatus(review)}
                      disabled={isBusy}
                      title={review.status === "published" ? "Hide review" : "Publish review"}
                      aria-label={review.status === "published" ? "Hide review" : "Publish review"}
                      className="inline-flex min-h-9 items-center gap-2 rounded border border-slate-300 px-3 text-sm font-medium text-slate-700 disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 size={15} /> : review.status === "published" ? <EyeOff size={15} /> : <Eye size={15} />}
                      <span>{review.status === "published" ? "Hide" : "Publish"}</span>
                    </button>
                  </div>
                </div>

                {review.comment && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{review.comment}</p>}

                {CATEGORIES.some(([key]) => review.categories?.[key]) && (
                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                    {CATEGORIES.filter(([key]) => review.categories?.[key]).map(([key, name]) => (
                      <div key={key} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-xs">
                        <span className="text-slate-600">{name}</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          {review.categories[key]}/5 <Star size={12} className="fill-amber-400 text-amber-400" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {review.reply?.text && replyFor !== review._id && (
                  <div className="mt-4 rounded border border-indigo-100 bg-indigo-50/50 p-3 sm:p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">Hotel reply</p>
                    <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{review.reply.text}</p>
                  </div>
                )}

                {replyFor === review._id && (
                  <div className="mt-4 space-y-3 rounded border border-slate-200 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={`reply-${review._id}`} className="text-sm font-semibold text-slate-800">Hotel reply</label>
                      <span className="text-xs text-slate-400">{replyText.length}/500</span>
                    </div>
                    <textarea
                      id={`reply-${review._id}`}
                      rows={3}
                      maxLength={500}
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      placeholder="Write a helpful reply to the guest"
                      className={inputClass}
                    />
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => { setReplyFor(null); setReplyText(""); }} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cancel</button>
                      <button type="button" onClick={saveReply} disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {isBusy && <Loader2 size={15} />} Save reply
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setOpen(false); }}>
          <form onSubmit={submit} className="my-auto w-full max-w-xl rounded border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add guest review</h2>
                <p className="mt-1 text-sm text-slate-500">Record a rating and feedback for a completed stay.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={saving} aria-label="Close form" className="rounded border border-slate-200 p-2 text-slate-500 disabled:opacity-50"><X size={17} /></button>
            </div>
            <div className="space-y-5 p-4 sm:p-5">
              <div>
                <label htmlFor="bookingNumber" className="mb-1.5 block text-sm font-medium text-slate-700">Booking number <span className="text-rose-600">*</span></label>
                <input id="bookingNumber" value={form.bookingNumber} onChange={(event) => updateForm("bookingNumber", event.target.value)} placeholder="Enter checked-out booking number" className={inputClass} />
              </div>
              <div className="rounded border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-sm font-semibold text-slate-800">Overall rating <span className="text-rose-600">*</span></label>
                  <span className="text-xs text-slate-500">{form.rating ? `${form.rating} out of 5` : "Not rated"}</span>
                </div>
                <div className="mt-2"><StarPicker value={form.rating} onChange={(rating) => updateForm("rating", rating)} /></div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Category ratings <span className="font-normal text-slate-500">(optional)</span></p>
                <div className="divide-y divide-slate-100 rounded border border-slate-200 px-3">
                  {CATEGORIES.map(([key, name]) => (
                    <div key={key} className="flex flex-col gap-1.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm text-slate-600">{name}</span>
                      <StarPicker value={form.categories[key] || 0} onChange={(rating) => updateForm("categories", { ...form.categories, [key]: rating || undefined })} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="guestComment" className="text-sm font-medium text-slate-700">Guest comment</label>
                  <span className="text-xs text-slate-400">{form.comment.length}/1000</span>
                </div>
                <textarea id="guestComment" rows={4} maxLength={1000} value={form.comment} onChange={(event) => updateForm("comment", event.target.value)} placeholder="Enter the guest's feedback" className={inputClass} />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end sm:p-5">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? <Loader2 size={16} /> : <Plus size={16} />} {saving ? "Saving review…" : "Save review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Reviews;
