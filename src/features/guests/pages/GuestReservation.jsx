import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import {

  ArrowLeft,

  BedDouble,

  CalendarDays,

  Check,

  ClipboardCheck,

  Loader2,

  Plus,

  Trash2,

  UserRound,

  Users,

} from "lucide-react";



import useAuth from "../../../hooks/useAuth";

import { ROLES } from "../../../constants/roles";

import { searchAvailability, createBooking } from "../../bookings/services/bookings.service";



import GuestCoupon from "../../offers/components/GuestCoupon";

import { Field, ErrorBox, inputClass } from "../../bookings/components/formUi";

import {

  addDaysToInput,

  formatDate,

  formatINR,

  getErrorMessage,

  nightsBetween,

  toInputDate,

} from "../../bookings/utils/bookingUi";



const STEPS = [

  { label: "Dates & Room", icon: CalendarDays },

  { label: "Guest Details", icon: UserRound },

  { label: "Review Booking", icon: ClipboardCheck },

];



const emptyExtraGuest = {

  name: "",

  age: "",

  gender: "male",

  relation: "",

  isChild: false,

};



const readOnlyClass = `${inputClass} cursor-not-allowed bg-slate-50 text-slate-500`;



export default function GuestReservation() {

  const navigate = useNavigate();

  const { user } = useAuth();

  const today = toInputDate();



  const [step, setStep] = useState(1);

  const [error, setError] = useState("");

  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);

  const [appliedCoupon, setAppliedCoupon] = useState(null);



  const [stay, setStay] = useState({

    checkIn: today,

    checkOut: addDaysToInput(today, 1),

    adults: 1,

    children: 0,

  });

  const [availability, setAvailability] = useState(null);

  const [selected, setSelected] = useState({ typeId: "", roomId: "" });

  const [guest, setGuest] = useState({

    name: "",

    phone: "",

    email: "",

    gender: "",

    city: "",

    address: "",

  });

  const [extraGuests, setExtraGuests] = useState([]);

  const [expectedArrivalTime, setExpectedArrivalTime] = useState("");

  const [specialRequests, setSpecialRequests] = useState("");



  useEffect(() => {

    if (!user) return;

    setGuest((previous) => ({

      name: user.name || previous.name,

      phone: user.phone || previous.phone,

      email: user.email || previous.email,

      gender: user.gender || previous.gender,

      city: user.address?.city || previous.city,

      address: user.address?.line1 || previous.address,

    }));

  }, [user]);



  useEffect(() => {

    if (user?.role && user.role !== ROLES.GUEST) {

      navigate("/", { replace: true });

    }

  }, [user, navigate]);



  const nights = nightsBetween(stay.checkIn, stay.checkOut);



  if (user?.role && user.role !== ROLES.GUEST) {

    return null;

  }



  const selectedOption = availability?.options?.find((item) => item.roomType._id === selected.typeId);

  const selectedRoom = selectedOption?.rooms?.find((item) => item._id === selected.roomId);



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

    if (extraGuests.some((item) => !item.name.trim())) {

      return setError("Enter a name for each additional guest or remove that row.");

    }

    setStep(3);

  };



  const updateExtraGuest = (index, patch) => {

    setExtraGuests((previous) => previous.map((item, i) => (i === index ? { ...item, ...patch } : item)));

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

    const booking = await createBooking({

      room: selected.roomId,

      checkIn: stay.checkIn,

      checkOut: stay.checkOut,

      adults: Number(stay.adults),

      children: Number(stay.children),



      guestDetails: {

        phone: guest.phone.trim(),

        gender: guest.gender,

        city: guest.city.trim(),

        address: guest.address.trim(),

      },



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





      couponCode: appliedCoupon?.code || undefined,

    });



    const bookingId = booking?._id || booking?.booking?._id;



    navigate("/guest/bookings", {

      state: {

        notice:

          "Your booking request has been submitted. The hotel will confirm it once the advance is received.",

        bookingId,

      },

    });

  } catch (err) {

    setError(getErrorMessage(err));

  } finally {

    setSaving(false);

  }

};





  return (

    <div className="mx-auto w-full space-y-6 py-6">

      <header className="flex items-center gap-3">

        <button

          type="button"

          onClick={() => navigate("/guest/bookings")}

          aria-label="Back to my bookings"

          className="rounded border border-slate-200 bg-white p-2.5 text-slate-600"

        >

          <ArrowLeft size={18} />

        </button>

        <div>

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Guest portal</p>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Book your stay</h1>

          <p className="mt-1 text-sm text-slate-500">Choose your dates, room, and guest details.</p>

        </div>

      </header>



      <div className="grid grid-cols-3 gap-2 rounded border border-slate-200 bg-white p-3 md:p-4">

        {STEPS.map((item, index) => {

          const number = index + 1;

          const Icon = item.icon;

          const active = step === number;

          const done = step > number;

          return (

            <div

              key={item.label}

              className={`flex items-center gap-2 rounded p-2 md:gap-3 md:p-3 ${

                active ? "bg-blue-50 text-slate-600" : done ? "text-emerald-700" : "text-slate-400"

              }`}

            >

              <span

                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${

                  active ? "bg-black text-white" : done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100"

                }`}

              >

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

  <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">



    <aside className="rounded border border-slate-200 bg-white p-4 xl:sticky xl:top-4">

      <div className="mb-4 flex items-center gap-2">

        <CalendarDays size={18} className="text-indigo-600" />

        <h2 className="text-sm font-semibold text-slate-900">

          Your Stay

        </h2>

      </div>



      <div className="space-y-3">

        <Field label="Check-in">

          <input

            type="date"

            min={today}

            value={stay.checkIn}

            onChange={(e) => changeStay("checkIn", e.target.value)}

            className={inputClass}

          />

        </Field>



        <Field label="Check-out">

          <input

            type="date"

            min={addDaysToInput(stay.checkIn, 1)}

            value={stay.checkOut}

            onChange={(e) => changeStay("checkOut", e.target.value)}

            className={inputClass}

          />

        </Field>



        <div className="grid grid-cols-2 gap-2">

          <Field label="Adults">

            <input

              type="number"

              min="1"

              max="20"

              value={stay.adults}

              onChange={(e) => changeStay("adults", e.target.value)}

              className={inputClass}

            />

          </Field>



          <Field label="Children">

            <input

              type="number"

              min="0"

              max="20"

              value={stay.children}

              onChange={(e) => changeStay("children", e.target.value)}

              className={inputClass}

            />

          </Field>

        </div>

      </div>



      <div className="mt-4 rounded bg-slate-50 p-3">

        <div className="flex items-center justify-between text-sm">

          <span className="text-slate-500">Duration</span>

          <span className="font-semibold text-slate-900">

            {nights > 0 ? `${nights} night(s)` : "Select dates"}

          </span>

        </div>

      </div>



      <button

        type="button"

        onClick={runSearch}

        disabled={searching}

        className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-black px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"

      >

        {searching && <Loader2 size={16} className="" />}

        {searching ? "Searching..." : "Search Rooms"}

      </button>

    </aside>





    <div className="min-w-0 rounded border border-slate-200 bg-white p-3 sm:p-4">

      <div className="mb-3 flex items-center justify-between gap-3">

        <div>

          <h2 className="text-base font-semibold text-slate-900">

            Available Rooms

          </h2>

          <p className="mt-1 text-xs text-slate-500">

            Select a room for your stay.

          </p>

        </div>



        {availability?.options?.length > 0 && (

          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">

            {availability.options.length} option(s)

          </span>

        )}

      </div>



      {!availability && (

        <div className="flex min-h-40 flex-col items-center justify-center rounded border border-dashed border-slate-200 px-4 py-8 text-center">

          <BedDouble size={28} className="text-slate-400" />

          <p className="mt-2 text-sm font-medium text-slate-700">

            Find Your Room

          </p>

          <p className="mt-1 max-w-xs text-xs text-slate-500">

            Choose your dates and search to see available rooms.

          </p>

        </div>

      )}



      {availability && !availability.options?.length && (

        <div className="rounded border border-amber-200 bg-amber-50 p-4">

          <p className="text-sm font-semibold text-amber-800">

            No rooms available

          </p>

          <p className="mt-1 text-xs text-amber-700">

            Try different dates or change the number of guests.

          </p>

        </div>

      )}



      {availability?.options?.length > 0 && (

        <div className="space-y-3">

          {availability.options.map((option) => {

            const typeId = option.roomType?._id;

            const active = selected.typeId === typeId;



            return (

              <article

                key={typeId}

                className={`overflow-hidden rounded border ${

                  active

                    ? "border-indigo-500"

                    : "border-slate-200"

                }`}

              >



                <div className="flex flex-wrap items-center justify-between gap-3 p-3">

                  <div className="min-w-0 flex-1">

                    <h3 className="text-sm font-semibold text-slate-900">

                      {option.roomType?.name || "Room Type"}

                    </h3>



                    <p className="mt-1 text-xs text-slate-500">

                      {option.roomType?.capacity?.adults ?? "-"} adults

                      {option.roomType?.capacity?.children != null

                        ? ` · ${option.roomType.capacity.children} children`

                        : ""}

                      {option.roomType?.bedType

                        ? ` · ${option.roomType.bedType} bed`

                        : ""}

                    </p>



                    <p className="mt-1 text-xs text-emerald-700">

                      {option.availableCount} room(s) available

                    </p>

                  </div>



                  <div className="flex items-center gap-3">

                    <div className="text-right">

                      <p className="text-base font-bold text-slate-900">

                        {formatINR(option.pricePerNight)}

                      </p>

                      <p className="text-xs text-slate-500">Per night</p>

                    </div>



                    {!active && (

                      <button

                        type="button"

                        onClick={() =>

                          setSelected({

                            typeId,

                            roomId: "",

                          })

                        }

                        className="rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"

                      >

                        Select

                      </button>

                    )}

                  </div>

                </div>





                {active && (

                  <div className="border-t border-slate-200 bg-slate-50 p-3">

                    <p className="mb-2 text-xs font-semibold text-slate-700">

                      Choose a Room

                    </p>



                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">

                      {option.rooms.map((room) => {

                        const isSelected = selected.roomId === room._id;



                        const firstImage =

                          option.roomType?.images?.[0] ||

                          room.images?.[0];



                        const imageUrl =

                          typeof firstImage === "string"

                            ? firstImage

                            : firstImage?.url || "";



                        const nightlyPrice =

                          room.priceOverride != null &&

                          room.priceOverride !== ""

                            ? Number(room.priceOverride)

                            : Number(option.pricePerNight) || 0;



                        return (

                          <button

                            key={room._id}

                            type="button"

                            onClick={() =>

                              setSelected((previous) => ({

                                ...previous,

                                roomId: room._id,

                              }))

                            }

                            className={`flex min-w-0 items-center gap-3 rounded border p-2 text-left ${

                              isSelected

                                ? "border-indigo-500 bg-indigo-50"

                                : "border-slate-200 bg-white "

                            }`}

                          >

                            {imageUrl ? (

                              <img

                                src={imageUrl}

                                alt={`Room ${room.roomNumber}`}

                                className="h-16 w-20 shrink-0 rounded object-cover"

                              />

                            ) : (

                              <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded bg-slate-100">

                                <BedDouble

                                  size={22}

                                  className="text-slate-400"

                                />

                              </div>

                            )}



                            <div className="min-w-0 flex-1">

                              <p className="truncate text-sm font-semibold text-slate-900">

                                Room {room.roomNumber}

                              </p>



                              <p className="mt-1 text-xs text-slate-500">

                                {room.floor != null

                                  ? `Floor ${room.floor}`

                                  : option.roomType?.name || "Room"}

                              </p>                        

                            </div>



                            <span

                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${

                                isSelected

                                  ? "border-indigo-600 bg-indigo-600 text-white"

                                  : "border-slate-300"

                              }`}

                            >

                              {isSelected && <Check size={12} />}

                            </span>

                          </button>

                        );

                      })}

                    </div>

                  </div>

                )}

              </article>

            );

          })}

        </div>

      )}





      {selected.roomId && selectedOption && selectedRoom && (

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-emerald-200 bg-emerald-50 p-3">

          <div>

            <p className="text-xs text-emerald-700">Selected Room</p>

            <p className="mt-1 text-sm font-semibold text-slate-900">

              {selectedOption.roomType?.name} · Room{" "}

              {selectedRoom.roomNumber}

            </p>

            <p className="mt-1 text-xs text-slate-500">

              {nights} night(s)

            </p>

          </div>



          <p className="text-base font-bold text-slate-900">

            {formatINR(selectedOption.totalAmount)}

          </p>

        </div>

      )}





      <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">

        <button

          type="button"

          onClick={goToDetails}

          disabled={!selected.roomId}

          className="w-full rounded bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"

        >

          Continue

        </button>

      </div>

    </div>

  </section>

)}





      {step === 2 && (

        <section className="space-y-5">

          <div className="rounded border border-slate-200 bg-white p-5 md:p-6">

            <div className="mb-5 flex items-start gap-3">

              <span className="rounded bg-blue-50 p-3 text-slate-600">

                <UserRound size={20} />

              </span>

              <div>

                <h2 className="font-semibold text-slate-900">Your guest profile</h2>

                <p className="mt-1 text-sm text-slate-500">

                  Your name and email come from your account. Check your phone number and other details before

                  continuing.

                </p>

              </div>

            </div>



            <div className="grid gap-4 sm:grid-cols-2">

              <Field label="Full name">

                <input value={guest.name} readOnly className={readOnlyClass} autoComplete="name" />

              </Field>

              <Field label="Phone number \*">

                <input

                  type="tel"

                  value={guest.phone}

                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}

                  className={inputClass}

                  autoComplete="tel"

                  required

                />

              </Field>

              <Field label="Email">

                <input type="email" value={guest.email} readOnly className={readOnlyClass} autoComplete="email" />

              </Field>

              <Field label="Gender">

                <select value={guest.gender} onChange={(e) => setGuest({ ...guest, gender: e.target.value })} className={inputClass}>

                  <option value="">Select gender</option>

                  <option value="male">Male</option>

                  <option value="female">Female</option>

                  <option value="other">Other</option>

                </select>

              </Field>

              <Field label="City">

                <input value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} className={inputClass} autoComplete="address-level2" />

              </Field>

              <div className="sm:col-span-2">

                <Field label="Address">

                  <textarea rows={3} value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} className={inputClass} autoComplete="street-address" />

                </Field>

              </div>

            </div>

          </div>



          <div className="rounded border border-slate-200 bg-white p-5 md:p-6">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

              <div>

                <h2 className="font-semibold text-slate-900">Additional guests</h2>

                <p className="mt-1 text-sm text-slate-500">Add anyone staying with you.</p>

              </div>

              <button

                type="button"

                onClick={() => setExtraGuests((prev) => [...prev, { ...emptyExtraGuest }])}

                className="inline-flex items-center gap-2 rounded border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700"

              >

                <Plus size={16} /> Add guest

              </button>

            </div>



            {extraGuests.length === 0 ? (

              <p className="rounded bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No additional guests added.</p>

            ) : (

              <div className="space-y-3">

                {extraGuests.map((item, index) => (

                  <div key={index} className="rounded border border-slate-200 p-4">

                    <div className="mb-3 flex items-center justify-between">

                      <p className="text-sm font-semibold text-slate-800">Guest {index + 1}</p>

                      <button

                        type="button"

                        onClick={() => setExtraGuests((prev) => prev.filter((_, i) => i !== index))}

                        className="inline-flex items-center gap-1.5 text-sm text-rose-600"

                      >

                        <Trash2 size={14} /> Remove

                      </button>

                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                      <Field label="Name \*">

                        <input value={item.name} onChange={(e) => updateExtraGuest(index, { name: e.target.value })} className={inputClass} required />

                      </Field>

                      <Field label="Age">

                        <input type="number" min="0" max="120" value={item.age} onChange={(e) => updateExtraGuest(index, { age: e.target.value })} className={inputClass} />

                      </Field>

                      <Field label="Gender">

                        <select value={item.gender} onChange={(e) => updateExtraGuest(index, { gender: e.target.value })} className={inputClass}>

                          <option value="male">Male</option>

                          <option value="female">Female</option>

                          <option value="other">Other</option>

                        </select>

                      </Field>

                      <Field label="Relation">

                        <input value={item.relation} onChange={(e) => updateExtraGuest(index, { relation: e.target.value })} className={inputClass} placeholder="e.g. Family" />

                      </Field>

                      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2 lg:col-span-4">

                        <input type="checkbox" checked={item.isChild} onChange={(e) => updateExtraGuest(index, { isChild: e.target.checked })} />

                        This guest is a child

                      </label>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>



          <div className="rounded border border-slate-200 bg-white p-5 md:p-6">

            <h2 className="font-semibold text-slate-900">Arrival & special requests</h2>

            <p className="mt-1 text-sm text-slate-500">Optional details to help prepare for your stay.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">

              <Field label="Expected arrival time">

                <input type="time" value={expectedArrivalTime} onChange={(e) => setExpectedArrivalTime(e.target.value)} className={inputClass} />

              </Field>

              <Field label="Special requests">

                <textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)} className={inputClass} placeholder="Any special requirements?" />

              </Field>

            </div>

          </div>



          <div className="flex justify-between gap-3">

            <button

              type="button"

              onClick={() => setStep(1)}

              className="rounded border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700"

            >

              Back

            </button>

            <button

              type="button"

              onClick={goToReview}

              className="rounded bg-black px-6 py-2.5 text-sm font-semibold text-white"

            >

              Review booking

            </button>

          </div>

        </section>

      )}



{step === 3 && selectedOption && selectedRoom && (

  <section className="space-y-5">

    <div className="rounded border border-slate-200 bg-white p-5 md:p-6">

      <div className="mb-5 flex items-center gap-3">

        <span className="rounded bg-emerald-50 p-3 text-emerald-700">

          <ClipboardCheck size={20} />

        </span>

        <div>

          <h2 className="font-semibold text-slate-900">

            Review your booking

          </h2>

          <p className="text-sm text-slate-500">

            Check the details before submitting.

          </p>

        </div>

      </div>



      <div className="grid gap-5 md:grid-cols-2">

        <div className="rounded bg-slate-50 p-4">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">

            Stay details

          </p>



          <dl className="space-y-3 text-sm">

            <div className="flex justify-between gap-4">

              <dt className="text-slate-500">Room type</dt>

              <dd className="text-right font-semibold">

                {selectedOption.roomType.name}

              </dd>

            </div>



            <div className="flex justify-between gap-4">

              <dt className="text-slate-500">Room number</dt>

              <dd className="font-semibold">

                {selectedRoom.roomNumber}

              </dd>

            </div>



            <div className="flex justify-between gap-4">

              <dt className="text-slate-500">Check-in</dt>

              <dd className="font-semibold">

                {formatDate(stay.checkIn)}

              </dd>

            </div>



            <div className="flex justify-between gap-4">

              <dt className="text-slate-500">Check-out</dt>

              <dd className="font-semibold">

                {formatDate(stay.checkOut)}

              </dd>

            </div>



            <div className="flex justify-between gap-4">

              <dt className="text-slate-500">Guests</dt>

              <dd className="text-right font-semibold">

                {stay.adults} adult(s), {stay.children} child(ren)

              </dd>

            </div>



            {expectedArrivalTime && (

              <div className="flex justify-between gap-4">

                <dt className="text-slate-500">Arrival time</dt>

                <dd className="font-semibold">

                  {expectedArrivalTime}

                </dd>

              </div>

            )}

          </dl>

        </div>



        <div className="rounded bg-slate-50 p-4">

          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">

            Primary guest

          </p>



          <p className="font-semibold text-slate-900">{guest.name}</p>

          <p className="mt-1 text-sm text-slate-600">{guest.phone}</p>



          {guest.email && (

            <p className="mt-1 text-sm text-slate-600">{guest.email}</p>

          )}



          {guest.city && (

            <p className="mt-1 text-sm text-slate-600">{guest.city}</p>

          )}



          {extraGuests.length > 0 && (

            <p className="mt-3 text-sm text-slate-600">

              {extraGuests.length} additional guest(s)

            </p>

          )}



          {specialRequests && (

            <div className="mt-3 border-t border-slate-200 pt-3">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">

                Special requests

              </p>

              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">

                {specialRequests}

              </p>

            </div>

          )}

        </div>

      </div>





      <div className="mt-5">

        <GuestCoupon

          subtotal={Number(selectedOption.totalAmount)}

          nights={Number(nights)}

          roomTypeId={selectedOption.roomType._id}

          onCouponApplied={setAppliedCoupon}

        />

      </div>





      <div className="mt-5 rounded border border-indigo-100 bg-gray-100 p-4">

        <div className="flex items-end justify-between gap-4">

          <div>

            <p className="text-sm font-medium text-black">

              Estimated total

            </p>

            <p className="mt-1 text-xs text-black">

              {nights} night(s) ·{" "}

              {formatINR(selectedOption.pricePerNight)} per night

            </p>

          </div>



          <p className="text-2xl font-bold text-black">

            {formatINR(

              appliedCoupon

                ? Number(appliedCoupon.finalAmount)

                : Number(selectedOption.totalAmount)

            )}

          </p>

        </div>



        {appliedCoupon && (

          <div className="mt-3 flex justify-between gap-4 border-t border-indigo-100 pt-3 text-sm">

            <span className="text-black">

              Coupon discount ({appliedCoupon.code})

            </span>

            <span className="font-semibold text-emerald-700">

              -{formatINR(Number(appliedCoupon.discount))}

            </span>

          </div>

        )}



        {selectedOption.suggestedAdvance > 0 && (

          <p className="mt-3 border-t border-indigo-100 pt-3 text-sm text-black">

            Advance to confirm this booking:{" "}

            <span className="font-semibold">

              {formatINR(selectedOption.suggestedAdvance)}

            </span>

          </p>

        )}



        <p className="mt-2 text-xs text-black">

          Your booking is submitted as pending. The hotel confirms it

          after receiving the advance, and an unpaid request may be

          released after some time.

        </p>

      </div>

    </div>



    <div className="flex justify-between gap-3">

      <button

        type="button"

        onClick={() => setStep(2)}

        disabled={saving}

        className="rounded border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"

      >

        Back

      </button>



      <button

        type="button"

        onClick={submitBooking}

        disabled={saving}

        className="inline-flex items-center gap-2 rounded bg-black px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"

      >

        {saving && <Loader2 size={16} className="" />}

        {saving ? "Submitting booking..." : "Submit booking request"}

      </button>

    </div>

  </section>

)}



    </div>

  );

}