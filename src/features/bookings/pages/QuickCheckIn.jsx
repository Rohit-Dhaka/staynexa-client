
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  Check,
  Clock3,
  Loader2,
  Zap,
} from "lucide-react";

import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  quickCheckIn,
  searchAvailability,
} from "../services/bookings.service";

import {
  ID_PROOF_TYPES,
  PAYMENT_METHODS,
  addDaysToInput,
  formatINR,
  getErrorMessage,
  toInputDate,
} from "../utils/bookingUi";

const NOT_READY = /occupied|maintenance|out_of_order|cleaning|dirty/i;

const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

const inputClass =
  "w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const QuickCheckIn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = [
    ROLES.SUPER_ADMIN,
    ROLES.MANAGER,
  ].includes(user?.role);

  const today = toInputDate();

  const [adults, setAdults] = useState(1);
  const [checkInTime, setCheckInTime] = useState(getCurrentTime);

  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(true);
  const [roomId, setRoomId] = useState("");

  const [guest, setGuest] = useState({
    name: "",
    phone: "",
  });

  const [idProof, setIdProof] = useState({
    type: "aadhaar",
    number: "",
  });

  const [pay, setPay] = useState({
    amount: "",
    method: "cash",
    reference: "",
  });

  const [waiveEarly, setWaiveEarly] = useState(false);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      setSearching(true);
      setError("");

      try {
        const result = await searchAvailability({
          checkIn: today,
          checkOut: addDaysToInput(today, 1),
          adults,
          children: 0,
        });

        if (cancelled) return;

        setOptions(result.options || []);
      } catch (err) {
        if (!cancelled) {
          setOptions([]);
          setRoomId("");
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    };

    loadRooms();

    return () => {
      cancelled = true;
    };
  }, [today, adults]);

  const rooms = useMemo(
    () =>
      options.flatMap((option) =>
        (option.rooms || []).map((room) => ({
          ...room,
          roomType: option.roomType,
          pricePerNight: option.pricePerNight,
          totalAmount: option.totalAmount,
          taxPercent: option.taxPercent,
        }))
      ),
    [options]
  );

  const readyRooms = useMemo(
    () =>
      rooms.filter(
        (room) => !NOT_READY.test(room.status || "")
      ),
    [rooms]
  );

  const selectedRoom = rooms.find((room) => room._id === roomId);

  const handleRoomSelect = (room) => {
    setRoomId(room._id);

    setPay((previous) => ({
      ...previous,
      amount: String(room.totalAmount ?? 0),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");

    if (guest.name.trim().length < 2) {
      setError("Enter the guest's name");
      return;
    }

    const phone = guest.phone.trim();

    if (phone) {
      const normalizedPhone = phone.replace(/[\s-]/g, "");

      if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
        setError("Enter a valid phone number (10 to 15 digits)");
        return;
      }
    }

    if (idProof.number.trim().length < 4) {
      setError("Enter the ID number");
      return;
    }

    if (!roomId) {
      setError("Please select an available room");
      return;
    }

    if (!checkInTime) {
      setError("Select a check-in time");
      return;
    }

    const payload = {
      guest: {
        name: guest.name.trim(),
        ...(phone ? { phone } : {}),
      },
      idProof: {
        type: idProof.type,
        number: idProof.number.trim(),
      },
      roomId,
      checkIn: today,
      checkInTime,
      checkOut: addDaysToInput(today, 1),
      nights: 1,
      adults: Number(adults),
      children: 0,
    };

    const amount = Number(pay.amount) || 0;

    if (amount > 0) {
      payload.payment = {
        amount,
        method: pay.method,
        reference: pay.reference.trim(),
      };
    }

    if (isManager && waiveEarly) {
      payload.waiveEarlyCharge = true;
    }

    setSaving(true);

    try {
      const booking = await quickCheckIn(payload);

      navigate(`/bookings/${booking._id}`, {
        state: {
          notice: `Guest checked in to Room ${
            booking.room?.roomNumber || selectedRoom?.roomNumber || ""
          }.`,
        },
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto space-y-5">
      
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/front-desk")}
          aria-label="Back to bookings"
          className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 text-slate-600 transition "
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Quick Check-in
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Select a room and check in the guest.
          </p>
        </div>
      </div>

      
      {error && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        
        <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Guest Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Guest Name *</label>
              <input
                autoFocus
                value={guest.name}
                onChange={(event) =>
                  setGuest({
                    ...guest,
                    name: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Enter guest name"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className={labelClass}>
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={guest.phone}
                onChange={(event) =>
                  setGuest({
                    ...guest,
                    phone: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Enter phone number"
                autoComplete="off"
              />
            </div>

            <div>
              <label className={labelClass}>Adults</label>
              <input
                type="number"
                min="1"
                max="20"
                value={adults}
                onChange={(event) =>
                  setAdults(
                    Math.max(1, Number(event.target.value) || 1)
                  )
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>ID Type *</label>
              <select
                value={idProof.type}
                onChange={(event) =>
                  setIdProof({
                    ...idProof,
                    type: event.target.value,
                  })
                }
                className={inputClass}
              >
                {ID_PROOF_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>ID Number *</label>
              <input
                value={idProof.number}
                onChange={(event) =>
                  setIdProof({
                    ...idProof,
                    number: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Enter ID number"
                autoComplete="off"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                For Aadhaar, only the last 4 digits should be saved.
              </p>
            </div>
          </div>
        </section>

        
        <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={19} className="text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Check-in Time
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Check-in Date</label>
              <input
                type="date"
                value={today}
                readOnly
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Select Check-in Time *
              </label>
              <input
                type="time"
                value={checkInTime}
                onChange={(event) =>
                  setCheckInTime(event.target.value)
                }
                required
                className={inputClass}
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Select the guest's check-in time before submitting.
          </p>
        </section>

        
        <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Available Rooms
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a room to continue.
              </p>
            </div>

            {!searching && (
              <span className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
                {readyRooms.length} rooms available
              </span>
            )}
          </div>

          {searching ? (
            <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading available rooms...
            </div>
          ) : readyRooms.length === 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-5 text-center">
              <BedDouble
                size={28}
                className="mx-auto mb-2 text-amber-700"
              />

              <p className="font-medium text-amber-900">
                No rooms available
              </p>

              <p className="mt-1 text-sm text-amber-800">
                No ready rooms are available for the selected guest count.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {readyRooms.map((room) => {
                const isSelected = roomId === room._id;

                return (
                  <button
                    key={room._id}
                    type="button"
                    onClick={() => handleRoomSelect(room)}
                    className={`rounded border p-4 text-left transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50"
                        : "border-slate-200 "
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded ${
                            isSelected
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <BedDouble size={21} />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            Room {room.roomNumber}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {room.roomType?.name || "Standard Room"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded border ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 text-transparent"
                        }`}
                      >
                        <Check size={15} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="text-sm text-slate-500">
                        Floor {room.floor ?? "-"}
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatINR(room.pricePerNight)}
                        <span className="font-normal text-slate-500">
                          {" "}/ night
                        </span>
                      </span>
                    </div>

                    <div className="mt-3">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        Available
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        
        <section className="rounded border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Payment Details
          </h2>

          {selectedRoom && (
            <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    Selected Room
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    Room {selectedRoom.roomNumber} ·{" "}
                    {selectedRoom.roomType?.name}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-500">
                    Estimated Total
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatINR(selectedRoom.totalAmount)}
                  </p>
                </div>
              </div>

              {selectedRoom.taxPercent > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  GST {selectedRoom.taxPercent}% included
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Amount Received</label>
              <input
                type="number"
                min="0"
                value={pay.amount}
                onChange={(event) =>
                  setPay({
                    ...pay,
                    amount: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="0"
              />
            </div>

            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                value={pay.method}
                onChange={(event) =>
                  setPay({
                    ...pay,
                    method: event.target.value,
                  })
                }
                className={inputClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Payment Reference</label>
              <input
                value={pay.reference}
                onChange={(event) =>
                  setPay({
                    ...pay,
                    reference: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Optional"
              />
            </div>
          </div>

          {isManager && (
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={waiveEarly}
                onChange={(event) =>
                  setWaiveEarly(event.target.checked)
                }
                className="rounded"
              />
              Waive the early check-in charge
            </label>
          )}
        </section>

        
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/bookings")}
            className="rounded border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || searching || !roomId}
            className="inline-flex items-center justify-center gap-2 rounded bg-black px-6 py-3 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Zap size={17} />
            )}

            {saving ? "Checking In..." : "Check In Now"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickCheckIn;
