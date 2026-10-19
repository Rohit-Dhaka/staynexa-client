import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Check,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

// Namespace import so the edit page still works if the optional
// getBookingById function has not been added to the service yet.
import * as bookingsService from "../services/bookings.service";
import { FormSkeleton } from "../../../components/common/Skeleton";

const { createBooking, getAvailableRooms, updateBooking } = bookingsService;

const BACK_PATH = "/bookings";

const SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "online", label: "Online" },
  { value: "ota", label: "OTA" },
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60";

const labelClass = "mb-1.5 block text-xs font-medium text-slate-700";

const formatPrice = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const todayString = () => toDateInput(new Date());

const emptyForm = {
  checkIn: "",
  checkOut: "",
  adults: 1,
  children: 0,
  room: "",
  name: "",
  phone: "",
  email: "",
  source: "walk_in",
  paidAmount: "",
  specialRequests: "",
};

const toForm = (booking) => ({
  checkIn: toDateInput(booking.checkIn),
  checkOut: toDateInput(booking.checkOut),
  adults: booking.adults ?? 1,
  children: booking.children ?? 0,
  room: booking.room?._id || booking.room || "",
  name: booking.guestDetails?.name || "",
  phone: booking.guestDetails?.phone || "",
  email: booking.guestDetails?.email || "",
  source: booking.source || "walk_in",
  paidAmount: "",
  specialRequests: booking.specialRequests || "",
});

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
      <Icon size={18} />
    </div>
    <div>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      )}
    </div>
  </div>
);

