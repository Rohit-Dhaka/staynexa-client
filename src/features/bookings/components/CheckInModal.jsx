
import { useMemo, useState } from "react";
import { Plus, Trash2, UserRound, CreditCard, ShieldCheck } from "lucide-react";

import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";

import { checkInBooking } from "../services/bookings.service";

import {
  Field,
  ErrorBox,
  NoteBox,
  SectionTitle,
  ModalFooter,
  inputClass,
} from "./formUi";

import {
  ID_PROOF_TYPES,
  PAYMENT_METHODS,
  formatDate,
  formatINR,
  getErrorMessage,
  toInputDate,
} from "../utils/bookingUi";

const CHECKIN_HOUR = 14;

const EARLY_CHECKIN_TIERS = [
  { upTo: 2, percent: 25 },
  { upTo: 4, percent: 50 },
  { upTo: Infinity, percent: 100 },
];

const ROOM_NOT_READY_PATTERN =
  /occupied|maintenance|out_of_order|cleaning|dirty/i;

const DEFAULT_GUEST = {
  name: "",
  age: "",
  gender: "male",
  relation: "",
  phone: "",
  isChild: false,
  idType: "aadhaar",
  idNumber: "",
};

const DEFAULT_PAYMENT = {
  amount: "",
  method: "cash",
  reference: "",
};

const getInitialGuests = (additionalGuests = []) =>
  additionalGuests.map((guest) => ({
    name: guest.name || "",
    age: guest.age ?? "",
    gender: guest.gender || "male",
    relation: guest.relation || "",
    phone: guest.phone || "",
    isChild: Boolean(guest.isChild),
    idType: guest.idProof?.type || "aadhaar",
    idNumber: guest.idProof?.number || "",
  }));

const getInitialPrimaryProof = (booking) => {
  const proof = booking.guestDetails?.idProof || {};

  return {
    type: proof.type || "aadhaar",
    number: proof.number || "",
  };
};

const IdFields = ({ type, number, onChange }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <Field label="Identification Type">
      <select
        value={type}
        onChange={(event) => onChange({ idType: event.target.value })}
        className={inputClass}
      >
        {ID_PROOF_TYPES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </Field>

    <Field label="Identification Number">
      <input
        type="text"
        value={number}
        onChange={(event) =>
          onChange({ idNumber: event.target.value })
        }
        className={inputClass}
        placeholder="Enter identification number"
        autoComplete="off"
      />
    </Field>
  </div>
);

const PaymentFields = ({ title, value, onChange }) => (
  <>
    <SectionTitle hint="Enter the amount collected and its payment details.">
      {title}
    </SectionTitle>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Field label="Amount (INR)">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.amount}
          onChange={(event) =>
            onChange({ amount: event.target.value })
          }
          className={inputClass}
          placeholder="0.00"
        />
      </Field>

      <Field label="Payment Method">
        <select
          value={value.method}
          onChange={(event) =>
            onChange({ method: event.target.value })
          }
          className={inputClass}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Payment Reference">
        <input
          type="text"
          value={value.reference}
          onChange={(event) =>
            onChange({ reference: event.target.value })
          }
          className={inputClass}
          placeholder="Transaction or receipt reference"
        />
      </Field>
    </div>
  </>
);

const CheckInModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();

  const isManager = [
    ROLES.SUPER_ADMIN,
    ROLES.MANAGER,
  ].includes(user?.role);

  const netPaid =
    Number(booking.paidAmount || 0) -
    Number(booking.refundedAmount || 0);

  const advanceDue =
    booking.status === "pending"
      ? Math.max(Number(booking.advanceRequired || 0) - netPaid, 0)
      : 0;

  const [primary, setPrimary] = useState(() =>
    getInitialPrimaryProof(booking)
  );

  const [guests, setGuests] = useState(() =>
    getInitialGuests(booking.additionalGuests)
  );

  const [advance, setAdvance] = useState({
    ...DEFAULT_PAYMENT,
    amount: advanceDue > 0 ? String(advanceDue) : "",
  });

  const [deposit, setDeposit] = useState({
    ...DEFAULT_PAYMENT,
  });

  const [options, setOptions] = useState({
    waiveEarlyCharge: false,
    overrideRoomStatus: false,
    notes: booking.internalNotes || "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const checkInDetails = useMemo(() => {
    const now = new Date();
    const today = toInputDate(now);
    const arrivalDate = toInputDate(booking.checkIn);

    const isArrivalDay = arrivalDate === today;

    const standardCheckIn = new Date(now);
    standardCheckIn.setHours(CHECKIN_HOUR, 0, 0, 0);

    const earlyHours =
      isArrivalDay && now < standardCheckIn
        ? Math.ceil(
            (standardCheckIn.getTime() - now.getTime()) /
              (60 * 60 * 1000)
          )
        : 0;

    const earlyTier = EARLY_CHECKIN_TIERS.find(
      (tier) => earlyHours > 0 && earlyHours <= tier.upTo
    );

    const earlyPercent = earlyTier?.percent || 0;

    const earlyEstimate = Math.round(
      (Number(booking.pricePerNight || 0) * earlyPercent) / 100
    );

    return {
      now,
      isArrivalDay,
      earlyHours,
      earlyPercent,
      earlyEstimate,
    };
  }, [booking.checkIn, booking.pricePerNight]);

  const roomStatus = booking.room?.status || "";
  const roomNotReady = ROOM_NOT_READY_PATTERN.test(roomStatus);

  const blocked =
    roomNotReady &&
    !(isManager && options.overrideRoomStatus);

  const updateGuest = (index, patch) => {
    setGuests((currentGuests) =>
      currentGuests.map((guest, currentIndex) =>
        currentIndex === index
          ? { ...guest, ...patch }
          : guest
      )
    );
  };

  const updateAdvance = (patch) => {
    setAdvance((current) => ({ ...current, ...patch }));
  };

  const updateDeposit = (patch) => {
    setDeposit((current) => ({ ...current, ...patch }));
  };

  const updateOptions = (patch) => {
    setOptions((current) => ({ ...current, ...patch }));
  };

  const validateForm = () => {
    if (!primary.number.trim()) {
      return "The primary guest's identification number is required.";
    }

    const invalidGuest = guests.find(
      (guest) =>
        !guest.name.trim() ||
        (!guest.isChild && !guest.idNumber.trim())
    );

    if (invalidGuest) {
      return "Enter each additional guest's name and provide identification for every adult guest.";
    }

    const advanceAmount = Number(advance.amount);

    if (!Number.isFinite(advanceAmount) || advanceAmount < 0) {
      return "Enter a valid advance payment amount.";
    }

    if (advanceDue > 0 && advanceAmount < advanceDue) {
      return `The outstanding advance of ${formatINR(
        advanceDue
      )} must be collected before check-in.`;
    }

    const depositAmount = Number(deposit.amount);

    if (!Number.isFinite(depositAmount) || depositAmount < 0) {
      return "Enter a valid security deposit amount.";
    }

    if (blocked) {
      return "This room is not ready for check-in. Contact a manager or housekeeping.";
    }

    return "";
  };

  const submit = async () => {
    if (saving) return;

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const advanceAmount = Number(advance.amount) || 0;
    const depositAmount = Number(deposit.amount) || 0;

    const payload = {
      idProof: {
        type: primary.type,
        number: primary.number.trim(),
      },

      additionalGuests: guests.map((guest) => ({
        name: guest.name.trim(),
        age:
          guest.age === ""
            ? undefined
            : Number(guest.age),
        gender: guest.gender,
        relation: guest.relation.trim(),
        phone: guest.phone.trim(),
        isChild: guest.isChild,

        idProof: guest.idNumber.trim()
          ? {
              type: guest.idType,
              number: guest.idNumber.trim(),
            }
          : undefined,
      })),

      internalNotes: options.notes.trim(),
    };

    if (advanceAmount > 0) {
      payload.advancePayment = {
        amount: advanceAmount,
        method: advance.method,
        reference: advance.reference.trim(),
      };
    }

    if (depositAmount > 0) {
      payload.securityDeposit = {
        amount: depositAmount,
        method: deposit.method,
        reference: deposit.reference.trim(),
      };
    }

    if (isManager) {
      if (options.waiveEarlyCharge) {
        payload.waiveEarlyCharge = true;
      }

      if (options.overrideRoomStatus) {
        payload.overrideRoomStatus = true;
      }
    }

    setSaving(true);

    try {
      await checkInBooking(booking._id, payload);
      onDone();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const stayDescription = booking.openEnded
    ? `${formatDate(booking.checkIn)} · Open-ended stay`
    : `${formatDate(booking.checkIn)} – ${formatDate(
        booking.checkOut
      )} · ${booking.nights} ${
        booking.nights === 1 ? "night" : "nights"
      }`;

  return (
    <Modal
      open
      size="lg"
      title="Guest Check-In"
      subtitle={`${booking.bookingNumber || "Booking"} · ${
        booking.guestDetails?.name || "Guest"
      } · Room ${booking.room?.roomNumber || "Unassigned"}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText={saving ? "Processing..." : "Complete Check-In"}
          busy={saving}
          disabled={blocked || saving}
        />
      }
    >
      <div className="space-y-5">
        <ErrorBox message={error} />

        <section className="rounded border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-700">
              <UserRound size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Stay Details
              </h3>

              <p className="mt-1 text-sm text-slate-600">
                {stayDescription}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {booking.adults}{" "}
                {booking.adults === 1 ? "adult" : "adults"}
                {" · "}
                {booking.children || 0}{" "}
                {(booking.children || 0) === 1
                  ? "child"
                  : "children"}
              </p>
            </div>
          </div>
        </section>

        {roomNotReady && (
          <NoteBox tone="danger">
            <div>
              <p className="font-semibold">
                Room Not Ready for Check-In
              </p>

              <p className="mt-1">
                Room {booking.room?.roomNumber || "Unassigned"} has
                the status:{" "}
                <span className="font-medium">
                  {roomStatus.replace(/_/g, " ")}
                </span>
                . The room must be ready before the guest can check in.
              </p>

              {isManager && (
                <label className="mt-3 flex items-start gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={options.overrideRoomStatus}
                    onChange={(event) =>
                      updateOptions({
                        overrideRoomStatus: event.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />

                  <span>
                    Override room readiness check
                  </span>
                </label>
              )}

              {!isManager && (
                <p className="mt-2 text-sm">
                  Contact housekeeping or a manager to resolve this
                  issue.
                </p>
              )}
            </div>
          </NoteBox>
        )}

        {checkInDetails.earlyHours > 0 && (
          <NoteBox tone="warn">
            <div>
              <p className="font-semibold">
                Early Check-In
              </p>

              <p className="mt-1">
                Standard check-in time is {CHECKIN_HOUR}:00.
                The guest is arriving approximately{" "}
                {checkInDetails.earlyHours}{" "}
                {checkInDetails.earlyHours === 1
                  ? "hour"
                  : "hours"}{" "}
                early.
              </p>

              <p className="mt-1">
                Estimated early check-in charge:{" "}
                <span className="font-semibold">
                  {formatINR(checkInDetails.earlyEstimate)}
                </span>
                {" "}plus applicable taxes. The final amount is
                determined by the billing system.
              </p>

              {isManager && (
                <label className="mt-3 flex items-start gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={options.waiveEarlyCharge}
                    onChange={(event) =>
                      updateOptions({
                        waiveEarlyCharge: event.target.checked,
                      })
                    }
                    className="mt-0.5 rounded border-slate-300"
                  />

                  <span>
                    Waive the early check-in charge
                  </span>
                </label>
              )}
            </div>
          </NoteBox>
        )}

        <section>
          <SectionTitle hint="Verify the primary guest's identification before completing check-in.">
            Primary Guest Identification
          </SectionTitle>

          <IdFields
            type={primary.type}
            number={primary.number}
            onChange={(patch) =>
              setPrimary((current) => ({
                type: patch.idType ?? current.type,
                number: patch.idNumber ?? current.number,
              }))
            }
          />

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Follow your hotel's identification verification and
            data-retention policy. Avoid storing unnecessary sensitive
            identification details.
          </p>
        </section>

        <section>
          <SectionTitle hint="Identification is required for each adult guest.">
            Additional Guests
          </SectionTitle>

          {guests.length === 0 && (
            <div className="rounded border border-dashed border-slate-300 px-4 py-6 text-center">
              <UserRound
                size={22}
                className="mx-auto text-slate-400"
              />

              <p className="mt-2 text-sm font-medium text-slate-700">
                No Additional Guests
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Add other guests staying under this booking.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {guests.map((guest, index) => (
              <div
                key={index}
                className="rounded border border-slate-200 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    Guest {index + 1}
                  </h4>

                  <button
                    type="button"
                    onClick={() =>
                      setGuests((current) =>
                        current.filter(
                          (_, currentIndex) =>
                            currentIndex !== index
                        )
                      )
                    }
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Remove Guest
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Full Name *">
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(event) =>
                        updateGuest(index, {
                          name: event.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Enter full name"
                    />
                  </Field>

                  <Field label="Age">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={guest.age}
                      onChange={(event) =>
                        updateGuest(index, {
                          age: event.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Enter age"
                    />
                  </Field>

                  <Field label="Relationship to Primary Guest">
                    <input
                      type="text"
                      value={guest.relation}
                      onChange={(event) =>
                        updateGuest(index, {
                          relation: event.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="e.g. Spouse, Friend"
                    />
                  </Field>

                  <Field label="Phone Number">
                    <input
                      type="tel"
                      value={guest.phone}
                      onChange={(event) =>
                        updateGuest(index, {
                          phone: event.target.value,
                        })
                      }
                      className={inputClass}
                      placeholder="Enter phone number"
                    />
                  </Field>

                  <label className="flex items-center gap-2 rounded border border-slate-200 px-3 py-2.5 text-sm text-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={guest.isChild}
                      onChange={(event) =>
                        updateGuest(index, {
                          isChild: event.target.checked,
                        })
                      }
                      className="rounded border-slate-300"
                    />

                    This guest is a child
                  </label>
                </div>

                {!guest.isChild && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <IdFields
                      type={guest.idType}
                      number={guest.idNumber}
                      onChange={(patch) =>
                        updateGuest(index, {
                          idType: patch.idType ?? guest.idType,
                          idNumber:
                            patch.idNumber ?? guest.idNumber,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setGuests((current) => [
                ...current,
                { ...DEFAULT_GUEST },
              ])
            }
            disabled={saving}
            className="mt-3 inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Add Guest
          </button>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-slate-600" />

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Advance Payment
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Record the advance collected at check-in.
              </p>
            </div>
          </div>

          {advanceDue > 0 && (
            <NoteBox tone="warn">
              Outstanding advance:{" "}
              <span className="font-semibold">
                {formatINR(advanceDue)}
              </span>
              . This amount must be collected before check-in.
            </NoteBox>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Amount (INR)">
              <input
                type="number"
                min="0"
                step="0.01"
                value={advance.amount}
                onChange={(event) =>
                  updateAdvance({ amount: event.target.value })
                }
                className={inputClass}
                placeholder="0.00"
              />
            </Field>

            <Field label="Payment Method">
              <select
                value={advance.method}
                onChange={(event) =>
                  updateAdvance({ method: event.target.value })
                }
                className={inputClass}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Reference">
              <input
                type="text"
                value={advance.reference}
                onChange={(event) =>
                  updateAdvance({
                    reference: event.target.value,
                  })
                }
                className={inputClass}
                placeholder="Transaction or receipt reference"
              />
            </Field>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={18} className="text-slate-600" />

            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Security Deposit
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                Record the refundable deposit separately from the
                accommodation bill.
              </p>
            </div>
          </div>

          <PaymentFields
            title="Deposit Collection"
            value={deposit}
            onChange={updateDeposit}
          />
        </section>

        <section>
          <SectionTitle hint="Internal notes are for authorized hotel staff only.">
            Internal Notes
          </SectionTitle>

          <textarea
            rows={3}
            value={options.notes}
            onChange={(event) =>
              updateOptions({ notes: event.target.value })
            }
            className={inputClass}
            placeholder="Add relevant check-in notes..."
          />
        </section>
      </div>
    </Modal>
  );
};

export default CheckInModal;
