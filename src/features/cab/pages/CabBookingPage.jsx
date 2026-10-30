import { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  CheckCircle2,
  Clock3,
  MapPin,
  Users,
  RefreshCw,
  CalendarCheck,
} from "lucide-react";

import {
  VEHICLE_TYPES,
  TRIP_TYPES,
  getCabRates,
  estimateCabFare,
  createCabBooking,
  getCabBookings,
  cancelCabBooking,
} from "../services/cab.service";

const TRIP_LABELS = {
  airport_pickup: "Airport Pickup",
  airport_drop: "Airport Drop",
  local: "Local Trip",
  outstation: "Outstation",
  point_to_point: "Point to Point",
};

const VEHICLE_LABELS = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  suv: "SUV",
  tempo_traveller: "Tempo Traveller",
};

const MAX_PASSENGERS = {
  hatchback: 4,
  sedan: 4,
  suv: 6,
  tempo_traveller: 12,
};

const PAYMENT_OPTIONS = [
  { value: "online", label: "Online Payment" },
  { value: "cash", label: "Cash" },
];

const inputClass =
  "mt-1.5 w-full rounded border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-black focus:ring-1 focus:ring-black";

const labelClass = "block text-sm font-medium text-neutral-800";

const initialForm = () => ({
  booking: "",
  tripType: "airport_drop",
  vehicleType: "sedan",
  pickupAt: "",
  pickupLocation: "",
  dropLocation: "",
  passengerName: "",
  passengerPhone: "",
  passengers: 1,
  luggage: 0,
  durationHours: 4,
  days: 1,
  distanceKm: "",
  notes: "",
  paymentMode: "online",
});

