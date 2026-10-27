import { useCallback, useEffect, useState } from "react";
import {
  Star,
  MessageSquare,
  RefreshCw,
  Send,
  CalendarDays,
  BedDouble,
  CheckCircle2,
  Clock3,
  AlertCircle,
  PenLine,
} from "lucide-react";
import {
  getEligibleBookings,
  getMyReviews,
  createGuestReview,
} from "../services/GuestReviews.service";

const CATEGORY_FIELDS = [
  { key: "cleanliness", label: "Cleanliness" },
  { key: "service", label: "Staff & Service" },
  { key: "comfort", label: "Room Comfort" },
  { key: "food", label: "Food & Dining" },
  { key: "valueForMoney", label: "Value for Money" },
];

const EMPTY_CATEGORIES = {
  cleanliness: 0,
  service: 0,
  comfort: 0,
  food: 0,
  valueForMoney: 0,
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

function Stars({ value = 0, onChange, size = 22, readOnly = false }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          aria-pressed={!readOnly ? value === star : undefined}
          className={`rounded transition ${
            readOnly
              ? "cursor-default"
              : "cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300"
          }`}
        >
          <Star
            size={size}
            strokeWidth={1.8}
            className={
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

function RatingLabel({ rating }) {
  const labels = {
    1: "Poor",
    2: "Fair",
    3: "Good",
    4: "Very good",
    5: "Excellent",
  };

  return (
    <span className="text-sm font-semibold text-slate-600">
      {labels[rating] || "Select a rating"}
    </span>
  );
}

function SummaryCard({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-5 ">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded p-3 ${color}`}>
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}

export default function GuestReviews() {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [rating, setRating] = useState(0);
  const [categories, setCategories] = useState({ ...EMPTY_CATEGORIES });
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [bookingResult, reviewResult] = await Promise.allSettled([
      getEligibleBookings(),
      getMyReviews(),
    ]);

    if (bookingResult.status === "fulfilled") {
      const nextBookings = getList(bookingResult.value, [
        "bookings",
        "eligibleBookings",
        "items",
        "results",
      ]);
      setBookings(nextBookings);
      setSelectedBookingId((current) =>
        current && nextBookings.some((booking) => booking._id === current)
          ? current
          : nextBookings[0]?._id || ""
      );
    } else {
      setBookings([]);
      setSelectedBookingId("");
      setError(getErrorMessage(bookingResult.reason));
    }

    if (reviewResult.status === "fulfilled") {
      setReviews(getList(reviewResult.value, ["reviews", "items", "results"]));
    } else {
      setReviews([]);
      setError((current) =>
        current
          ? `${current} Also, review history could not be loaded: ${getErrorMessage(reviewResult.reason)}`
          : `Review history could not be loaded: ${getErrorMessage(reviewResult.reason)}`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedBooking = bookings.find(
    (booking) => booking._id === selectedBookingId
  );

  const handleCategoryRating = (key, value) => {
    setCategories((current) => ({ ...current, [key]: value }));
  };

  const handleBookingChange = (bookingId) => {
    setSelectedBookingId(bookingId);
    setRating(0);
    setCategories({ ...EMPTY_CATEGORIES });
    setComment("");
    setNotice("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");

    if (!selectedBookingId) {
      setError("There is no eligible completed booking to review.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Please select an overall star rating.");
      return;
    }

    if (comment.trim().length > 1000) {
      setError("Your comment must not exceed 1000 characters.");
      return;
    }

    const selectedCategories = Object.fromEntries(
      Object.entries(categories).filter(([, value]) => value > 0)
    );

    setSubmitting(true);
    try {
      await createGuestReview({
        bookingId: selectedBookingId,
        rating,
        categories: selectedCategories,
        comment: comment.trim(),
      });

      setNotice("Thank you! Your review has been submitted successfully.");
      setRating(0);
      setCategories({ ...EMPTY_CATEGORIES });
      setComment("");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (total, review) => total + Number(review.rating || 0),
            0
          ) / reviews.length
        ).toFixed(1)
      : "—";

  return (
    <main className="min-h-screen   ">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
         
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Reviews
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Share your stay experience and help us make every visit better.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700  transition hover:bg-slate-100 disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard label="Pending Reviews" value={loading ? "—" : bookings.length} icon={Clock3} color="bg-amber-50 text-amber-600" />
          <SummaryCard label="Reviews Submitted" value={loading ? "—" : reviews.length} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
          <SummaryCard label="Your Average Rating" value={loading ? "—" : averageRating} icon={Star} color="bg-blue-100 text-indigo-600" />
        </section>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div role="status" className="flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {loading ? (
          <div className="rounded border border-slate-200 bg-white p-12 text-center text-slate-500">
            Loading your reviews...
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="overflow-hidden rounded border border-slate-200 bg-white ">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded bg-blue-100 p-3 text-indigo-600"><PenLine size={22} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Create a Review</h2>
                    <p className="mt-1 text-sm text-slate-500">Rate your completed stay and share your feedback.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-6">
                {bookings.length === 0 ? (
                  <div className="rounded border border-dashed border-amber-200 bg-amber-50 px-5 py-6">
                    <div className="flex items-start gap-3">
                      <Clock3 size={21} className="mt-0.5 shrink-0 text-amber-600" />
                      <div>
                        <h3 className="font-semibold text-amber-900">No eligible bookings found</h3>
                        <p className="mt-1 text-sm leading-6 text-amber-800">
                          A review must be linked to a completed booking. After checkout, refresh this page. If you have already checked out, ask the hotel administrator to verify your booking status and guest account link.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="review-booking" className="mb-2 block text-sm font-semibold text-slate-700">
                        Select Booking <span className="text-red-500">*</span>
                      </label>
                      <select id="review-booking" value={selectedBookingId} onChange={(event) => handleBookingChange(event.target.value)} required className="w-full rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
                        {bookings.map((booking) => (
                          <option key={booking._id} value={booking._id}>
                            {booking.bookingNumber || booking._id} — Room {booking.room?.roomNumber || "N/A"}
                          </option>
                        ))}
                      </select>
                      {selectedBooking && (
                        <div className="mt-3 rounded bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                            <span className="inline-flex items-center gap-2"><BedDouble size={16} className="text-indigo-500" />Room {selectedBooking.room?.roomNumber || "N/A"}</span>
                            <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="text-indigo-500" />{formatDate(selectedBooking.checkIn)} – {formatDate(selectedBooking.checkOut)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-700">Overall Experience <span className="text-red-500">*</span></p>
                      <div className="flex flex-wrap items-center gap-3"><Stars value={rating} onChange={setRating} size={30} /><RatingLabel rating={rating} /></div>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-700">Rate Different Areas <span className="font-normal text-slate-400">(optional)</span></p>
                      <div className="space-y-3">
                        {CATEGORY_FIELDS.map((category) => (
                          <div key={category.key} className="flex flex-col gap-2 rounded border border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-sm font-medium text-slate-700">{category.label}</span>
                            <Stars value={categories[category.key]} onChange={(value) => handleCategoryRating(category.key, value)} size={19} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label htmlFor="review-comment" className="text-sm font-semibold text-slate-700">Your Comments</label>
                        <span className="text-xs text-slate-400">{comment.length}/1000</span>
                      </div>
                      <textarea id="review-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={4} placeholder="Tell us what you liked or what we can improve..." className="w-full resize-y rounded border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                    </div>

                    <button type="submit" disabled={submitting || !selectedBookingId} className="inline-flex w-full items-center justify-center gap-2 rounded bg-black px-5 py-3 font-semibold text-white  transition  disabled:cursor-not-allowed disabled:opacity-60">
                      <Send size={17} />
                      {submitting ? "Submitting Review..." : "Create Review"}
                    </button>
                    <p className="text-center text-xs leading-5 text-slate-400">You can submit one review per completed booking.</p>
                  </>
                )}
              </form>
            </section>

            <section className="overflow-hidden rounded border border-slate-200 bg-white ">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded bg-emerald-50 p-3 text-emerald-600"><MessageSquare size={22} /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Review History</h2>
                    <p className="mt-1 text-sm text-slate-500">Your feedback and hotel responses.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                {reviews.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageSquare size={32} className="mx-auto text-slate-300" />
                    <h3 className="mt-3 font-semibold text-slate-800">No reviews yet</h3>
                    <p className="mt-2 text-sm text-slate-500">Reviews you submit will appear here.</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <article key={review._id} className="rounded border border-slate-200 p-4 transition hover:border-indigo-200">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">Room {review.room?.roomNumber || "N/A"}</p>
                          <p className="mt-1 text-xs text-slate-500">Booking {review.booking?.bookingNumber || "—"}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${review.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {review.status === "published" ? "Published" : "Pending / Hidden"}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3"><Stars value={review.rating} size={17} readOnly /><span className="text-sm font-semibold text-slate-700">{review.rating}/5</span></div>
                      {review.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.comment}</p>}
                      <p className="mt-3 text-xs text-slate-400">Submitted {formatDate(review.createdAt)}</p>
                      {review.reply?.text && (
                        <div className="mt-4 rounded border border-indigo-100 bg-black/70 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Response from the hotel</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{review.reply.text}</p>
                          {review.reply.at && <p className="mt-2 text-xs text-slate-400">{formatDate(review.reply.at)}</p>}
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
