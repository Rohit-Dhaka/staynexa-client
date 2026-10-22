
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listBookings } from "../services/banquet.service";

const statusStyles = {
  tentative: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-black text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status) => {
  const value = String(status || "tentative").toLowerCase();

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function GuestBanquetReservations() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await listBookings({ page: 1, limit: 50 });
      const items = Array.isArray(result)
        ? result
        : result?.items || result?.bookings || [];

      setBookings(items);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load your banquet reservations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const counts = {
    total: bookings.length,
    tentative: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "tentative"
    ).length,
    confirmed: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "confirmed"
    ).length,
    completed: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "completed"
    ).length,
    cancelled: bookings.filter(
      (b) => String(b.status || "").toLowerCase() === "cancelled"
    ).length,
  };

  const filteredBookings =
    filter === "all"
      ? bookings
      : bookings.filter(
          (booking) =>
            String(booking.status || "tentative").toLowerCase() === filter
        );

  const summaryItems = [
    {
      label: "Total Reservations",
      value: counts.total,
      color: "text-slate-900",
    },
    {
      label: "Awaiting Approval",
      value: counts.tentative,
      color: "text-amber-600",
    },
    {
      label: "Confirmed",
      value: counts.confirmed,
      color: "text-emerald-600",
    },
    {
      label: "Completed",
      value: counts.completed,
      color: "text-blue-600",
    },
  ];

  return (
    <main className="min-h-screen w-full bg-slate-50 text-slate-800">
      <div className="w-full  py-7 ">
        {/* Page heading */}
        <header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-600">
              Guest Dashboard / Banquet
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              My Banquet Reservations
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your event bookings and track their latest status.
            </p>
          </div>

          <button
            onClick={() => navigate("/guest/banquet")}
            className="inline-flex w-fit items-center justify-center gap-2 rounded bg-black px-5 py-3 text-sm font-semibold text-white transition "
          >
            <span className="text-lg leading-none">+</span>
            Book a Banquet Hall
          </button>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-2 gap-4 py-7 lg:grid-cols-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded border border-slate-200 bg-white p-5"
            >
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Reservations */}
        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Your Reservations
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {bookings.length} reservation
                {bookings.length === 1 ? "" : "s"} found
              </p>
            </div>

            <button
              onClick={loadBookings}
              disabled={loading}
              className="w-fit rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-4 sm:px-6">
            {[
              ["all", "All"],
              ["tentative", "Pending"],
              ["confirmed", "Confirmed"],
              ["completed", "Completed"],
              ["cancelled", "Cancelled"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`shrink-0 rounded px-4 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {label}
                {value === "all" ? ` (${counts.total})` : ""}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
              Loading your reservations...
            </div>
          ) : error ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={loadBookings}
                className="mt-4 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white "
              >
                Try Again
              </button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
                ♧
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                {bookings.length === 0
                  ? "No reservations yet"
                  : "No reservations in this category"}
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {bookings.length === 0
                  ? "Your banquet bookings will appear here after you submit a reservation request."
                  : "Try selecting another status to see your reservations."}
              </p>

              {bookings.length === 0 && (
                <button
                  onClick={() => navigate("/guest/banquet")}
                  className="mt-5 rounded bg-black px-5 py-2.5 text-sm font-semibold text-white "
                >
                  Explore Banquet Halls
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredBookings.map((booking) => {
                const status = String(
                  booking.status || "tentative"
                ).toLowerCase();

                const bookingId =
                  booking._id || booking.id || booking.bookingNumber;

                const hallName =
                  booking.hall?.name ||
                  booking.hallName ||
                  "Banquet Hall";

                return (
                  <article
                    key={booking._id || booking.id || booking.bookingNumber}
                    className="px-5 py-6 transition hover:bg-slate-50/70 sm:px-6"
                  >
                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-slate-900">
                            {booking.eventName ||
                              formatStatus(booking.eventType) ||
                              "Banquet Event"}
                          </h3>

                          <span
                            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-medium ${
                              statusStyles[status] ||
                              "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {formatStatus(status)}
                          </span>
                        </div>

                        <p className="mt-2 break-all text-xs text-slate-500">
                          Booking ID: {booking.bookingNumber || bookingId || "—"}
                        </p>

                        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-500">
                              Banquet Hall
                            </p>
                            <p className="mt-1.5 text-sm font-medium text-slate-800">
                              {hallName}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Event Date
                            </p>
                            <p className="mt-1.5 text-sm font-medium text-slate-800">
                              {formatDate(booking.eventDate)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Event Time
                            </p>
                            <p className="mt-1.5 text-sm font-medium text-slate-800">
                              {booking.startTime || "—"}
                              {booking.endTime
                                ? ` – ${booking.endTime}`
                                : ""}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-slate-500">
                              Expected Guests
                            </p>
                            <p className="mt-1.5 text-sm font-medium text-slate-800">
                              {booking.expectedGuests ?? "—"}
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 text-sm leading-6 text-slate-500">
                          {status === "tentative"
                            ? "Your request is awaiting confirmation from the hotel team."
                            : status === "confirmed"
                              ? "Your reservation has been confirmed."
                              : status === "completed"
                                ? "This event has been marked as completed."
                                : status === "cancelled"
                                  ? "This reservation has been cancelled."
                                  : "View your reservation for more information."}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          navigate(
                            `/guest/banquet/reservations/${bookingId}`
                          )
                        }
                        className="inline-flex w-fit shrink-0 items-center gap-2 rounded border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        View Details
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Reservation status reflects the latest information available from the hotel team.
        </p>
      </div>
    </main>
  );
}
