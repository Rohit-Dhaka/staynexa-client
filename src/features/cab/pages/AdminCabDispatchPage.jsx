import toast from "react-hot-toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Users,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Flag,
  UserRound,
  CalendarDays,
  MapPin,
  Phone,
  X,
  LoaderCircle,
  AlertCircle,
  ClipboardList,
  ArrowRight,
  UserCheck,
} from "lucide-react";

import ConfirmDialog from "../../../components/common/ConfirmDialog";
import {
  getCabBookings,
  getCabBooking,
  getAvailableCabResources,
  acceptCabBooking,
  rejectCabBooking,
  assignCabResources,
  startCabTrip,
  completeCabTrip,
} from "../services/cab.service";

const BOOKING_STATUSES = [
  "requested",
  "confirmed",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
  "rejected",
];

const STATUS_STYLES = {
  requested: "border-amber-200 bg-amber-50 text-amber-700",
  confirmed: "border-blue-200 bg-black text-blue-700",
  assigned: "border-indigo-200 bg-black text-indigo-700",
  in_progress: "border-violet-200 bg-violet-50 text-violet-700",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded border px-3.5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getBookingId(booking) {
  return booking?._id || booking?.id;
}

function getStatus(booking) {
  return String(booking?.status || "requested").toLowerCase();
}

function formatStatus(status) {
  return String(status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getGuestName(booking) {
  return (
    booking?.passenger?.name ||
    booking?.guest?.name ||
    booking?.guest?.fullName ||
    booking?.guestName ||
    booking?.guestDetails?.name ||
    booking?.customer?.name ||
    "Guest"
  );
}

function getGuestPhone(booking) {
  return (
    booking?.passenger?.phone ||
    booking?.guest?.phone ||
    booking?.guestPhone ||
    booking?.guestDetails?.phone ||
    booking?.customer?.phone ||
    ""
  );
}

function getVehicleName(vehicle) {
  if (!vehicle) return "Not assigned";

  return [
    vehicle.registrationNumber || vehicle.vehicleNumber,
    vehicle.make || vehicle.brand,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(" ");
}

function getDriverName(driver) {
  if (!driver) return "Not assigned";

  return (
    driver.name ||
    driver.fullName ||
    driver.user?.name ||
    driver.phone ||
    "Assigned driver"
  );
}

function formatDateTime(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTripType(booking) {
  return formatStatus(booking?.tripType || booking?.trip?.tripType || "local");
}

function getPickup(booking) {
  return (
    booking?.pickup?.location ||
    booking?.pickupLocation?.address ||
    booking?.pickupLocation?.name ||
    booking?.pickupAddress ||
    booking?.pickup ||
    booking?.trip?.pickupAddress ||
    "Not specified"
  );
}

function getDrop(booking) {
  return (
    booking?.drop?.location ||
    booking?.dropLocation?.address ||
    booking?.dropLocation?.name ||
    booking?.dropAddress ||
    booking?.drop ||
    booking?.trip?.dropAddress ||
    "Not specified"
  );
}

function getBookingList(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.cabs)) return response.cabs;
  if (Array.isArray(response?.bookings)) return response.bookings;
  if (Array.isArray(response?.data?.bookings)) return response.data.bookings;
  if (Array.isArray(response?.data)) return response.data;

  return [];
}

function getResourceList(response, keys) {
  if (Array.isArray(response)) return response;

  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }
  }

  return [];
}

function StatusBadge({ status }) {
  const normalizedStatus = BOOKING_STATUSES.includes(status)
    ? status
    : "requested";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[normalizedStatus]
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function SummaryCard({ title, value, icon: Icon, description }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        <span className="flex h-11 w-11 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
          <Icon size={21} />
        </span>
      </div>
    </article>
  );
}

function RejectModal({ booking, saving, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onConfirm(reason.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-title"
        className="my-auto w-full max-w-md rounded border border-slate-200 bg-white"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 id="reject-title" className="text-lg font-bold text-slate-900">
              Reject Cab Booking
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Provide a reason for rejecting this booking.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3 p-5">
            <p className="text-sm text-slate-600">
              Booking ID:{" "}
              <span className="font-semibold text-slate-900">
                {String(getBookingId(booking) || "").slice(-8)}
              </span>
            </p>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Rejection Reason
              </span>

              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Enter the reason for rejection"
                rows={4}
                maxLength={500}
                disabled={saving}
                className={inputClass}
              />
            </label>
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-200 p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`${buttonClass} border-rose-600 bg-rose-600 text-white hover:bg-rose-700`}
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Reject Booking
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function AssignModal({
  booking,
  resources,
  loading,
  saving,
  onClose,
  onSubmit,
}) {
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState("");

  const vehicles = getResourceList(resources, [
    "vehicles",
    "availableVehicles",
  ]);

  const drivers = getResourceList(resources, [
    "drivers",
    "availableDrivers",
  ]);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!vehicleId || !driverId) {
      setError("Please select both a vehicle and a driver.");
      return;
    }

    onSubmit({
      vehicle: vehicleId,
      driver: driverId,
    }).catch((requestError) => {
      setError(getErrorMessage(requestError));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-title"
        className="my-auto w-full max-w-lg rounded border border-slate-200 bg-white"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 id="assign-title" className="text-lg font-bold text-slate-900">
              Assign Vehicle and Driver
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select available resources for this booking.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
            <LoaderCircle size={19} className="animate-spin" />
            Loading available resources...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 p-5">
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">
                  Booking ID
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {String(getBookingId(booking) || "").slice(-8)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {getTripType(booking)} · {formatDateTime(booking?.pickupAt)} ·{" "}
                  {booking?.passengers || 1} passenger(s)
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CarFront size={16} />
                  Available Vehicle
                </span>

                <select
                  value={vehicleId}
                  onChange={(event) => setVehicleId(event.target.value)}
                  disabled={saving}
                  required
                  className={inputClass}
                >
                  <option value="">Select a vehicle</option>

                  {vehicles.map((vehicle) => (
                    <option
                      key={vehicle._id || vehicle.id}
                      value={vehicle._id || vehicle.id}
                      disabled={vehicle.available === false}
                    >
                      {getVehicleName(vehicle)} · {vehicle.seats} seats
                      {vehicle.sameType === false ? " · different type" : ""}
                      {vehicle.available === false ? ` (${vehicle.reason})` : ""}
                    </option>
                  ))}
                </select>

                {vehicles.length === 0 && (
                  <span className="mt-1.5 block text-xs text-amber-700">
                    No vehicles found. Add a vehicle in the fleet first.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <UserRound size={16} />
                  Available Driver
                </span>

                <select
                  value={driverId}
                  onChange={(event) => setDriverId(event.target.value)}
                  disabled={saving}
                  required
                  className={inputClass}
                >
                  <option value="">Select a driver</option>

                  {drivers.map((driver) => (
                    <option
                      key={driver._id || driver.id}
                      value={driver._id || driver.id}
                      disabled={driver.available === false}
                    >
                      {getDriverName(driver)}
                      {driver.phone ? ` — ${driver.phone}` : ""}
                      {driver.available === false ? ` (${driver.reason})` : ""}
                    </option>
                  ))}
                </select>

                {drivers.length === 0 && (
                  <span className="mt-1.5 block text-xs text-amber-700">
                    No drivers found. Add a driver first.
                  </span>
                )}
              </label>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-200 p-5">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || loading || !vehicles.length || !drivers.length}
                className={`${buttonClass} border-indigo-600 bg-black text-white hover:bg-black`}
              >
                {saving && <LoaderCircle size={16} className="animate-spin" />}
                Assign Resources
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}

function CompleteTripModal({ booking, saving, onClose, onSubmit }) {
  const [finalFare, setFinalFare] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {};

    if (finalFare !== "") {
      const value = Number(finalFare);

      if (!Number.isFinite(value) || value < 0) {
        setError("Final fare must be a valid non-negative amount.");
        return;
      }

      payload.fare = value;
    }

    if (distanceKm !== "") {
      const value = Number(distanceKm);

      if (!Number.isFinite(value) || value < 0) {
        setError("Distance must be a valid non-negative number.");
        return;
      }

      payload.distanceKm = value;
    }

    if (notes.trim()) {
      payload.note = notes.trim();
    }

    onSubmit(payload).catch((requestError) => {
      setError(getErrorMessage(requestError));
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-title"
        className="my-auto w-full max-w-lg rounded border border-slate-200 bg-white"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2
              id="complete-title"
              className="text-lg font-bold text-slate-900"
            >
              Complete Cab Trip
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Confirm the trip completion details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={17} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Final Fare
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={finalFare}
                onChange={(event) => setFinalFare(event.target.value)}
                placeholder="Leave blank to use the estimated fare"
                disabled={saving}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Distance Travelled (km)
              </span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={distanceKm}
                onChange={(event) => setDistanceKm(event.target.value)}
                placeholder="Enter actual distance"
                disabled={saving}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Completion Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Optional trip completion notes"
                disabled={saving}
                className={inputClass}
              />
            </label>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-200 p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`${buttonClass} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              Complete Trip
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function AdminCabDispatchPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [rejectBooking, setRejectBooking] = useState(null);
  const [assignBooking, setAssignBooking] = useState(null);
  const [completeBooking, setCompleteBooking] = useState(null);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [startTarget, setStartTarget] = useState(null);

  const [resources, setResources] = useState(null);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setPageError("");

      const response = await getCabBookings({ limit: 100 });
      setBookings(getBookingList(response));
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const id = String(getBookingId(booking) || "");
      const status = getStatus(booking);

      const searchableText = [
        id,
        getGuestName(booking),
        getGuestPhone(booking),
        getPickup(booking),
        getDrop(booking),
        booking?.cabNumber,
        booking?.bookingReference,
        booking?.vehicle?.registrationNumber,
        booking?.driver?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(query);
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = {
      total: bookings.length,
      requested: 0,
      confirmed: 0,
      assigned: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    for (const booking of bookings) {
      const status = getStatus(booking);

      if (Object.hasOwn(counts, status) && status !== "total") {
        counts[status] += 1;
      }
    }

    return counts;
  }, [bookings]);

  async function runBookingAction(action, successMessage) {
    try {
      setSaving(true);
      setActionError("");
      setNotice("");

      await action();

      setNotice(successMessage);

      await loadBookings();
    } catch (error) {
      setActionError(getErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function confirmAccept() {
    const booking = acceptTarget;
    if (!booking) return;

    try {
      await runBookingAction(
        () => acceptCabBooking(getBookingId(booking)),
        "Cab booking accepted successfully."
      );
      toast.success("Cab booking accepted");
    } catch {
      // The error is displayed on the page.
    } finally {
      setAcceptTarget(null);
    }
  }

  async function handleReject(reason) {
    const booking = rejectBooking;

    if (!booking) return;

    try {
      await runBookingAction(
        () => rejectCabBooking(getBookingId(booking), reason),
        "Cab booking rejected successfully."
      );

      setRejectBooking(null);
    } catch {
      // The error is displayed in the modal and on the page.
    }
  }

  async function openAssignModal(booking) {
    setAssignBooking(booking);
    setResources(null);
    setResourcesLoading(true);
    setActionError("");

    try {
      const response = await getAvailableCabResources(getBookingId(booking));
      setResources(response);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setResourcesLoading(false);
    }
  }

  async function handleAssign(payload) {
    const booking = assignBooking;

    if (!booking) return;

    try {
      await runBookingAction(
        () => assignCabResources(getBookingId(booking), payload),
        "Vehicle and driver assigned successfully."
      );

      setAssignBooking(null);
      setResources(null);
    } catch (error) {
      throw error;
    }
  }

  async function confirmStartTrip() {
    const booking = startTarget;
    if (!booking) return;

    try {
      await runBookingAction(
        () => startCabTrip(getBookingId(booking)),
        "Cab trip started successfully."
      );
      toast.success("Trip started");
    } catch {
      // The error is displayed on the page.
    } finally {
      setStartTarget(null);
    }
  }

  async function handleCompleteTrip(payload) {
    const booking = completeBooking;

    if (!booking) return;

    try {
      await runBookingAction(
        () => completeCabTrip(getBookingId(booking), payload),
        "Cab trip completed successfully."
      );

      setCompleteBooking(null);
    } catch (error) {
      throw error;
    }
  }

  async function openBookingDetails(booking) {
    try {
      setSaving(true);
      setActionError("");

      const response = await getCabBooking(getBookingId(booking));

      const details =
        response?.cab ||
        response?.booking ||
        response?.data?.booking ||
        response?.data ||
        response;

      const id = getBookingId(details);

      if (!id) {
        throw new Error("Booking details could not be loaded.");
      }

      setBookings((current) =>
        current.map((item) =>
          String(getBookingId(item)) === String(id) ? details : item
        )
      );

      setNotice("Booking details refreshed successfully.");
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen  ">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
              <CarFront size={18} />
              Cab Operations
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Cab Dispatch
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Accept bookings, assign drivers and vehicles, and manage trip
              progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadBookings}
            disabled={loading || saving}
            className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-100`}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Bookings
          </button>
        </header>

        {(pageError || actionError) && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <span className="flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {actionError || pageError}
            </span>

            <button
              type="button"
              onClick={() => {
                setPageError("");
                setActionError("");
              }}
              aria-label="Dismiss error"
              className="rounded p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="flex items-start gap-2 rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle size={18} className="mt-0.5 shrink-0" />
            {notice}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Bookings"
            value={statusCounts.total}
            icon={ClipboardList}
            description="All cab bookings"
          />

          <SummaryCard
            title="Awaiting Action"
            value={statusCounts.requested}
            icon={Clock}
            description="New booking requests"
          />

          <SummaryCard
            title="Assigned Trips"
            value={statusCounts.assigned}
            icon={UserCheck}
            description="Driver and vehicle assigned"
          />

          <SummaryCard
            title="Trips In Progress"
            value={statusCounts.in_progress}
            icon={Play}
            description="Currently running trips"
          />
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BOOKING_STATUSES.map((status) => (
            <button
              type="button"
              key={status}
              onClick={() =>
                setStatusFilter((current) =>
                  current === status ? "all" : status
                )
              }
              className={`rounded border p-3 text-left transition ${
                statusFilter === status
                  ? "border-indigo-300 bg-black"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-500">{formatStatus(status)}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {statusCounts[status] || 0}
              </p>
            </button>
          ))}
        </section>

        <section className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Booking Dispatch Queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review trip details and perform dispatch actions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_190px]">
              <label className="relative block">
                <span className="sr-only">Search bookings</span>
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search guest, phone, location..."
                  className={`${inputClass} pl-9`}
                />
              </label>

              <label>
                <span className="sr-only">Filter booking status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={inputClass}
                >
                  <option value="all">All Statuses</option>
                  {BOOKING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle size={21} className="animate-spin" />
              Loading cab bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
                <CarFront size={25} />
              </span>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No Cab Bookings Found
              </h3>

              <p className="mt-2 max-w-md text-sm text-slate-500">
                No bookings match the current search and status filters.
              </p>

              {(search || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  className={`${buttonClass} mt-4 border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredBookings.map((booking) => {
                const id = getBookingId(booking);
                const status = getStatus(booking);
                const guestName = getGuestName(booking);
                const guestPhone = getGuestPhone(booking);
                const vehicle =
                  booking.vehicle ||
                  booking.assignedVehicle ||
                  booking.assignment?.vehicle;
                const driver =
                  booking.driver ||
                  booking.assignedDriver ||
                  booking.assignment?.driver;

                const canAccept = status === "requested";
                const canReject = ["requested", "confirmed"].includes(status);
                const canAssign = ["confirmed", "assigned"].includes(status);
                const canStart =
                  status === "assigned" && Boolean(vehicle && driver);
                const canComplete = status === "in_progress";

                return (
                  <article key={id} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {booking.cabNumber || `#${String(id || "").slice(-8)}`}
                          </span>

                          <StatusBadge status={status} />

                          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
                            {getTripType(booking)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-600">
                                <UserRound size={19} />
                              </span>

                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">
                                  {guestName}
                                </p>

                                {guestPhone && (
                                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                                    <Phone size={13} />
                                    {guestPhone}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin
                                size={16}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />
                              <span className="break-words">
                                <span className="font-medium text-slate-800">
                                  Pickup:
                                </span>{" "}
                                {getPickup(booking)}
                              </span>
                            </div>

                            <div className="flex items-start gap-2 text-sm text-slate-600">
                              <MapPin
                                size={16}
                                className="mt-0.5 shrink-0 text-rose-500"
                              />
                              <span className="break-words">
                                <span className="font-medium text-slate-800">
                                  Drop:
                                </span>{" "}
                                {getDrop(booking)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 rounded border border-slate-200 p-3">
                            <div className="flex items-start gap-2">
                              <CalendarDays
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <div>
                                <p className="text-xs text-slate-500">
                                  Scheduled Pickup
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                  {formatDateTime(
                                    booking.pickupAt ||
                                      booking.scheduledAt ||
                                      booking.pickupDateTime ||
                                      booking.trip?.pickupAt
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <CarFront
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <div className="min-w-0">
                                <p className="text-xs text-slate-500">
                                  Assigned Vehicle
                                </p>
                                <p className="mt-1 break-words text-sm font-medium text-slate-800">
                                  {getVehicleName(vehicle)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <Users
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                              />
                              <div>
                                <p className="text-xs text-slate-500">
                                  Assigned Driver
                                </p>
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                  {getDriverName(driver)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 xl:w-64 xl:shrink-0 xl:justify-end xl:border-t-0 xl:pt-0">
                        <button
                          type="button"
                          onClick={() => openBookingDetails(booking)}
                          disabled={saving}
                          className={`${buttonClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
                        >
                          View Details
                        </button>

                        {canAccept && (
                          <button
                            type="button"
                            onClick={() => setAcceptTarget(booking)}
                            disabled={saving}
                            className={`${buttonClass} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}
                          >
                            <CheckCircle size={15} />
                            Accept
                          </button>
                        )}

                        {canReject && (
                          <button
                            type="button"
                            onClick={() => setRejectBooking(booking)}
                            disabled={saving}
                            className={`${buttonClass} border-rose-200 bg-white text-rose-700 hover:bg-rose-50`}
                          >
                            <XCircle size={15} />
                            Reject
                          </button>
                        )}

                        {canAssign && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(booking)}
                            disabled={saving}
                            className={`${buttonClass} border-indigo-600 bg-black text-white hover:bg-black`}
                          >
                            <UserCheck size={15} />
                            Assign
                          </button>
                        )}

                        {canStart && (
                          <button
                            type="button"
                            onClick={() => setStartTarget(booking)}
                            disabled={saving}
                            className={`${buttonClass} border-violet-600 bg-violet-600 text-white hover:bg-violet-700`}
                          >
                            <Play size={15} />
                            Start Trip
                          </button>
                        )}

                        {canComplete && (
                          <button
                            type="button"
                            onClick={() => setCompleteBooking(booking)}
                            disabled={saving}
                            className={`${buttonClass} border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`}
                          >
                            <Flag size={15} />
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && filteredBookings.length > 0 && (
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3.5 text-sm text-slate-500 sm:px-5">
              <span>
                Showing{" "}
                <strong className="text-slate-900">
                  {filteredBookings.length}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-900">{bookings.length}</strong>{" "}
                bookings
              </span>

              <span className="flex items-center gap-1.5">
                <ArrowRight size={14} />
                Dispatch Queue
              </span>
            </footer>
          )}
        </section>
      </div>

      {rejectBooking && (
        <RejectModal
          booking={rejectBooking}
          saving={saving}
          onClose={() => {
            if (!saving) setRejectBooking(null);
          }}
          onConfirm={handleReject}
        />
      )}

      {assignBooking && (
        <AssignModal
          booking={assignBooking}
          resources={resources}
          loading={resourcesLoading}
          saving={saving}
          onClose={() => {
            if (!saving) {
              setAssignBooking(null);
              setResources(null);
            }
          }}
          onSubmit={handleAssign}
        />
      )}

      {completeBooking && (
        <CompleteTripModal
          booking={completeBooking}
          saving={saving}
          onClose={() => {
            if (!saving) setCompleteBooking(null);
          }}
          onSubmit={handleCompleteTrip}
        />
      )}

      <ConfirmDialog
        open={Boolean(acceptTarget)}
        tone="success"
        icon={CheckCircle}
        title="Accept this cab request?"
        message={
          acceptTarget
            ? `Accept ${acceptTarget.cabNumber || "this request"} for ${getGuestName(acceptTarget)}? You can assign a driver and vehicle next.`
            : ""
        }
        confirmText="Accept request"
        loading={saving}
        onConfirm={confirmAccept}
        onCancel={() => setAcceptTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(startTarget)}
        tone="success"
        icon={Play}
        title="Start this trip?"
        message={
          startTarget
            ? `Mark ${startTarget.cabNumber || "this trip"} as started?`
            : ""
        }
        confirmText="Start trip"
        loading={saving}
        onConfirm={confirmStartTrip}
        onCancel={() => setStartTarget(null)}
      />
    </main>
  );
}