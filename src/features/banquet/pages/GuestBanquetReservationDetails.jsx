
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBooking } from "../services/banquet.service";

export default function GuestBanquetReservationDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadBooking = async () => {
      try {
        setLoading(true);
        setError("");

        const result = await getBooking(bookingId);
        const data = result?.booking ?? result?.data ?? result;

        if (active) setBooking(data);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Unable to load reservation details."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBooking();

    return () => {
      active = false;
    };
  }, [bookingId]);

  const formatDate = (value) => {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatLabel = (value) => {
    if (!value) return "—";

    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (loading) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-white">
        <p className="text-sm text-slate-500">
          Loading reservation details...
        </p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-white px-6">
        <p className="text-sm text-red-600">
          {error || "Reservation not found."}
        </p>

        <button
          onClick={() => navigate("/guest/banquet/my-reservations")}
          className="text-sm font-medium text-indigo-600 "
        >
          ← Back to My Reservations
        </button>
      </main>
    );
  }

  const status = String(booking.status || "tentative").toLowerCase();

  const statusStyles = {
    tentative: "bg-amber-50 text-amber-700",
    confirmed: "bg-emerald-50 text-emerald-700",
    completed: "bg-black text-blue-700",
    cancelled: "bg-red-50 text-red-700",
  };

  const details = [
    ["Event Name", booking.eventName],
    ["Event Type", formatLabel(booking.eventType)],
    ["Banquet Hall", booking.hall?.name || booking.hallName],
    ["Event Date", formatDate(booking.eventDate)],
    ["Start Time", booking.startTime],
    ["End Time", booking.endTime],
    ["Expected Guests", booking.expectedGuests],
    ["Setup Style", formatLabel(booking.setupStyle)],
  ];

  return (
    <main className="min-h-screen w-full bg-white text-slate-800">
      <div className="w-full px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <button
            onClick={() => navigate("/guest/banquet/my-reservations")}
            className="text-sm font-medium text-slate-600 transition "
          >
            ← My Banquet Reservations
          </button>

          <button
            onClick={() => navigate("/guest/banquet")}
            className="text-sm font-medium text-indigo-600 transition "
          >
            Book a Hall +
          </button>
        </div>

        
        <section className="flex flex-col justify-between gap-5 border-b border-slate-200 py-8 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500">
              Reservation Overview
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              {booking.eventName || formatLabel(booking.eventType) || "Banquet Reservation"}
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              Booking ID:{" "}
              <span className="font-medium text-slate-700">
                {booking.bookingNumber || booking._id || booking.id || "—"}
              </span>
            </p>
          </div>

          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                statusStyles[status] || "bg-slate-100 text-slate-700"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {formatLabel(status)}
            </span>
          </div>
        </section>

        
        <section className="py-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Event Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Information provided with your reservation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-12 sm:grid-cols-2 lg:grid-cols-4">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="border-b border-slate-100 py-5"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 break-words text-base font-medium text-slate-900">
                  {value === null || value === undefined || value === ""
                    ? "—"
                    : value}
                </p>
              </div>
            ))}
          </div>
        </section>

        
        <section className="border-t border-slate-200 py-7">
          <h2 className="text-lg font-semibold text-slate-900">
            Special Requests
          </h2>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {booking.specialRequests || "No special requests provided."}
          </p>
        </section>

        
        <section className="border-t border-slate-200 py-7">
          <h2 className="text-lg font-semibold text-slate-900">
            Booking Update
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {status === "tentative"
              ? "Your reservation request has been submitted and is awaiting confirmation from the hotel team."
              : status === "confirmed"
                ? "Your reservation has been confirmed by the hotel team."
                : status === "completed"
                  ? "Your event has been marked as completed."
                  : status === "cancelled"
                    ? "This reservation has been cancelled. Please contact the hotel team if you need assistance."
                    : "Please contact the hotel team for the latest information about your reservation."}
          </p>
        </section>

        
        <div className="flex flex-wrap gap-3 border-t border-slate-200 py-6">
          <button
            onClick={() => navigate("/guest/banquet/my-reservations")}
            className="rounded bg-black px-5 py-3 text-sm font-medium text-white transition "
          >
            Back to My Reservations
          </button>
        </div>
      </div>
    </main>
  );
}
