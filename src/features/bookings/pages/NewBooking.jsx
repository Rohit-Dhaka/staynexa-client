import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  searchAvailability,
  createBooking,
  createHold,
  addPayment,
} from "../services/bookings.service";
// Namespace import: the page still loads even if the function name differs.
import * as frontdeskService from "../../frontdesk/services/frontdesk.service";
import { lookupGuest, suggestGuests } from "../../guests/services/guests.service";
import { Field, ErrorBox, NoteBox, inputClass } from "../components/formUi";
import {
  BOOKING_SOURCES,
  ID_PROOF_TYPES,
  PAYMENT_METHODS,
  addDaysToInput,
  formatDate,
  formatDateTime,
  formatINR,
  getErrorMessage,
  nightsBetween,
  toInputDate,
} from "../utils/bookingUi";

// The check-in function exported by frontdesk.service.js.
const checkInGuest = frontdeskService.checkIn || frontdeskService.checkInBooking;

// Same rule as the backend, so "+91 98765-43210" and "9876543210" match.
const phoneKey = (value = "") => {
  let digits = String(value).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
};

const EMPTY_LOOKUP = { loading: false, guest: null, stays: 0 };

const STEPS = ["Dates & Room", "Guest Details", "Payment / Hold"];
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const HOLD_DURATIONS = [
  { value: "", label: "Default (until 6 PM on arrival day)" },
  { value: "2", label: "2 hours" },
  { value: "6", label: "6 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
];

const emptyExtraGuest = {
  name: "",
  age: "",
  gender: "male",
  relation: "",
  isChild: false,
  idType: "aadhaar",
  idNumber: "",
};

const Select = ({ value, onChange, children }) => (
  <select value={value} onChange={onChange} className={inputClass}>
    {children}
  </select>
);

const Switch = ({ checked, disabled, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
      checked ? "bg-emerald-500" : "bg-slate-300"
    }`}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white  transition-transform ${
        checked ? "translate-x-[22px]" : "translate-x-0.5"
      }`}
    />
  </button>
);

