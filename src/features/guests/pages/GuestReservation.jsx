import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  ArrowLeft, CalendarDays, BedDouble, Check, ClipboardCheck,
  Loader2, Plus, Trash2, UserRound, Users,
} from "lucide-react";


import { searchAvailability, createBooking } from "../../bookings/services/bookings.service";
import { getMyGuestProfile } from "../../guests/services/guests.service";
import { Field, ErrorBox, inputClass } from "../../bookings/components/formUi";
import {addDaysToInput, formatDate, formatINR, getErrorMessage,nightsBetween, toInputDate,} from "../../bookings/utils/bookingUi";

const STEPS = [
  { label: "Dates & Room", icon: CalendarDays },
  { label: "Guest Details", icon: UserRound },
  { label: "Review Booking", icon: ClipboardCheck },
];

const emptyExtraGuest = {
  name: "", age: "", gender: "male", relation: "", isChild: false,
};

export default function GuestReservation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = toInputDate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stay, setStay] = useState({
    checkIn: today, checkOut: addDaysToInput(today, 1), adults: 1, children: 0,
  });
  const [availability, setAvailability] = useState(null);
  const [selected, setSelected] = useState({ typeId: "", roomId: "" });
  const [guest, setGuest] = useState({
    name: "", phone: "", email: "", gender: "", city: "", address: "",
  });
  const [extraGuests, setExtraGuests] = useState([]);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Load only the profile belonging to the authenticated guest.
  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const result = await getMyGuestProfile();
        const profile = result?.guest ?? result;
        if (active && profile) {
          setGuest({
            name: profile.name || "",
            phone: profile.phone || "",
            email: profile.email || "",
            gender: profile.gender || "",
            city: profile.city || "",
            address: profile.address || "",
          });
        }
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => { active = false; };
  }, []);

  const nights = nightsBetween(stay.checkIn, stay.checkOut);

  useEffect(() => {
    if (user?.role && user.role !== ROLES.GUEST) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user?.role && user.role !== ROLES.GUEST) {
    return null;
  }
  const selectedOption = availability?.options?.find(
    (item) => item.roomType._id === selected.typeId
  );
  const selectedRoom = selectedOption?.rooms?.find(
    (item) => item._id === selected.roomId
  );

  const changeStay = (key, value) => {
    setAvailability(null);
    setSelected({ typeId: "", roomId: "" });
    setStay((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "checkIn" && next.checkOut <= value) {
        next.checkOut = addDaysToInput(value, 1);
      }
      return next;
    });
  };

  const runSearch = async () => {
    setError("");
    if (stay.checkIn < today) return setError("Check-in date cannot be in the past.");
    if (nights < 1) return setError("Check-out must be after check-in.");
    if (Number(stay.adults) < 1) return setError("At least one adult is required.");

    setSearching(true);
    try {
      const result = await searchAvailability({
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: Number(stay.adults),
        children: Number(stay.children),
      });
      setAvailability(result);
      setSelected({ typeId: "", roomId: "" });
      if (!result?.options?.length) {
        setError("No rooms are available for these dates. Please try other dates.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const goToDetails = () => {
    setError("");
    if (!selected.roomId) return setError("Please select an available room first.");
    setStep(2);
  };

  const goToReview = () => {
    setError("");
    if (!guest.name.trim() || !guest.phone.trim()) {
      return setError("Your name and phone number are required.");
    }
    if (!/^\+?[\d\s()-]{10,18}$/.test(guest.phone.trim())) {
      return setError("Please enter a valid phone number.");
    }
    if (guest.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)) {
      return setError("Please enter a valid email address.");
    }
    if (extraGuests.some((item) => !item.name.trim())) {
      return setError("Enter a name for each additional guest or remove that row.");
    }
    setStep(3);
  };

  const updateExtraGuest = (index, patch) => {
    setExtraGuests((previous) =>
      previous.map((item, i) => i === index ? { ...item, ...patch } : item)
    );
  };

  const submitBooking = async () => {
    setError("");
    if (!selectedRoom || !selected.roomId) {
      setError("Please select an available room again.");
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      // Do not send guestId or primary guestDetails from the browser.
      // The backend must derive the primary guest from the authenticated user.
      const booking = await createBooking({
        room: selected.roomId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        checkOutConfirmed: true,
        adults: Number(stay.adults),
        children: Number(stay.children),
        expectedArrivalTime,
        specialRequests: specialRequests.trim(),
        additionalGuests: extraGuests
          .filter((item) => item.name.trim())
          .map((item) => ({
            name: item.name.trim(),
            age: item.age === "" ? undefined : Number(item.age),
            gender: item.gender,
            relation: item.relation.trim(),
            isChild: item.isChild,
          })),
      });

      const bookingId = booking?._id || booking?.booking?._id;
      navigate("/guest/bookings", {
        state: { notice: "Your booking has been submitted successfully.", bookingId },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 md:px-8">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/guest/bookings")}
          aria-label="Back to my bookings"
          className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Guest portal</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Book your stay</h1>
          <p className="mt-1 text-sm text-slate-500">Choose your dates, room, and guest details.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
        {STEPS.map((item, index) => {
          const number = index + 1;
          const Icon = item.icon;
          const active = step === number;
          const done = step > number;
          return (
            <div key={item.label} className={`flex items-center gap-2 rounded-xl p-2 md:gap-3 md:p-3 ${active ? "bg-indigo-50 text-indigo-700" : done ? "text-emerald-700" : "text-slate-400"}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${active ? "bg-indigo-600 text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"}`}>
                {done ? <Check size={16} /> : <Icon size={16} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-medium uppercase tracking-wide opacity-70">Step {number}</span>
                <span className="block truncate text-xs font-semibold md:text-sm">{item.label}</span>
              </span>
            </div>
          );
        })}
      </div>

      <ErrorBox message={error} />

      {step === 1 && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><CalendarDays size={20} /></span>
              <div>
                <h2 className="font-semibold text-slate-900">Dates & guests</h2>
                <p className="text-sm text-slate-500">When would you like to stay?</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Check-in">
                <input type="date" min={today} value={stay.checkIn} onChange={(e) => changeStay("checkIn", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Check-out">
                <input type="date" min={addDaysToInput(stay.checkIn, 1)} value={stay.checkOut} onChange={(e) => changeStay("checkOut", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Adults">
                <input type="number" min="1" max="20" value={stay.adults} onChange={(e) => changeStay("adults", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Children">
                <input type="number" min="0" max="20" value={stay.children} onChange={(e) => changeStay("children", e.target.value)} className={inputClass} />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">{nights > 0 ? `${nights} night(s) selected` : "Select valid dates"}</p>
              <button type="button" onClick={runSearch} disabled={searching} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {searching && <Loader2 size={16} className="animate-spin" />}
                {searching ? "Checking rooms..." : "Find available rooms"}
              </button>
            </div>
          </div>

          {availability?.options?.map((option) => {
            const active = selected.typeId === option.roomType._id;
            return (
              <article key={option.roomType._id} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${active ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200"}`}>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
                  <div className="flex gap-3">
                    <div className="rounded-xl bg-slate-100 p-3 text-slate-600"><BedDouble size={22} /></div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{option.roomType.name}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <Users size={14} /> {option.roomType.capacity?.adults ?? "—"} adults
                        {option.roomType.capacity?.children != null ? `, ${option.roomType.capacity.children} children` : ""}
                        {option.roomType.bedType ? ` · ${option.roomType.bedType} bed` : ""}
                      </p>
                      <p className="mt-2 text-xs font-medium text-emerald-700">{option.availableCount} room(s) available</p>
                      {!!option.roomType.amenities?.length && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {option.roomType.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{amenity}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-slate-500">{formatINR(option.pricePerNight)} / night</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(option.totalAmount)}</p>
                    <p className="text-xs text-slate-500">Total for {availability.nights} night(s)</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/70 p-4 md:px-6">
                  {active ? (
                    <>
                      <p className="mb-3 text-sm font-semibold text-slate-700">Choose a room</p>
                      <div className="flex flex-wrap gap-2">
                        {option.rooms.map((room) => (
                          <button key={room._id} type="button" onClick={() => setSelected((prev) => ({ ...prev, roomId: room._id }))} className={`rounded-lg border px-4 py-2 text-sm font-medium ${selected.roomId === room._id ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"}`}>
                            Room {room.roomNumber}{room.floor != null ? ` · Floor ${room.floor}` : ""}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <button type="button" onClick={() => setSelected({ typeId: option.roomType._id, roomId: "" })} className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Choose this room type</button>
                  )}
                </div>
              </article>
            );
          })}

          {availability && !availability.options?.length && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">No rooms are available for these dates. Please try other dates.</p>
          )}
          <div className="flex justify-end">
            <button type="button" onClick={goToDetails} disabled={!selected.roomId} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Continue to guest details</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="rounded-xl bg-indigo-50 p-3 text-indigo-600"><UserRound size={20} /></span>
              <div>
                <h2 className="font-semibold text-slate-900">Your guest profile</h2>
                <p className="mt-1 text-sm text-slate-500">{profileLoading ? "Loading your account details..." : "Your own account details are filled in below. Review them before continuing."}</p>
              </div>
            </div>
            {profileLoading ? (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Loading profile...</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *"><input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className={inputClass} autoComplete="name" required /></Field>
                <Field label="Phone number *"><input type="tel" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} className={inputClass} autoComplete="tel" required /></Field>
                <Field label="Email"><input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} className={inputClass} autoComplete="email" /></Field>
                <Field label="Gender">
                  <select value={guest.gender} onChange={(e) => setGuest({ ...guest, gender: e.target.value })} className={inputClass}>
                    <option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </Field>
                <Field label="City"><input value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} className={inputClass} autoComplete="address-level2" /></Field>
                <div className="sm:col-span-2"><Field label="Address"><textarea rows={3} value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} className={inputClass} autoComplete="street-address" /></Field></div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Additional guests</h2><p className="mt-1 text-sm text-slate-500">Add anyone staying with you.</p></div>
              <button type="button" onClick={() => setExtraGuests((prev) => [...prev, { ...emptyExtraGuest }])} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus size={16} /> Add guest</button>
            </div>
            {extraGuests.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No additional guests added.</p> : (
              <div className="space-y-3">
                {extraGuests.map((item, index) => (
                  <div key={index} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">Guest {index + 1}</p><button type="button" onClick={() => setExtraGuests((prev) => prev.filter((_, i) => i !== index))} className="inline-flex items-center gap-1.5 text-sm text-rose-600"><Trash2 size={14} /> Remove</button></div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Name *"><input value={item.name} onChange={(e) => updateExtraGuest(index, { name: e.target.value })} className={inputClass} required /></Field>
                      <Field label="Age"><input type="number" min="0" max="120" value={item.age} onChange={(e) => updateExtraGuest(index, { age: e.target.value })} className={inputClass} /></Field>
                      <Field label="Gender"><select value={item.gender} onChange={(e) => updateExtraGuest(index, { gender: e.target.value })} className={inputClass}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
                      <Field label="Relation"><input value={item.relation} onChange={(e) => updateExtraGuest(index, { relation: e.target.value })} className={inputClass} placeholder="e.g. Family" /></Field>
                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2 lg:col-span-4"><input type="checkbox" checked={item.isChild} onChange={(e) => updateExtraGuest(index, { isChild: e.target.checked })} /> This guest is a child</label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="font-semibold text-slate-900">Arrival & special requests</h2>
            <p className="mt-1 text-sm text-slate-500">Optional details to help prepare for your stay.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Expected arrival time"><input type="time" value={expectedArrivalTime} onChange={(e) => setExpectedArrivalTime(e.target.value)} className={inputClass} /></Field>
              <Field label="Special requests"><textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className={inputClass} placeholder="Any special requirements?" /></Field>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back</button>
            <button type="button" onClick={goToReview} disabled={profileLoading} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">Review booking</button>
          </div>
        </section>
      )}

      {step === 3 && selectedOption && selectedRoom && (
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ClipboardCheck size={20} /></span>
              <div><h2 className="font-semibold text-slate-900">Review your booking</h2><p className="text-sm text-slate-500">Check the details before submitting.</p></div>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Stay details</p>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Room type</dt><dd className="text-right font-semibold">{selectedOption.roomType.name}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Room number</dt><dd className="font-semibold">{selectedRoom.roomNumber}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-in</dt><dd className="font-semibold">{formatDate(stay.checkIn)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Check-out</dt><dd className="font-semibold">{formatDate(stay.checkOut)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Guests</dt><dd className="text-right font-semibold">{stay.adults} adult(s), {stay.children} child(ren)</dd></div>
                  {expectedArrivalTime && <div className="flex justify-between gap-4"><dt className="text-slate-500">Arrival time</dt><dd className="font-semibold">{expectedArrivalTime}</dd></div>}
                </dl>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Primary guest</p>
                <p className="font-semibold text-slate-900">{guest.name}</p><p className="mt-1 text-sm text-slate-600">{guest.phone}</p>
                {guest.email && <p className="mt-1 text-sm text-slate-600">{guest.email}</p>}
                {guest.city && <p className="mt-1 text-sm text-slate-600">{guest.city}</p>}
                {extraGuests.length > 0 && <p className="mt-3 text-sm text-slate-600">{extraGuests.length} additional guest(s)</p>}
                {specialRequests && <div className="mt-3 border-t border-slate-200 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Special requests</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{specialRequests}</p></div>}
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-indigo-900">Estimated total</p><p className="mt-1 text-xs text-indigo-700">{nights} night(s) · {formatINR(selectedOption.pricePerNight)} per night</p></div><p className="text-2xl font-bold text-indigo-950">{formatINR(selectedOption.totalAmount)}</p></div>
              <p className="mt-2 text-xs text-indigo-700">Final charges and payment instructions follow the hotel's booking policy.</p>
            </div>
          </div>
          <div className="flex justify-between gap-3">
            <button type="button" onClick={() => setStep(2)} disabled={saving} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back</button>
            <button type="button" onClick={submitBooking} disabled={saving || profileLoading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" />}{saving ? "Submitting booking..." : "Confirm booking"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
