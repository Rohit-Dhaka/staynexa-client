

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  listHalls,
  checkAvailability,
  createBooking,
} from "../services/banquet.service";

const initialForm = {
  eventType: "birthday",
  eventName: "",
  eventDate: "",
  startTime: "18:00",
  endTime: "22:00",
  expectedGuests: "",
  setupStyle: "banquet",
  specialRequests: "",
};

const eventTypes = [
  "wedding",
  "reception",
  "engagement",
  "birthday",
  "anniversary",
  "corporate",
  "conference",
  "party",
  "other",
];

const setupStyles = [
  "banquet",
  "theatre",
  "classroom",
  "u_shape",
  "cocktail",
  "boardroom",
  "other",
];

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function GuestBanquetBooking() {
  const { hallId } = useParams();
  const navigate = useNavigate();

  const [hall, setHall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  

  const [form, setForm] = useState(initialForm);
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [createdBooking, setCreatedBooking] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadHall() {
      try {
        setLoading(true);
        setError("");

        const response = await listHalls({
          active: true,
          page: 1,
          limit: 100,
        });

        const items = Array.isArray(response)
          ? response
          : (response?.items ??
            response?.halls ??
            response?.data?.items ??
            response?.data?.halls ??
            []);

        const selected = items.find(
          (item) => String(item._id || item.id) === String(hallId),
        );

        if (active) {
          if (selected) {
            setHall(selected);
          } else {
            setError("Banquet hall nahi mila ya ab active nahi hai.");
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message || "Banquet hall load nahi ho paaya.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHall();

    return () => {
      active = false;
    };
  }, [hallId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setAvailability(null);
    setError("");
    setSuccess("");
  }

  async function handleCheckAvailability(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setAvailability(null);

    if (!hall) return;

    if (!form.eventDate || !form.startTime || !form.endTime) {
      setError("Enter your event date and start/end times.");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("End time must be after the start time.");
      return;
    }

    if (new Date(`${form.eventDate}T${form.startTime}`) <= new Date()) {
      setError("Please select a future date and time.");
      return;
    }

    const guests = Number(form.expectedGuests);

    if (!Number.isInteger(guests) || guests < 1) {
      setError("Please enter a valid number of guests.");
      return;
    }

    if (hall.capacityMin != null && guests < hall.capacityMin) {
      setError(`This hall requires a minimum of ${hall.capacityMin} guests.`);
      return;
    }

    if (hall.capacityMax != null && guests > hall.capacityMax) {
      setError(
        `This hall has a maximum capacity of ${hall.capacityMax} guests.`,
      );
      return;
    }

    try {
      setChecking(true);

      const response = await checkAvailability({
        date: form.eventDate,
        startTime: form.startTime,
        endTime: form.endTime,
        guests,
      });

      const results = Array.isArray(response)
        ? response
        : (response?.halls ?? response?.items ?? []);

      const result = results.find(
        (item) =>
          String(item.hall?._id || item.hall?.id || item.hall) ===
          String(hall._id || hall.id),
      );

      if (!result) {
        setError("Is hall ki availability response mein nahi mili.");
        return;
      }

      setAvailability(result);

      if (!result.available) {
        setError(result.reason || "Is time par hall available nahi hai.");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Availability check nahi ho paayi.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleBooking(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!hall) {
      setError("Banquet hall select nahi hua.");
      return;
    }

    if (!availability?.available) {
      setError("Pehle availability check karein.");
      return;
    }

    try {
      setBooking(true);

      const response = await createBooking({
        hall: hall._id || hall.id,
        eventType: form.eventType,
        eventName: form.eventName.trim(),
        eventDate: form.eventDate,
        startTime: form.startTime,
        endTime: form.endTime,
        expectedGuests: Number(form.expectedGuests),
        setupStyle: form.setupStyle,
        specialRequests: form.specialRequests.trim(),
      });

      const result = response?.booking ?? response?.data ?? response;

      setCreatedBooking(result);

      setSuccess(
        "Your banquet booking request has been submitted successfully.",
      );
      setAvailability(null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Booking submit nahi hui. Please dobara try karein.",
      );
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return <main className="p-6">Loading hall details...</main>;
  }

  if (!hall) {
    return (
      <main className="mx-auto  p-6">
        <p className="rounded bg-red-50 p-4 text-red-700">
          {error || "Banquet hall nahi mila."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/guest/banquet")}
          className="mt-4 rounded bg-black px-4 py-2 text-white"
        >
          Back to Banquet Halls
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen  p-6">
        <div className="mx-auto  animate-pulse rounded border border-gray-200 bg-white p-6">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="mt-4 h-4 w-72 max-w-full rounded bg-gray-100" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-12 rounded bg-gray-100" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!hall) {
    return (
      <main className="min-h-screen  px-4 py-10">
        <div className="mx-auto max-w-xl rounded border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800">
            Banquet Hall Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || "This banquet hall is unavailable."}
          </p>
          <button
            type="button"
            onClick={() => navigate("/guest/banquet")}
            className="mt-6 rounded bg-black px-5 py-2.5 text-sm font-medium text-white "
          >
            Back to Banquet Halls
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen   ">
      <div className="mx-auto">
        <button
          type="button"
          onClick={() => navigate("/guest/banquet")}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition "
        >
          <span aria-hidden="true">←</span>
          Back to Banquet Halls
        </button>

        <div className="overflow-hidden rounded border border-gray-200 bg-white ">
        
          <div className="border-b border-gray-100 bg-black/60 px-5 py-6 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Banquet Reservation
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-gray-800 sm:text-3xl">
              Book {hall.name}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {hall.description ||
                "Enter your event details to request a booking."}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {hall.capacityMax != null && (
                <span className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                  Capacity:{" "}
                  <span className="font-semibold text-gray-800">
                    {hall.capacityMin ?? 1}–{hall.capacityMax}
                  </span>
                </span>
              )}

              {hall.rate != null && (
                <span className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">
                    ₹{Number(hall.rate).toLocaleString("en-IN")}
                  </span>{" "}
                  / {hall.pricingType === "per_hour" ? "hour" : "event"}
                </span>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {error && (
              <div
                role="alert"
                className="mb-5 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

     {success && (
  <div className="mt-6 rounded border border-green-200 bg-white p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">
        ✓
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Booking Request Submitted
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Your request has been received. It is awaiting hotel confirmation.
        </p>
      </div>
    </div>

    <div className="mt-5 rounded  p-4">
      <p className="text-xs text-gray-500">Booking ID</p>

      <p className="mt-1 break-all font-semibold text-gray-800">
        {createdBooking?._id ||
          createdBooking?.id ||
          createdBooking?.bookingNumber ||
          "Booking created"}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-gray-500">Banquet Hall</p>
          <p className="mt-1 font-medium text-gray-800">
            {hall.name}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Event Type</p>
          <p className="mt-1 font-medium capitalize text-gray-800">
            {form.eventType.replaceAll("_", " ")}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Event Date</p>
          <p className="mt-1 font-medium text-gray-800">
            {form.eventDate}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Event Time</p>
          <p className="mt-1 font-medium text-gray-800">
            {form.startTime} – {form.endTime}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Expected Guests</p>
          <p className="mt-1 font-medium text-gray-800">
            {Number(form.expectedGuests).toLocaleString("en-IN")}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Booking Status</p>
          <span className="mt-1 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            {createdBooking?.status || "tentative"}
          </span>
        </div>
      </div>
    </div>

    <p className="mt-4 text-sm text-gray-500">
      The hotel administrator will review your request and update its status.
    </p>

    <button
      type="button"
      onClick={() => navigate("/guest/banquet")}
      className="mt-5 w-full rounded bg-black px-4 py-3 text-sm font-semibold text-white "
    >
      Back to Banquet Halls
    </button>
  </div>
)}

            {!success && (
              <form onSubmit={handleBooking} className="space-y-7">
                <section>
                  <h2 className="text-base font-semibold text-gray-800">
                    Event Information
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Tell us about your upcoming event.
                  </p>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Event Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="eventType"
                        value={form.eventType}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {eventTypes.map((type) => (
                          <option key={type} value={type}>
                            {type
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Event Name
                      </label>
                      <input
                        name="eventName"
                        value={form.eventName}
                        onChange={handleChange}
                        placeholder="e.g. Birthday Celebration"
                        className="w-full rounded border border-gray-200 px-3 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Event Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="eventDate"
                        value={form.eventDate}
                        min={getToday()}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Expected Guests <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="expectedGuests"
                        value={form.expectedGuests}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        required
                        placeholder="e.g. 100"
                        className="w-full rounded border border-gray-200 px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-6">
                  <h2 className="text-base font-semibold text-gray-800">
                    Event Timing & Setup
                  </h2>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        value={form.startTime}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        value={form.endTime}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Seating Setup <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="setupStyle"
                        value={form.setupStyle}
                        onChange={handleChange}
                        required
                        className="w-full rounded border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      >
                        {setupStyles.map((style) => (
                          <option key={style} value={style}>
                            {style
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="border-t border-gray-100 pt-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Special Requests
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Add any decoration, seating or other requirements.
                  </p>
                  <textarea
                    name="specialRequests"
                    value={form.specialRequests}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Write your requirements here..."
                    className="mt-3 w-full resize-y rounded border border-gray-200 px-3 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </section>

                <section className="border-t border-gray-100 pt-6">
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={checking || booking}
                    className="w-full rounded border border-blue-200 bg-black px-4 py-3 text-sm font-semibold text-blue-700 transition  disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checking
                      ? "Checking Availability..."
                      : "Check Availability"}
                  </button>

                  {availability && (
                    <div
                      role="status"
                      className={`mt-4 rounded border px-4 py-3 text-sm ${
                        availability.available
                          ? "border-green-200 bg-green-50 text-green-800"
                          : "border-red-200 bg-red-50 text-red-700"
                      }`}
                    >
                      <p className="font-medium">
                        {availability.available
                          ? "This hall is available for your selected time."
                          : availability.reason ||
                            "This hall is not available."}
                      </p>

                      {availability.estimatedHallCharge != null && (
                        <p className="mt-2">
                          Estimated hall charge:{" "}
                          <span className="font-semibold">
                            ₹
                            {Number(
                              availability.estimatedHallCharge,
                            ).toLocaleString("en-IN")}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={booking || checking || !availability?.available}
                    className="mt-4 w-full rounded bg-black px-4 py-3 text-sm font-semibold text-white transition  focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {booking
                      ? "Submitting Booking..."
                      : "Confirm Booking Request"}
                  </button>

                  <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                    Your booking will be validated by the hotel before final
                    confirmation.
                  </p>
                </section>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