const BookingForm = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // The list page passes the booking in router state for an instant load.
  const stateBooking =
    location.state?.booking && location.state.booking._id === id
      ? location.state.booking
      : null;

  const [booking, setBooking] = useState(stateBooking);
  const [loadingBooking, setLoadingBooking] = useState(
    isEdit && !stateBooking
  );
  const [form, setForm] = useState(
    stateBooking ? toForm(stateBooking) : emptyForm
  );
  const [rooms, setRooms] = useState([]);
  const [nights, setNights] = useState(0);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ---------------- Load the booking when editing (page refresh) ---------------- */

  useEffect(() => {
    if (!isEdit || stateBooking) return undefined;

    let active = true;
    const fetchBooking =
      bookingsService.getBookingById || bookingsService.getBooking;

    if (!fetchBooking) {
      toast.error("Please open the booking from the bookings list");
      navigate(BACK_PATH, { replace: true });
      return undefined;
    }

    fetchBooking(id)
      .then((data) => {
        if (!active) return;
        const loaded = data.booking || data;
        setBooking(loaded);
        setForm(toForm(loaded));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error.response?.data?.message || "Could not load booking details"
        );
        navigate(BACK_PATH, { replace: true });
      })
      .finally(() => {
        if (active) setLoadingBooking(false);
      });

    return () => {
      active = false;
    };
  }, [id, isEdit, stateBooking, navigate]);

  /* ----------------------- Load available rooms ----------------------- */

  useEffect(() => {
    if (loadingBooking) return undefined;

    if (!form.checkIn || !form.checkOut || form.checkOut <= form.checkIn) {
      setRooms([]);
      setNights(0);
      setLoadingRooms(false);
      return undefined;
    }

    let active = true;
    setLoadingRooms(true);

    getAvailableRooms({
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults: Number(form.adults) || 1,
      children: Number(form.children) || 0,
    })
      .then((data) => {
        if (!active) return;

        const list = [...(data.rooms || [])];

        // Keep the booking's current room selectable while editing.
        const currentRoomId =
          booking?.room?._id ||
          (typeof booking?.room === "string" ? booking.room : "");

        if (
          isEdit &&
          currentRoomId &&
          !list.some((item) => item._id === currentRoomId)
        ) {
          list.unshift({
            _id: currentRoomId,
            roomNumber: booking.room?.roomNumber || "",
            floor: booking.room?.floor ?? "",
            roomType: booking.roomType,
            pricePerNight: booking.pricePerNight,
            nights: data.nights || booking.nights || 0,
            totalAmount:
              Number(booking.pricePerNight || 0) *
              Number(data.nights || booking.nights || 0),
          });
        }

        setRooms(list);
        setNights(data.nights || 0);

        setForm((previous) =>
          previous.room && !list.some((item) => item._id === previous.room)
            ? { ...previous, room: "" }
            : previous
        );
      })
      .catch((error) => {
        if (!active) return;
        setRooms([]);
        toast.error(
          error.response?.data?.message || "Could not load available rooms"
        );
      })
      .finally(() => {
        if (active) setLoadingRooms(false);
      });

    return () => {
      active = false;
    };
  }, [
    loadingBooking,
    form.checkIn,
    form.checkOut,
    form.adults,
    form.children,
    isEdit,
    booking,
  ]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const selectedRoom = rooms.find((item) => item._id === form.room);
  const totalAmount = Number(selectedRoom?.totalAmount || 0);
  const paidAmount = Number(form.paidAmount || 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!form.checkIn || !form.checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    if (form.checkOut <= form.checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }

    if (!form.room) {
      toast.error("Please select an available room");
      return;
    }

    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Guest name and phone are required");
      return;
    }

    if (Number(form.adults) < 1 || Number(form.children) < 0) {
      toast.error("Please enter valid guest counts");
      return;
    }

    if (
      !isEdit &&
      form.paidAmount !== "" &&
      (!Number.isFinite(paidAmount) ||
        paidAmount < 0 ||
        paidAmount > totalAmount)
    ) {
      toast.error("Advance payment must be between ₹0 and the total amount");
      return;
    }

    const payload = {
      guestDetails: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      },
      room: form.room,
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      adults: Number(form.adults),
      children: Number(form.children || 0),
      source: form.source,
      specialRequests: form.specialRequests.trim(),
    };

    if (!isEdit && form.paidAmount !== "") {
      payload.paidAmount = paidAmount;
    }

    setSubmitting(true);

    try {
      if (isEdit) {
        await updateBooking(id, payload);
        toast.success("Booking updated successfully");
      } else {
        await createBooking(payload);
        toast.success("Booking created successfully");
      }
      navigate(BACK_PATH);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Page heading */}
      <div>
        <Link
          to={BACK_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Bookings
        </Link>

        <h2 className="mt-3 text-xl font-bold text-slate-900">
          {isEdit ? "Edit Booking" : "New Booking"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isEdit
            ? `Update reservation ${booking?.bookingNumber || ""}`.trim()
            : "Create a new guest reservation."}
        </p>
      </div>

      {loadingBooking ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <FormSkeleton fields={8} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Stay details */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={CalendarDays}
                title="Stay Details"
                description="Choose the dates and enter the number of guests."
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="checkIn" className={labelClass}>
                    Check-in Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkIn"
                    type="date"
                    name="checkIn"
                    min={isEdit ? undefined : todayString()}
                    value={form.checkIn}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="checkOut" className={labelClass}>
                    Check-out Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="checkOut"
                    type="date"
                    name="checkOut"
                    min={form.checkIn || todayString()}
                    value={form.checkOut}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="adults" className={labelClass}>
                    Adults
                  </label>
                  <input
                    id="adults"
                    type="number"
                    name="adults"
                    min="1"
                    max="50"
                    value={form.adults}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="children" className={labelClass}>
                    Children
                  </label>
                  <input
                    id="children"
                    type="number"
                    name="children"
                    min="0"
                    max="50"
                    value={form.children}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-lg bg-slate-50 p-3.5">
                <Users size={18} className="shrink-0 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Total Guests
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {Number(form.adults || 0) + Number(form.children || 0)}{" "}
                    guest(s) in total
                  </p>
                </div>
              </div>
            </section>

            {/* Room selection */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={BedDouble}
                title="Room Selection"
                description="Available rooms are based on your dates and guest count."
              />

              <div>
                <label htmlFor="room" className={labelClass}>
                  Select Room <span className="text-rose-500">*</span>
                </label>

                <select
                  id="room"
                  name="room"
                  value={form.room}
                  onChange={handleChange}
                  required
                  disabled={submitting || loadingRooms || rooms.length === 0}
                  className={inputClass}
                >
                  <option value="">
                    {loadingRooms
                      ? "Loading available rooms..."
                      : !form.checkIn || !form.checkOut
                        ? "Select your stay dates first"
                        : form.checkOut <= form.checkIn
                          ? "Check-out must be after check-in"
                          : rooms.length === 0
                            ? "No rooms available for these dates"
                            : "Choose a room"}
                  </option>

                  {rooms.map((room) => (
                    <option key={room._id} value={room._id}>
                      Room {room.roomNumber} - {room.roomType?.name || "Room"} -{" "}
                      {formatPrice(room.pricePerNight)}/night
                    </option>
                  ))}
                </select>
              </div>

              {loadingRooms && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Checking room availability...
                </div>
              )}

              {!loadingRooms && selectedRoom && (
                <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Selected Room
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        Room {selectedRoom.roomNumber}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedRoom.roomType?.name || "Room"} - Floor{" "}
                        {selectedRoom.floor ?? "-"}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600">
                      <Check size={18} />
                    </div>
                  </div>

                  <div className="my-4 border-t border-indigo-100" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        {nights || selectedRoom.nights || 0} night(s)
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatPrice(selectedRoom.pricePerNight)} per night
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">Estimated Total</p>
                      <p className="mt-1 text-xl font-bold text-indigo-700">
                        {formatPrice(totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Guest details */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={Users}
                title="Guest Details"
                description="Enter the primary guest's contact information."
              />

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Guest Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                    maxLength={100}
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                      required
                      maxLength={20}
                      disabled={submitting}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="guest@example.com"
                      maxLength={150}
                      disabled={submitting}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="source" className={labelClass}>
                    Booking Source
                  </label>
                  <select
                    id="source"
                    name="source"
                    value={form.source}
                    onChange={handleChange}
                    disabled={submitting}
                    className={inputClass}
                  >
                    {SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Payment and requests */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
              <SectionHeader
                icon={Save}
                title="Payment & Requests"
                description="Add an optional advance payment and guest preferences."
              />

              {!isEdit && (
                <div className="mb-5">
                  <label htmlFor="paidAmount" className={labelClass}>
                    Advance Payment
                  </label>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                      ₹
                    </span>
                    <input
                      id="paidAmount"
                      type="number"
                      name="paidAmount"
                      min="0"
                      max={selectedRoom ? totalAmount : undefined}
                      step="0.01"
                      value={form.paidAmount}
                      onChange={handleChange}
                      placeholder="0.00"
                      disabled={submitting}
                      className={`${inputClass} pl-8`}
                    />
                  </div>

                  <p className="mt-1.5 text-xs text-slate-500">
                    You can also collect payment after creating the booking.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="specialRequests" className={labelClass}>
                  Special Requests
                </label>
                <textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={form.specialRequests}
                  onChange={handleChange}
                  rows={5}
                  maxLength={1000}
                  placeholder="Late check-in, extra bed, guest preferences..."
                  disabled={submitting}
                  className={`${inputClass} resize-y`}
                />
                <p className="mt-1.5 text-right text-xs text-slate-400">
                  {form.specialRequests.length}/1000
                </p>
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              <span className="text-rose-500">*</span> Required fields
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate(BACK_PATH)}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || loadingRooms}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#1a1a1a] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {submitting
                  ? "Saving..."
                  : isEdit
                    ? "Update Booking"
                    : "Create Booking"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default BookingForm;