function getLocalDateTimeMinimum() {
  const date = new Date(Date.now() + 30 * 60 * 1000);
  date.setSeconds(0, 0);

  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Not available";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function Field({ label, required = false, children }) {
  return (
    <label className={labelClass}>
      {label}
      {required && <span className="ml-1 text-neutral-700">*</span>}
      {children}
    </label>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-neutral-500">{label}</span>
      <span
        className={`text-right text-sm ${
          strong ? "font-semibold text-neutral-950" : "text-neutral-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CabBookingPage() {

  const [form, setForm] = useState(initialForm);
  const [rates, setRates] = useState([]);
  const [estimate, setEstimate] = useState(null);

  const [loadingRates, setLoadingRates] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [myBookings, setMyBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [refreshingBookings, setRefreshingBookings] = useState(false);
  const [bookingListError, setBookingListError] = useState("");
  const [cancellingId, setCancellingId] = useState("");

  const minimumPickupTime = useMemo(() => getLocalDateTimeMinimum(), []);

  const needsPickupLocation = [
    "airport_pickup",
    "point_to_point",
  ].includes(form.tripType);

  const needsDropLocation = [
    "point_to_point",
    "outstation",
  ].includes(form.tripType);

  const needsDuration = form.tripType === "local";
  const needsDays = form.tripType === "outstation";
  const needsDistance = ["point_to_point", "outstation"].includes(
    form.tripType,
  );

  const selectedRate = rates.find(
    (rate) => rate.vehicleType === form.vehicleType,
  );

  const vehicleIsAvailable = selectedRate
    ? selectedRate.isActive !== false
    : true;

  useEffect(() => {
    let active = true;

    async function loadRates() {
      try {
        setLoadingRates(true);

        const response = await getCabRates();
        const rateCandidate = Array.isArray(response)
          ? response
          : response?.rates ||
            response?.data?.rates ||
            response?.data?.data?.rates ||
            response?.data ||
            [];
        const list = Array.isArray(rateCandidate) ? rateCandidate : [];

        if (!active) return;

        setRates(list);

        if (list.length > 0) {
          setForm((current) => {
            const currentRateExists = list.some(
              (rate) => rate.vehicleType === current.vehicleType,
            );

            return currentRateExists
              ? current
              : {
                  ...current,
                  vehicleType: list[0].vehicleType,
                };
          });
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) setLoadingRates(false);
      }
    }

    loadRates();

    return () => {
      active = false;
    };
  }, []);

  async function loadMyCabBookings({ silent = false } = {}) {
    try {
      if (silent) setRefreshingBookings(true);
      else setLoadingBookings(true);
      setBookingListError("");

      const response = await getCabBookings({ page: 1, limit: 100 });
      const bookingCandidate = Array.isArray(response)
        ? response
        : response?.cabs ||
          response?.bookings ||
          response?.items ||
          response?.data?.cabs ||
          response?.data?.bookings ||
          response?.data?.items ||
          (Array.isArray(response?.data) ? response.data : []);
      const list = Array.isArray(bookingCandidate) ? bookingCandidate : [];
      setMyBookings(list);
    } catch (err) {
      setBookingListError(getErrorMessage(err));
    } finally {
      setLoadingBookings(false);
      setRefreshingBookings(false);
    }
  }

  useEffect(() => {
    loadMyCabBookings();
  }, []);

  async function handleCancelCabBooking(booking) {
    const bookingId = booking?._id || booking?.id;
    if (!bookingId) {
      setBookingListError("This booking cannot be cancelled because its ID is missing.");
      return;
    }
    const confirmed = window.confirm(`Cancel cab booking ${booking.cabNumber || ""}?`);
    if (!confirmed) return;

    try {
      setCancellingId(String(bookingId));
      setBookingListError("");
      await cancelCabBooking(bookingId, "Cancelled by guest");
      await loadMyCabBookings({ silent: true });
      setSuccessMessage(`Cab booking ${booking.cabNumber || ""} cancelled successfully.`);
    } catch (err) {
      setBookingListError(getErrorMessage(err));
    } finally {
      setCancellingId("");
    }
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setEstimate(null);
    setError("");
    setSuccessMessage("");
  }

  function validateForm() {
    if (!form.pickupAt) {
      return "Please select the pickup date and time.";
    }

    if (new Date(form.pickupAt).getTime() < Date.now() + 30 * 60 * 1000) {
      return "Please choose a pickup time at least 30 minutes from now.";
    }

    if (!form.passengerName.trim()) {
      return "Please enter the passenger name.";
    }

    if (!form.passengerPhone.trim()) {
      return "Please enter the passenger phone number.";
    }

    if (!/^[+]?[\d\s()-]{7,20}$/.test(form.passengerPhone.trim())) {
      return "Please enter a valid passenger phone number.";
    }

    if (
      Number(form.passengers) < 1 ||
      Number(form.passengers) > (MAX_PASSENGERS[form.vehicleType] || 4)
    ) {
      return `This vehicle supports up to ${
        MAX_PASSENGERS[form.vehicleType] || 4
      } passengers.`;
    }

    if (needsPickupLocation && !form.pickupLocation.trim()) {
      return "Please enter the pickup location.";
    }

    if (needsDropLocation && !form.dropLocation.trim()) {
      return "Please enter the drop location.";
    }

    if (needsDuration && Number(form.durationHours) < 1) {
      return "Local trips must be at least 1 hour.";
    }

    if (needsDays && Number(form.days) < 1) {
      return "Outstation trips must be at least 1 day.";
    }

    if (needsDistance && form.distanceKm !== "" && Number(form.distanceKm) < 0) {
      return "Distance cannot be negative.";
    }

    return "";
  }

function buildPayload() {
  return {
    tripType: form.tripType,
    vehicleType: form.vehicleType,
    pickupAt: new Date(form.pickupAt).toISOString(),
    pickup: form.pickupLocation.trim()
      ? { location: form.pickupLocation.trim() }
      : undefined,
    drop: form.dropLocation.trim()
      ? { location: form.dropLocation.trim() }
      : undefined,
    passenger: {
      name: form.passengerName.trim(),
      phone: form.passengerPhone.trim(),
    },
    passengers: Number(form.passengers),
    luggage: Number(form.luggage || 0),
    durationHours: form.tripType === "local"
      ? Number(form.durationHours)
      : undefined,
    days: form.tripType === "outstation"
      ? Number(form.days)
      : undefined,
    distanceKm: form.distanceKm !== ""
      ? Number(form.distanceKm)
      : undefined,
    paymentMode: form.paymentMode,
    notes: form.notes.trim(),
  };
}

  async function handleEstimate(event) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setEstimating(true);
      setError("");
      setSuccessMessage("");

      const payload = buildPayload();

      const params = {
        tripType: payload.tripType,
        vehicleType: payload.vehicleType,
        pickupAt: payload.pickupAt,
      };

      if (payload.durationHours !== undefined) {
        params.durationHours = payload.durationHours;
      }

      if (payload.days !== undefined) {
        params.days = payload.days;
      }

      if (payload.distanceKm !== undefined) {
        params.distanceKm = payload.distanceKm;
      }

      const response = await estimateCabFare(params);

      setEstimate(response?.estimate || response);
    } catch (err) {
      setError(getErrorMessage(err));
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const response = await createCabBooking(buildPayload());
      const cab = response?.cab || response?.booking || response;

      setSuccessMessage(
        `Cab booking request created successfully${
          cab?.cabNumber ? `: ${cab.cabNumber}` : ""
        }.`,
      );

      setForm(initialForm());
      setEstimate(null);

      
      await loadMyCabBookings({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen  text-neutral-950 ">
      <div className="mx-auto max-w-7xl">
    

        <header className="mt-2 rounded border border-neutral-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded bg-black text-white">
              <CarFront size={29} />
            </div>

            <div>
              <p className="text-sm font-medium text-black">
                StayNexa Transportation
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950 sm:text-3xl">
                Book a Cab
              </h1>
              <p className="mt-2 text-sm text-neutral-500">
                Schedule your ride and submit a cab booking request.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-800"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-5 flex items-start gap-2 rounded border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <section className="mt-6 rounded border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-neutral-950">My Cab Bookings</h2>
              <p className="mt-1 text-sm text-neutral-500">View and track your cab requests on this page.</p>
            </div>
            <button
              type="button"
              onClick={() => loadMyCabBookings({ silent: true })}
              disabled={refreshingBookings}
              className="inline-flex items-center justify-center gap-2 rounded border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className="" />
              {refreshingBookings ? "Refreshing..." : "Refresh Bookings"}
            </button>
          </div>

          {bookingListError && (
            <div role="alert" className="mt-4 rounded border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm text-neutral-800">
              {bookingListError}
            </div>
          )}

          {loadingBookings ? (
            <div className="mt-5 rounded border border-neutral-200 p-8 text-center text-sm text-neutral-500">
              Loading your cab bookings...
            </div>
          ) : myBookings.length === 0 ? (
            <div className="mt-5 rounded border border-dashed border-neutral-300 p-8 text-center">
              <CalendarCheck size={30} className="mx-auto text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-900">No cab bookings yet</p>
              <p className="mt-1 text-sm text-neutral-500">Your submitted cab requests will appear here.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {myBookings.map((booking) => {
                const rawStatus = String(booking.status || "requested").toLowerCase();
                const status = rawStatus.replaceAll("_", " ");
                const amount = booking?.estimate?.total ?? booking?.final?.total;
                const canCancel = ["requested", "pending", "confirmed"].includes(rawStatus);

                return (
                  <article key={booking._id || booking.id || booking.cabNumber} className="rounded border border-neutral-200 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-neutral-950">{booking.cabNumber || "Cab booking"}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            ["completed"].includes(rawStatus) ? "bg-neutral-100 text-neutral-800" :
                            ["cancelled", "rejected"].includes(rawStatus) ? "bg-neutral-100 text-neutral-800" :
                            "bg-neutral-100 text-black"
                          }`}>{status}</span>
                        </div>
                        <p className="mt-2 text-sm text-neutral-700">{TRIP_LABELS[booking.tripType] || booking.tripType || "Trip"} · {VEHICLE_LABELS[booking.vehicleType] || booking.vehicleType || "Vehicle"}</p>
                      </div>
                      <p className="text-base font-bold text-neutral-950">{amount != null ? formatCurrency(amount) : "Fare pending"}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-500">Pickup</p>
                        <p className="mt-1 break-words text-sm text-neutral-900">{booking.pickup?.location || "Hotel pickup"}</p>
                      </div>
                      <div className="rounded bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-500">Drop</p>
                        <p className="mt-1 break-words text-sm text-neutral-900">{booking.drop?.location || "As per trip type"}</p>
                      </div>
                      <div className="rounded bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-500">Pickup Date and Time</p>
                        <p className="mt-1 text-sm text-neutral-900">{booking.pickupAt ? new Date(booking.pickupAt).toLocaleString() : "Not available"}</p>
                      </div>
                      <div className="rounded bg-neutral-50 p-3">
                        <p className="text-xs font-medium text-neutral-500">Passenger</p>
                        <p className="mt-1 text-sm text-neutral-900">{booking.passenger?.name || "—"} · {booking.passengers ?? 1} passenger(s)</p>
                      </div>
                    </div>
                    {canCancel && (
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleCancelCabBooking(booking)}
                          disabled={cancellingId === String(booking._id || booking.id)}
                          className="rounded border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {cancellingId === String(booking._id || booking.id) ? "Cancelling..." : "Cancel Request"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
        >
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-black">
                  <CarFront size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-950">
                    Trip Details
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Select the trip and vehicle that suit your needs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Trip Type" required>
                  <select
                    name="tripType"
                    value={form.tripType}
                    onChange={updateField}
                    className={inputClass}
                  >
                    {TRIP_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TRIP_LABELS[type] || type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Vehicle Type" required>
                  <select
                    name="vehicleType"
                    value={form.vehicleType}
                    onChange={updateField}
                    className={inputClass}
                    disabled={loadingRates || rates.length === 0}
                  >
                    {VEHICLE_TYPES.filter((type) =>
                      rates.some(
                        (rate) =>
                          rate.vehicleType === type &&
                          rate.isActive !== false,
                      ),
                    ).map((type) => (
                      <option key={type} value={type}>
                        {VEHICLE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                  {loadingRates && (
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Loading available vehicles...
                    </p>
                  )}
                  {!loadingRates && rates.length === 0 && (
                    <p className="mt-1.5 text-xs text-neutral-700">
                      No active cab rates are available.
                    </p>
                  )}
                </Field>

                <Field label="Pickup Date and Time" required>
                  <div className="relative">
                    <Clock3
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    />
                    <input
                      type="datetime-local"
                      name="pickupAt"
                      value={form.pickupAt}
                      min={minimumPickupTime}
                      onChange={updateField}
                      className={`${inputClass} pl-10`}
                      required
                    />
                  </div>
                </Field>


              </div>
            </section>

            <section className="rounded border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-black">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-950">
                    Pickup and Drop
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Enter locations where required for your trip.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Pickup Location" required={needsPickupLocation}>
                  <input
                    type="text"
                    name="pickupLocation"
                    value={form.pickupLocation}
                    onChange={updateField}
                    placeholder={
                      form.tripType === "airport_pickup"
                        ? "Airport terminal or address"
                        : "Pickup address"
                    }
                    className={inputClass}
                    required={needsPickupLocation}
                  />
                  <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                    Leave blank to use the default hotel pickup location where supported.
                  </span>
                </Field>

                <Field label="Drop Location" required={needsDropLocation}>
                  <input
                    type="text"
                    name="dropLocation"
                    value={form.dropLocation}
                    onChange={updateField}
                    placeholder="Destination address"
                    className={inputClass}
                    required={needsDropLocation}
                  />
                  <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                    Airport trips can use the default airport or hotel destination.
                  </span>
                </Field>
              </div>

              {needsDuration && (
                <div className="mt-5 max-w-sm">
                  <Field label="Duration (Hours)" required>
                    <input
                      type="number"
                      name="durationHours"
                      min="1"
                      max="24"
                      step="1"
                      value={form.durationHours}
                      onChange={updateField}
                      className={inputClass}
                      required
                    />
                  </Field>
                </div>
              )}

              {needsDays && (
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Field label="Trip Duration (Days)" required>
                    <input
                      type="number"
                      name="days"
                      min="1"
                      max="60"
                      value={form.days}
                      onChange={updateField}
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Estimated Distance (KM)">
                    <input
                      type="number"
                      name="distanceKm"
                      min="0"
                      max="5000"
                      step="0.1"
                      value={form.distanceKm}
                      onChange={updateField}
                      placeholder="Enter distance if known"
                      className={inputClass}
                    />
                  </Field>
                </div>
              )}

              {form.tripType === "point_to_point" && (
                <div className="mt-5 max-w-sm">
                  <Field label="Estimated Distance (KM)">
                    <input
                      type="number"
                      name="distanceKm"
                      min="0"
                      max="5000"
                      step="0.1"
                      value={form.distanceKm}
                      onChange={updateField}
                      placeholder="Enter distance if known"
                      className={inputClass}
                    />
                    <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                      The final fare may require confirmation if distance is unknown.
                    </span>
                  </Field>
                </div>
              )}
            </section>

            <section className="rounded border border-neutral-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-100 text-black">
                  <Users size={20} />
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-950">
                    Passenger Details
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Provide contact information for the passenger.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Passenger Name" required>
                  <input
                    type="text"
                    name="passengerName"
                    value={form.passengerName}
                    onChange={updateField}
                    placeholder="Full name"
                    maxLength={100}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Passenger Phone" required>
                  <input
                    type="tel"
                    name="passengerPhone"
                    value={form.passengerPhone}
                    onChange={updateField}
                    placeholder="Phone number"
                    maxLength={20}
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Number of Passengers" required>
                  <input
                    type="number"
                    name="passengers"
                    min="1"
                    max={MAX_PASSENGERS[form.vehicleType] || 4}
                    value={form.passengers}
                    onChange={updateField}
                    className={inputClass}
                    required
                  />
                  <span className="mt-1.5 block text-xs font-normal text-neutral-500">
                    Maximum {MAX_PASSENGERS[form.vehicleType] || 4} passengers
                    for this vehicle type.
                  </span>
                </Field>

                <Field label="Number of Luggage Items">
                  <input
                    type="number"
                    name="luggage"
                    min="0"
                    max="50"
                    value={form.luggage}
                    onChange={updateField}
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Additional Instructions">
                    <textarea
                      name="notes"
                      value={form.notes}
                      onChange={updateField}
                      rows={3}
                      maxLength={500}
                      placeholder="Special requests or pickup instructions"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </section>

            <section className="rounded border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="font-semibold text-neutral-950">
                Payment Preference
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Choose how you would like the cab fare to be collected.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PAYMENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded border p-4 ${
                      form.paymentMode === option.value
                        ? "border-black bg-neutral-100"
                        : "border-neutral-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMode"
                      value={option.value}
                      checked={form.paymentMode === option.value}
                      onChange={updateField}
                      className="mt-1 accent-black"
                    />
                    <span className="text-sm font-medium text-neutral-900">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6">
            <section className="rounded border border-neutral-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-neutral-950">
                Booking Summary
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Review your trip before submitting.
              </p>

              <div className="mt-5 divide-y divide-neutral-100">
                <SummaryRow
                  label="Trip Type"
                  value={TRIP_LABELS[form.tripType]}
                />
                <SummaryRow
                  label="Vehicle"
                  value={VEHICLE_LABELS[form.vehicleType]}
                />
                <SummaryRow
                  label="Passengers"
                  value={`${form.passengers} passenger${
                    Number(form.passengers) === 1 ? "" : "s"
                  }`}
                />
                <SummaryRow
                  label="Payment"
                  value={
                    PAYMENT_OPTIONS.find(
                      (option) => option.value === form.paymentMode,
                    )?.label || form.paymentMode
                  }
                />
              </div>

              <div className="mt-5 rounded border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-700">
                  Estimated Total
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-950">
                  {estimate
                    ? formatCurrency(estimate.total)
                    : "Not calculated"}
                </p>

                {estimate?.needsQuote && (
                  <p className="mt-2 text-xs leading-5 text-neutral-700">
                    The final fare requires confirmation because the trip
                    distance is not yet available.
                  </p>
                )}

                {estimate && (
                  <div className="mt-3 border-t border-neutral-200 pt-2">
                    <SummaryRow
                      label="Base Fare"
                      value={formatCurrency(estimate.fare)}
                    />
                    {estimate.nightCharge > 0 && (
                      <SummaryRow
                        label="Night Charge"
                        value={formatCurrency(estimate.nightCharge)}
                      />
                    )}
                    <SummaryRow
                      label={`Tax (${estimate.taxPercent ?? 0}%)`}
                      value={formatCurrency(estimate.taxAmount)}
                    />
                  </div>
                )}

                {!estimate && (
                  <p className="mt-2 text-xs leading-5 text-neutral-500">
                    Calculate an estimate to view the available fare details.
                    The final fare may change after the trip is reviewed.
                  </p>
                )}
              </div>

              {selectedRate && (
                <div className="mt-4 rounded border border-neutral-200 p-4">
                  <p className="text-sm font-medium text-neutral-900">
                    Rate Information
                  </p>

                  {selectedRate.airportFlatFare != null && (
                    <SummaryRow
                      label="Airport Transfer"
                      value={formatCurrency(selectedRate.airportFlatFare)}
                    />
                  )}

                  {selectedRate.localPerHour != null && (
                    <SummaryRow
                      label="Local Rate / Hour"
                      value={formatCurrency(selectedRate.localPerHour)}
                    />
                  )}

                  {selectedRate.outstationPerDay != null && (
                    <SummaryRow
                      label="Outstation / Day"
                      value={formatCurrency(selectedRate.outstationPerDay)}
                    />
                  )}

                  {selectedRate.perKm != null && (
                    <SummaryRow
                      label="Rate / KM"
                      value={formatCurrency(selectedRate.perKm)}
                    />
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleEstimate}
                disabled={
                  estimating ||
                  loadingRates ||
                  rates.length === 0 ||
                  !vehicleIsAvailable
                }
                className="mt-5 flex w-full items-center justify-center rounded border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {estimating ? "Calculating Fare..." : "Calculate Fare"}
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingRates ||
                  rates.length === 0 ||
                  !vehicleIsAvailable
                }
                className="mt-3 flex w-full items-center justify-center rounded bg-black px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting Request..." : "Confirm Cab Booking"}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-neutral-500">
                Your booking will follow the cab confirmation process.
                Availability and final pricing may require staff confirmation.
              </p>
            </section>
          </aside>
        </form>
      </div>
    </main>
  );
}