const NewBooking = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);
  const today = toInputDate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  const [stay, setStay] = useState({
    checkIn: today,
    checkOut: addDaysToInput(today, 1),
    adults: 1,
    children: 0,
  });
  const [availability, setAvailability] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState({ typeId: "", roomId: "" });

  const [guest, setGuest] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "male",
    city: "",
    address: "",
    idType: "aadhaar",
    idNumber: "",
  });
  const [extraGuests, setExtraGuests] = useState([]);

  // Saved guest profile (returning guest)
  const [guestId, setGuestId] = useState("");
  const [lookup, setLookup] = useState(EMPTY_LOOKUP);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [extra, setExtra] = useState({
    source: "walk_in",
    expectedArrivalTime: "",
    specialRequests: "",
    internalNotes: "",
    companyName: "",
    gstin: "",
  });

  const [pricing, setPricing] = useState({
    pricePerNight: "",
    discountAmount: "",
    discountReason: "",
    advanceRequired: "",
  });
  const [pay, setPay] = useState({ amount: "", method: "cash", reference: "" });
  const [holdOpts, setHoldOpts] = useState({
    isHold: false,
    holdHours: "",
    holdNote: "",
  });
  const [checkInNow, setCheckInNow] = useState(false);
  const [saving, setSaving] = useState(false);

  // "fixed" = check-in and check-out are both confirmed
  // "open"  = check-in only, the check-out date is not confirmed yet
  const [stayMode, setStayMode] = useState("fixed");
  const [expectedNights, setExpectedNights] = useState("1");

  const isHold = holdOpts.isHold;
  const isOpenStay = stayMode === "open";

  /* ----------------------- Returning guest lookup ----------------------- */

  // The saved guest only counts while the typed phone number still matches.
  const matchedGuest =
    lookup.guest && phoneKey(lookup.guest.phone) === phoneKey(guest.phone)
      ? lookup.guest
      : null;
  const usingSavedGuest =
    Boolean(matchedGuest) && guestId === matchedGuest._id;
  const showNewGuestHint =
    !lookup.loading && !matchedGuest && phoneKey(guest.phone).length >= 10;

  // Look the phone number up once the user stops typing.
  useEffect(() => {
    if (phoneKey(guest.phone).length < 10) {
      setLookup(EMPTY_LOOKUP);
      return undefined;
    }

    let active = true;

    const timer = setTimeout(() => {
      setLookup((previous) => ({ ...previous, loading: true }));

      lookupGuest(guest.phone)
        .then((result) => {
          if (!active) return;
          setLookup({
            loading: false,
            guest: result.guest || null,
            stays: result.stays || 0,
          });
        })
        .catch(() => {
          if (active) setLookup(EMPTY_LOOKUP);
        });
    }, 500);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [guest.phone]);

  // Type-ahead search by name, phone or email.
  useEffect(() => {
    const query = suggestQuery.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return undefined;
    }

    let active = true;
    setSuggesting(true);

    const timer = setTimeout(() => {
      suggestGuests(query)
        .then((result) => {
          if (active) setSuggestions(result.guests || []);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        })
        .finally(() => {
          if (active) setSuggesting(false);
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [suggestQuery]);

  const applyGuest = (saved, stays = 0) => {
    setGuest((previous) => ({
      ...previous,
      name: saved.name || "",
      phone: saved.phone || "",
      email: saved.email || "",
      gender: saved.gender || "male",
      city: saved.city || "",
      address: saved.address || "",
      idType: saved.idProof?.type || previous.idType,
      idNumber: saved.idProof?.number || "",
    }));
    setGuestId(saved._id);
    setLookup({ loading: false, guest: saved, stays });
  };

  const selectSuggestion = async (item) => {
    setSuggestQuery("");
    setSuggestions([]);
    setShowSuggestions(false);

    try {
      const result = await lookupGuest(item.phone);
      if (result.guest) applyGuest(result.guest, result.stays);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handlePhoneChange = (value) => {
    setGuest((previous) => ({ ...previous, phone: value }));

    // A different phone number means a different person.
    if (guestId && phoneKey(value) !== phoneKey(lookup.guest?.phone)) {
      setGuestId("");
    }
  };
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const isAdvanceBooking = stay.checkIn > today;

  const option = availability?.options.find(
    (o) => o.roomType._id === selected.typeId,
  );
  const room = option?.rooms.find((r) => r._id === selected.roomId);

  const advanceDue = isHold
    ? 0
    : isManager && pricing.advanceRequired !== ""
      ? Number(pricing.advanceRequired) || 0
      : isAdvanceBooking
        ? option?.suggestedAdvance || 0
        : 0;

  const hasOverride =
    isManager &&
    (pricing.pricePerNight !== "" || pricing.discountAmount !== "");

  /* -------------------- "Check in now" toggle rules -------------------- */

  // Only for confirmed (not hold) bookings that start today.
  const canOfferCheckIn =
    Boolean(checkInGuest) && !isHold && stay.checkIn === today;

  // Reasons the toggle cannot be switched on yet.
  const checkInBlockedReason = !guest.idNumber.trim()
    ? "Enter the guest's ID number in the Guest Details step to enable check-in."
    : advanceDue > 0
      ? "Check-in is not available while an advance payment is required. Collect the advance first."
      : "";

  const willCheckIn = canOfferCheckIn && checkInNow && !checkInBlockedReason;

  const resetSearch = () => {
    setAvailability(null);
    setSelected({ typeId: "", roomId: "" });
  };

  const toNightsNumber = (value) =>
    Math.min(Math.max(Math.floor(Number(value)) || 1, 1), 60);

  const changeStay = (name, value) => {
    resetSearch();
    setStay((s) => {
      const next = { ...s, [name]: value };

      if (name === "checkIn") {
        if (isOpenStay) {
          // Check-in only: the expected check-out follows the expected nights.
          next.checkOut = addDaysToInput(value, toNightsNumber(expectedNights));
        } else if (next.checkOut <= value) {
          next.checkOut = addDaysToInput(value, 1);
        }
      }

      return next;
    });
  };

  const changeStayMode = (mode) => {
    if (mode === stayMode) return;

    resetSearch();
    setStayMode(mode);

    if (mode === "open") {
      setStay((s) => ({
        ...s,
        checkOut: addDaysToInput(s.checkIn, toNightsNumber(expectedNights)),
      }));
    }
  };

  const changeExpectedNights = (value) => {
    resetSearch();
    setExpectedNights(value);
    setStay((s) => ({
      ...s,
      checkOut: addDaysToInput(s.checkIn, toNightsNumber(value)),
    }));
  };

  const runSearch = async () => {
    setError("");
    if (stay.checkIn < today)
      return setError("Check-in date cannot be in the past");
    if (nights < 1) return setError("Check-out must be after check-in");

    setSearching(true);
    try {
      const result = await searchAvailability({
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults: stay.adults,
        children: stay.children,
      });
      setAvailability(result);
      setSelected({ typeId: "", roomId: "" });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const goStep2 = () => {
    setError("");
    if (!selected.roomId) return setError("Please select a room first");
    setStep(2);
  };

  const goStep3 = () => {
    setError("");
    if (!guest.name.trim()) return setError("Enter the guest's name");
    if (matchedGuest?.isBlacklisted) {
      return setError(
        `This guest is blacklisted${
          matchedGuest.blacklistReason ? `: ${matchedGuest.blacklistReason}` : ""
        }. A booking cannot be created.`,
      );
    }
    if (!/^\d{10,15}$/.test(guest.phone.replace(/[\s+-]/g, ""))) {
      return setError("Enter a valid phone number (10 to 15 digits)");
    }
    if (extra.gstin && !GSTIN_REGEX.test(extra.gstin.trim().toUpperCase())) {
      return setError("Enter a valid GSTIN");
    }
    if (extraGuests.some((g) => !g.name.trim())) {
      return setError("Enter a name for each additional guest or remove the row");
    }
    setPay((p) => ({
      ...p,
      amount:
        isAdvanceBooking && option?.suggestedAdvance
          ? String(option.suggestedAdvance)
          : "",
    }));
    setStep(3);
  };

  const updateExtraGuest = (index, patch) =>
    setExtraGuests((list) =>
      list.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    );

  const submit = async () => {
    setError("");
    const payAmount = Number(pay.amount) || 0;
    if (!isHold && payAmount < 0)
      return setError("Enter a valid payment amount");

    const payload = {
      room: selected.roomId,
      guestId: guestId || undefined,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      // false = check-in only, the check-out date is only an estimate
      checkOutConfirmed: !isOpenStay,
      adults: Number(stay.adults),
      children: Number(stay.children),
      source: extra.source,
      expectedArrivalTime: extra.expectedArrivalTime,
      specialRequests: extra.specialRequests,
      internalNotes: extra.internalNotes,
      guestDetails: {
        name: guest.name.trim(),
        phone: guest.phone.trim(),
        email: guest.email.trim(),
        gender: guest.gender,
        address: guest.address.trim(),
        city: guest.city.trim(),
        ...(guest.idNumber.trim()
          ? { idProof: { type: guest.idType, number: guest.idNumber.trim() } }
          : {}),
      },
      additionalGuests: extraGuests.map((g) => ({
        name: g.name.trim(),
        age: g.age === "" ? undefined : Number(g.age),
        gender: g.gender,
        relation: g.relation.trim(),
        isChild: g.isChild,
        ...(g.idNumber.trim()
          ? { idProof: { type: g.idType, number: g.idNumber.trim() } }
          : {}),
      })),
      billTo: {
        companyName: extra.companyName.trim(),
        gstin: extra.gstin.trim().toUpperCase(),
      },
    };

    if (isManager) {
      if (pricing.pricePerNight !== "")
        payload.pricePerNight = Number(pricing.pricePerNight);
      if (pricing.discountAmount !== "") {
        payload.discountAmount = Number(pricing.discountAmount);
        payload.discountReason = pricing.discountReason;
      }
      if (!isHold && pricing.advanceRequired !== "")
        payload.advanceRequired = Number(pricing.advanceRequired);
    }

    if (isHold) {
      if (holdOpts.holdHours) payload.holdHours = Number(holdOpts.holdHours);
      payload.holdNote = holdOpts.holdNote;
    }

    setSaving(true);
    let booking;
    try {
      booking = isHold
        ? await createHold(payload)
        : await createBooking(payload);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
      return;
    }

    const notices = [];

    if (isHold) {
      notices.push(
        `The room is on hold until ${formatDateTime(booking.holdExpiresAt)}. If the guest arrives, check them in or confirm the booking.`,
      );
    } else {
      if (payAmount > 0) {
        try {
          await addPayment(booking._id, {
            type: "advance_booking",
            method: pay.method,
            amount: payAmount,
            reference: pay.reference,
          });
        } catch (err) {
          notices.push(
            `Booking created, but the payment could not be recorded: ${getErrorMessage(err)}`,
          );
        }
      }

      if (willCheckIn) {
        try {
          await checkInGuest(booking._id, {});
          notices.push("Booking created and the guest has been checked in.");
        } catch (err) {
          notices.push(
            `Booking created, but check-in failed: ${getErrorMessage(err)}. You can check the guest in from the booking page.`,
          );
        }
      }
    }

    setSaving(false);
    navigate(`/bookings/${booking._id}`, {
      state: { notice: notices.join(" ") },
    });
  };

  const bookingTypeLabel = isHold
    ? "Hold"
    : willCheckIn
      ? "Check-in now"
      : isAdvanceBooking
        ? "Advance booking"
        : "Same-day booking";

  return (
    <div className="mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          aria-label="Back to bookings"
          className="rounded p-2 text-slate-500 transition hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Booking</h1>
          <p className="text-sm text-slate-500">
            Walk-in, Advance Booking, or Room Hold Only
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-black text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? <Check size={14} /> : n}
              </span>
              <span
                className={`hidden text-sm sm:block ${active ? "font-medium text-slate-900" : "text-slate-500"}`}
              >
                {label}
              </span>
              {n < STEPS.length && (
                <span className="h-px flex-1 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      <ErrorBox message={error} />

      {step === 1 && (
        <div className="space-y-5">
          <div className="rounded border border-slate-200 bg-white p-5">
            {/* Switch between "check-in & check-out" and "check-in only" */}
            <div
              role="group"
              aria-label="Stay type"
              className="mb-2 inline-flex rounded bg-slate-100 p-1"
            >
              {[
                { value: "fixed", label: "Check-in & Check-out" },
                { value: "open", label: "Check-in only" },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => changeStayMode(mode.value)}
                  aria-pressed={stayMode === mode.value}
                  className={`rounded px-4 py-2 text-sm font-medium transition ${
                    stayMode === mode.value
                      ? "bg-white text-slate-900 "
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="mb-4 text-xs text-slate-500">
              {isOpenStay
                ? "The check-out date is not confirmed yet. Enter the expected number of nights. The final bill will follow the actual check-out."
                : "Both the check-in and the check-out dates are confirmed."}
            </p>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Check-in">
                <input
                  type="date"
                  min={today}
                  value={stay.checkIn}
                  onChange={(e) => changeStay("checkIn", e.target.value)}
                  className={inputClass}
                />
              </Field>
              {isOpenStay ? (
                <Field
                  label="Expected nights"
                  hint={`Expected check-out: ${formatDate(stay.checkOut)}`}
                >
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={expectedNights}
                    onChange={(e) => changeExpectedNights(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              ) : (
                <Field
                  label="Check-out"
                  hint={
                    nights > 0 ? `${nights} night${nights > 1 ? "s" : ""}` : ""
                  }
                >
                  <input
                    type="date"
                    min={addDaysToInput(stay.checkIn, 1)}
                    value={stay.checkOut}
                    onChange={(e) => changeStay("checkOut", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              )}
              <Field label="Adults">
                <input
                  type="number"
                  min="1"
                  value={stay.adults}
                  onChange={(e) => changeStay("adults", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Children">
                <input
                  type="number"
                  min="0"
                  value={stay.children}
                  onChange={(e) => changeStay("children", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={runSearch}
              disabled={searching}
              className="mt-4 flex items-center gap-2 rounded bg-black px-5 py-2.5 text-sm font-semibold text-white transition  disabled:opacity-60"
            >
              {searching && <Loader2 size={16} className="animate-spin" />}
              Available rooms
            </button>
          </div>

          {availability && availability.options.length === 0 && (
            <p className="rounded border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
              No rooms are available for these dates and guest count
            </p>
          )}

          {availability?.options.map((opt) => {
            const active = selected.typeId === opt.roomType._id;
            return (
              <div
                key={opt.roomType._id}
                className={`rounded border bg-white p-5 transition ${
                  active
                    ? "border-indigo-500 ring-2 ring-indigo-100"
                    : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {opt.roomType.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                      <Users size={14} />
                      {opt.roomType.capacity?.adults} adults,{" "}
                      {opt.roomType.capacity?.children} children
                      <span className="text-slate-300">|</span>
                      {opt.roomType.bedType} bed
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">
                      {opt.availableCount} room available
                    </p>
                    {(opt.roomType.amenities || []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opt.roomType.amenities.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-slate-500">
                      {formatINR(opt.pricePerNight)} / night
                    </p>
                    <p className="text-xl font-semibold text-slate-900">
                      {formatINR(opt.totalAmount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {availability.nights} night
                      {availability.nights > 1 ? "s" : ""}
                      {opt.taxPercent > 0
                        ? `, ${opt.taxPercent}% GST included`
                        : ""}
                    </p>
                  </div>
                </div>

                {active ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Choose a Room Number
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opt.rooms.map((r) => (
                        <button
                          key={r._id}
                          type="button"
                          onClick={() =>
                            setSelected((s) => ({ ...s, roomId: r._id }))
                          }
                          className={`rounded px-3 py-1.5 text-sm transition ${
                            selected.roomId === r._id
                              ? "bg-black text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {r.roomNumber}{" "}
                          <span className="text-xs opacity-70">
                            (F{r.floor})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setSelected({
                        typeId: opt.roomType._id,
                        roomId: opt.rooms[0]?._id || "",
                      })
                    }
                    className="mt-4 rounded border border-indigo-200 px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    Choose a Room Type
                  </button>
                )}
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={goStep2}
              disabled={!selected.roomId}
              className="rounded bg-black px-6 py-2.5 text-sm font-semibold text-white transition  disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Primary guest
            </h2>

            {/* Find a saved guest */}
            <div className="relative mb-4">
              <label
                htmlFor="guestSearch"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                Find an existing guest
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="guestSearch"
                  value={suggestQuery}
                  onChange={(e) => {
                    setSuggestQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setShowSuggestions(false)}
                  placeholder="Search by name, phone or email"
                  autoComplete="off"
                  className={`${inputClass} pl-10`}
                />
                {suggesting && (
                  <Loader2
                    size={16}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  />
                )}
              </div>

              {showSuggestions && suggestQuery.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded border border-slate-200 bg-white ">
                  {suggestions.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500">
                      {suggesting ? "Searching..." : "No guests found"}
                    </p>
                  ) : (
                    suggestions.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(item)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {item.name}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {item.phone}
                            {item.city ? ` - ${item.city}` : ""}
                          </span>
                        </span>
                        <span className="flex shrink-0 gap-1.5">
                          {item.isVip && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                              VIP
                            </span>
                          )}
                          {item.isBlacklisted && (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                              Blacklisted
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Result of the phone number lookup */}
            {matchedGuest?.isBlacklisted && (
              <div className="mb-4 flex items-start gap-3 rounded border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>
                  <span className="font-semibold">{matchedGuest.name}</span> is
                  blacklisted
                  {matchedGuest.blacklistReason
                    ? `: ${matchedGuest.blacklistReason}`
                    : "."}{" "}
                  A booking cannot be created for this guest.
                </p>
              </div>
            )}

            {matchedGuest && !matchedGuest.isBlacklisted && !usingSavedGuest && (
              <div className="mb-4 flex flex-col gap-3 rounded border border-indigo-200 bg-indigo-50 p-3.5 text-sm text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <UserCheck size={18} className="mt-0.5 shrink-0" />
                  <p>
                    Returning guest:{" "}
                    <span className="font-semibold">{matchedGuest.name}</span>
                    {matchedGuest.isVip ? " (VIP)" : ""} with {lookup.stays}{" "}
                    previous stay{lookup.stays === 1 ? "" : "s"}. This booking
                    will be linked to their profile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyGuest(matchedGuest, lookup.stays)}
                  className="shrink-0 rounded bg-black px-4 py-2 text-xs font-semibold text-white transition "
                >
                  Fill saved details
                </button>
              </div>
            )}

            {usingSavedGuest && !matchedGuest.isBlacklisted && (
              <div className="mb-4 flex items-start gap-3 rounded border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
                <UserCheck size={18} className="mt-0.5 shrink-0" />
                <p>
                  Using the saved profile of{" "}
                  <span className="font-semibold">{matchedGuest.name}</span>
                  {matchedGuest.isVip ? " (VIP)" : ""}, {lookup.stays} previous
                  stay{lookup.stays === 1 ? "" : "s"}. Missing details will be
                  added to the profile.
                </p>
              </div>
            )}

            {lookup.loading && (
              <p className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 size={13} className="animate-spin" />
                Checking if this phone number is already saved...
              </p>
            )}

            {showNewGuestHint && (
              <p className="mb-4 flex items-center gap-2 text-xs text-slate-500">
                <UserPlus size={14} />
                New guest. A guest profile will be created with this booking.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name *">
                <input
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone *">
                <input
                  value={guest.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={guest.email}
                  onChange={(e) =>
                    setGuest({ ...guest, email: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={guest.gender}
                  onChange={(e) =>
                    setGuest({ ...guest, gender: e.target.value })
                  }
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
              <Field label="City">
                <input
                  value={guest.city}
                  onChange={(e) => setGuest({ ...guest, city: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Address">
                <input
                  value={guest.address}
                  onChange={(e) =>
                    setGuest({ ...guest, address: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="ID proof type">
                <Select
                  value={guest.idType}
                  onChange={(e) =>
                    setGuest({ ...guest, idType: e.target.value })
                  }
                >
                  {ID_PROOF_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="ID number"
                hint="Currently optional; required at check-in. Only the last 4 digits of the Aadhaar number are stored."
              >
                <input
                  value={guest.idNumber}
                  onChange={(e) =>
                    setGuest({ ...guest, idNumber: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Additional guests
              </h2>
              <button
                type="button"
                onClick={() =>
                  setExtraGuests((l) => [...l, { ...emptyExtraGuest }])
                }
                className="flex items-center gap-1.5 rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <Plus size={15} /> Add Guest
              </button>
            </div>

            {extraGuests.length === 0 && (
              <p className="text-sm text-slate-500">No Additional Guests</p>
            )}

            <div className="space-y-4">
              {extraGuests.map((g, i) => (
                <div key={i} className="rounded border border-slate-200 p-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <Field label="Name *">
                      <input
                        value={g.name}
                        onChange={(e) =>
                          updateExtraGuest(i, { name: e.target.value })
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Age">
                      <input
                        type="number"
                        min="0"
                        value={g.age}
                        onChange={(e) =>
                          updateExtraGuest(i, { age: e.target.value })
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Gender">
                      <Select
                        value={g.gender}
                        onChange={(e) =>
                          updateExtraGuest(i, { gender: e.target.value })
                        }
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </Select>
                    </Field>
                    <Field label="Relation">
                      <input
                        value={g.relation}
                        onChange={(e) =>
                          updateExtraGuest(i, { relation: e.target.value })
                        }
                        className={inputClass}
                      />
                    </Field>
                    <Field label="ID type">
                      <Select
                        value={g.idType}
                        onChange={(e) =>
                          updateExtraGuest(i, { idType: e.target.value })
                        }
                      >
                        {ID_PROOF_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="ID number">
                      <input
                        value={g.idNumber}
                        onChange={(e) =>
                          updateExtraGuest(i, { idNumber: e.target.value })
                        }
                        className={inputClass}
                      />
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={g.isChild}
                        onChange={(e) =>
                          updateExtraGuest(i, { isChild: e.target.checked })
                        }
                      />
                      Is a child
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraGuests((l) => l.filter((_, idx) => idx !== i))
                      }
                      className="flex items-center justify-center gap-1.5 self-end rounded px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Booking details
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Source">
                <Select
                  value={extra.source}
                  onChange={(e) =>
                    setExtra({ ...extra, source: e.target.value })
                  }
                >
                  {BOOKING_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expected arrival time">
                <input
                  type="time"
                  value={extra.expectedArrivalTime}
                  onChange={(e) =>
                    setExtra({ ...extra, expectedArrivalTime: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              {/* <Field label="Company name (for GST invoice)">
                <input
                  value={extra.companyName}
                  onChange={(e) =>
                    setExtra({ ...extra, companyName: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="GSTIN">
                <input
                  value={extra.gstin}
                  maxLength={15}
                  onChange={(e) =>
                    setExtra({ ...extra, gstin: e.target.value.toUpperCase() })
                  }
                  className={inputClass}
                />
              </Field> */}
              <Field label="Special requests">
                <textarea
                  rows="2"
                  value={extra.specialRequests}
                  onChange={(e) =>
                    setExtra({ ...extra, specialRequests: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Internal notes (Not visible to guests)">
                <textarea
                  rows="2"
                  value={extra.internalNotes}
                  onChange={(e) =>
                    setExtra({ ...extra, internalNotes: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goStep3}
              className="rounded bg-black px-6 py-2.5 text-sm font-semibold text-white transition "
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && option && (
        <div className="space-y-5">
          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Booking type
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                {
                  value: false,
                  title: "Confirmed Booking",
                  text: "Create a complete booking, with or without an advance payment.",
                },
                {
                  value: true,
                  title: "Room Hold Only",
                  text: "Reserve the room temporarily without payment. Confirm the booking later.",
                },
              ].map((o) => (
                <button
                  key={o.title}
                  type="button"
                  onClick={() => setHoldOpts({ ...holdOpts, isHold: o.value })}
                  className={`rounded border p-4 text-left transition ${
                    isHold === o.value
                      ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {o.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{o.text}</p>
                </button>
              ))}
            </div>
          </div>

          {canOfferCheckIn && (
            <div className="rounded border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    Check in now
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Check the guest in as soon as the booking is created. The
                    room will be marked as occupied.
                  </p>
                  {checkInBlockedReason && (
                    <p className="mt-2 text-xs text-amber-600">
                      {checkInBlockedReason}
                    </p>
                  )}
                </div>

                <Switch
                  checked={willCheckIn}
                  disabled={Boolean(checkInBlockedReason) || saving}
                  onChange={() => setCheckInNow((previous) => !previous)}
                  label="Check in now"
                />
              </div>
            </div>
          )}

          <div className="rounded border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Booking summary
            </h2>
            <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
              <div className="flex justify-between">
                <dt className="text-slate-500">Guest</dt>
                <dd className="font-medium text-slate-900">{guest.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Room</dt>
                <dd className="font-medium text-slate-900">
                  {room?.roomNumber} ({option.roomType.name})
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Check-in</dt>
                <dd className="font-medium text-slate-900">
                  {formatDate(stay.checkIn)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Check-out</dt>
                <dd className="text-right font-medium text-slate-900">
                  {isOpenStay ? (
                    <>
                      Not confirmed
                      <span className="block text-xs font-normal text-slate-500">
                        Expected {formatDate(stay.checkOut)}
                      </span>
                    </>
                  ) : (
                    formatDate(stay.checkOut)
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Guests</dt>
                <dd className="font-medium text-slate-900">
                  {stay.adults} adults, {stay.children} children
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium text-slate-900">
                  {bookingTypeLabel}
                </dd>
              </div>
            </dl>

            <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Room ({nights} x {formatINR(option.pricePerNight)})
                </span>
                <span>{formatINR(option.roomCharges)}</span>
              </div>
              {option.taxPercent > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    GST {option.taxPercent}%
                  </span>
                  <span>{formatINR(option.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatINR(option.totalAmount)}</span>
              </div>
              {hasOverride && (
                <p className="text-xs text-amber-600">
                  Price or discount was changed. The final total will be shown
                  on the booking page after it is created.
                </p>
              )}
              {isOpenStay && (
                <p className="text-xs text-amber-600">
                  Check-out is not confirmed. This total is an estimate for{" "}
                  {nights} night{nights > 1 ? "s" : ""}. The final bill will be
                  based on the actual check-out date.
                </p>
              )}
            </div>
          </div>

          {isManager && (
            <div className="rounded border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-base font-semibold text-slate-900">
                Manager options
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                Leave blank to apply the standard rate and policy.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Custom Price per Night">
                  <input
                    type="number"
                    min="0"
                    value={pricing.pricePerNight}
                    onChange={(e) =>
                      setPricing({ ...pricing, pricePerNight: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                {!isHold && (
                  <Field label="Advance required (amount)">
                    <input
                      type="number"
                      min="0"
                      value={pricing.advanceRequired}
                      onChange={(e) =>
                        setPricing({
                          ...pricing,
                          advanceRequired: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                )}
                <Field label="Discount (amount)">
                  <input
                    type="number"
                    min="0"
                    value={pricing.discountAmount}
                    onChange={(e) =>
                      setPricing({ ...pricing, discountAmount: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Discount Reason">
                  <input
                    value={pricing.discountReason}
                    onChange={(e) =>
                      setPricing({ ...pricing, discountReason: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}

          {isHold ? (
            <div className="rounded border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-base font-semibold text-slate-900">
                Hold Details
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                The room will remain unavailable to others during the hold. Once
                the hold expires, it will be released automatically.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Hold Until">
                  <Select
                    value={holdOpts.holdHours}
                    onChange={(e) =>
                      setHoldOpts({ ...holdOpts, holdHours: e.target.value })
                    }
                  >
                    {HOLD_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note">
                  <input
                    value={holdOpts.holdNote}
                    onChange={(e) =>
                      setHoldOpts({ ...holdOpts, holdNote: e.target.value })
                    }
                    placeholder="“The guest requested a hold until tomorrow.”"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ) : (
            <div className="rounded border border-slate-200 bg-white p-5">
              <h2 className="mb-1 text-base font-semibold text-slate-900">
                Advance payment
              </h2>
              <p className="mb-4 text-sm text-slate-500">
                {advanceDue > 0
                  ? `An advance payment of ${formatINR(advanceDue)} is required to confirm this booking. The booking will remain pending until the payment is received.`
                  : "Advance payment is optional for today's booking. You can collect it now or at check-in."}
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Amount">
                  <input
                    type="number"
                    min="0"
                    value={pay.amount}
                    onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Method">
                  <Select
                    value={pay.method}
                    onChange={(e) => setPay({ ...pay, method: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Reference (UPI ID, slip no.)">
                  <input
                    value={pay.reference}
                    onChange={(e) =>
                      setPay({ ...pay, reference: e.target.value })
                    }
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          )}

          {isHold && (
            <NoteBox tone="info">
              No payment or charges apply while a room is on hold. If the guest
              arrives, you can check them in directly or confirm the booking
              with an advance payment.
            </NoteBox>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={saving}
              className="rounded border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-2 rounded bg-black px-6 py-2.5 text-sm font-semibold text-white transition  disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {isHold
                ? "Place Room on Hold"
                : willCheckIn
                  ? "Create Booking & Check In"
                  : "Create Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewBooking;