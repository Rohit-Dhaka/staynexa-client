import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { checkInBooking } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, SectionTitle, ModalFooter, inputClass } from "./formUi";
import {
  ID_PROOF_TYPES,
  PAYMENT_METHODS,
  formatDate,
  formatINR,
  getErrorMessage,
  toInputDate,
} from "../utils/bookingUi";

const CHECKIN_HOUR = 14;
const EARLY_TIERS = [
  { upTo: 2, percent: 25 },
  { upTo: 4, percent: 50 },
  { upTo: Infinity, percent: 100 },
];
const NOT_READY = /occupied|maintenance|out_of_order|cleaning|dirty/;

const emptyGuest = {
  name: "",
  age: "",
  gender: "male",
  relation: "",
  phone: "",
  isChild: false,
  idType: "aadhaar",
  idNumber: "",
};

const IdFields = ({ type, number, onChange }) => (
  <div className="grid grid-cols-2 gap-3">
    <Field label="ID type">
      <select value={type} onChange={(e) => onChange({ idType: e.target.value })} className={inputClass}>
        {ID_PROOF_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </Field>
    <Field label="ID number">
      <input value={number} onChange={(e) => onChange({ idNumber: e.target.value })} className={inputClass} />
    </Field>
  </div>
);

const CheckInModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const netPaid = (booking.paidAmount || 0) - (booking.refundedAmount || 0);
  const advanceDue =
    booking.status === "pending" ? Math.max((booking.advanceRequired || 0) - netPaid, 0) : 0;

  const proof = booking.guestDetails?.idProof || {};
  const [primary, setPrimary] = useState({ type: proof.type || "aadhaar", number: proof.number || "" });
  const [guests, setGuests] = useState(() =>
    (booking.additionalGuests || []).map((g) => ({
      name: g.name,
      age: g.age ?? "",
      gender: g.gender || "male",
      relation: g.relation || "",
      phone: g.phone || "",
      isChild: Boolean(g.isChild),
      idType: g.idProof?.type || "aadhaar",
      idNumber: g.idProof?.number || "",
    }))
  );
  const [advance, setAdvance] = useState({
    amount: advanceDue > 0 ? String(advanceDue) : "",
    method: "cash",
    reference: "",
  });
  const [deposit, setDeposit] = useState({ amount: "", method: "cash", reference: "" });
  const [opts, setOpts] = useState({
    waiveEarly: false,
    override: false,
    notes: booking.internalNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const now = new Date();
  const isArrivalDay = toInputDate(booking.checkIn) === toInputDate(now);
  const standard = new Date();
  standard.setHours(CHECKIN_HOUR, 0, 0, 0);
  const earlyHours = isArrivalDay && now < standard ? Math.ceil((standard - now) / 3600000) : 0;
  const earlyPercent = earlyHours ? EARLY_TIERS.find((t) => earlyHours <= t.upTo).percent : 0;
  const earlyEstimate = Math.round(((booking.pricePerNight || 0) * earlyPercent) / 100);

  const roomStatus = booking.room?.status || "";
  const roomNotReady = NOT_READY.test(roomStatus);
  const blocked = roomNotReady && !(isManager && opts.override);

  const updateGuest = (index, patch) =>
    setGuests((list) => list.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const submit = async () => {
    setError("");

    if (!primary.number.trim()) return setError("The primary guest’s ID number is required.");

    const missing = guests.filter((g) => !g.name.trim() || (!g.isChild && !g.idNumber.trim()));
    if (missing.length) {
      return setError("Har additional adult guest ka naam aur ID number bharo (bachche ko ID nahi chahiye)");
    }

    const advanceAmount = Number(advance.amount) || 0;
    if (advanceDue > 0 && advanceAmount < advanceDue) {
      return setError(`Check-in se pehle advance ${formatINR(advanceDue)} poora lena hoga`);
    }

    const payload = {
      idProof: { type: primary.type, number: primary.number.trim() },
      additionalGuests: guests.map((g) => ({
        name: g.name.trim(),
        age: g.age === "" ? undefined : Number(g.age),
        gender: g.gender,
        relation: g.relation.trim(),
        phone: g.phone,
        isChild: g.isChild,
        idProof: g.idNumber.trim() ? { type: g.idType, number: g.idNumber.trim() } : undefined,
      })),
      internalNotes: opts.notes,
    };

    if (advanceAmount > 0) {
      payload.advancePayment = {
        amount: advanceAmount,
        method: advance.method,
        reference: advance.reference,
      };
    }

    const depositAmount = Number(deposit.amount) || 0;
    if (depositAmount > 0) {
      payload.securityDeposit = {
        amount: depositAmount,
        method: deposit.method,
        reference: deposit.reference,
      };
    }

    if (isManager) {
      if (opts.waiveEarly) payload.waiveEarlyCharge = true;
      if (opts.override) payload.overrideRoomStatus = true;
    }

    setSaving(true);
    try {
      await checkInBooking(booking._id, payload);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title="Check-in"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}, Room ${booking.room?.roomNumber}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Check-in karo"
          busy={saving}
          disabled={blocked}
        />
      }
    >
      <ErrorBox message={error} />

      <p className="mb-4 text-sm text-slate-500">
        Stay: {formatDate(booking.checkIn)}{" "}
        {booking.openEnded
          ? "se (Check Out Later decide later)"
          : `se ${formatDate(booking.checkOut)}, ${booking.nights} night${booking.nights > 1 ? "s" : ""}`}
        , {booking.adults} adults, {booking.children || 0} children
      </p>

      {roomNotReady && (
        <NoteBox tone="danger">
          Room {booking.room?.roomNumber} is not ready yet (status: {roomStatus.replace(/_/g, " ")}).
          {isManager ? (
            <label className="mt-2 flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={opts.override}
                onChange={(e) => setOpts({ ...opts, override: e.target.checked })}
              />
              Check In Anyway (Manager Override)
            </label>
          ) : (
            " Housekeeping se room ready karwao ya manager se kaho."
          )}
        </NoteBox>
      )}

      {earlyHours > 0 && (
        <NoteBox tone="warn">
          Standard check-in {CHECKIN_HOUR}:00 hai, guest {earlyHours} ghanta pehle aa raha hai. Early check-in
          charge lagega, lagbhag {formatINR(earlyEstimate)} + GST (final amount bill mein dikhega).
          {isManager && (
            <label className="mt-2 flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={opts.waiveEarly}
                onChange={(e) => setOpts({ ...opts, waiveEarly: e.target.checked })}
              />
              Early check-in charge maaf karo
            </label>
          )}
        </NoteBox>
      )}

      <SectionTitle hint="Check-in par ID dekhkar verify ho jata hai. Aadhaar ke sirf last 4 digits save hote hain">
        Primary guest ID proof
      </SectionTitle>
      <IdFields
        type={primary.type}
        number={primary.number}
        onChange={(patch) =>
          setPrimary((p) => ({
            type: patch.idType ?? p.type,
            number: patch.idNumber ?? p.number,
          }))
        }
      />

      <SectionTitle hint="Har adult guest ka ID zaroori hai">Additional guests</SectionTitle>
      {guests.length === 0 && <p className="mb-2 text-sm text-slate-500">No additional guests.</p>}
      <div className="space-y-3">
        {guests.map((g, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="Naam *">
                <input value={g.name} onChange={(e) => updateGuest(i, { name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Age">
                <input type="number" min="0" value={g.age} onChange={(e) => updateGuest(i, { age: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Relation">
                <input value={g.relation} onChange={(e) => updateGuest(i, { relation: e.target.value })} className={inputClass} />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
                <input type="checkbox" checked={g.isChild} onChange={(e) => updateGuest(i, { isChild: e.target.checked })} />
                Child
              </label>
            </div>
            {!g.isChild && (
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Field label="ID type">
                  <select value={g.idType} onChange={(e) => updateGuest(i, { idType: e.target.value })} className={inputClass}>
                    {ID_PROOF_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ID number">
                  <input value={g.idNumber} onChange={(e) => updateGuest(i, { idNumber: e.target.value })} className={inputClass} />
                </Field>
              </div>
            )}
            <button
              type="button"
              onClick={() => setGuests((list) => list.filter((_, idx) => idx !== i))}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:underline"
            >
              <Trash2 size={13} /> Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setGuests((list) => [...list, { ...emptyGuest }])}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <Plus size={15} /> Add Guest
      </button>

      <SectionTitle
        hint={
          advanceDue > 0
            ? `Booking advance is pending., ${formatINR(advanceDue)} Required to collect.`
            : "Optional. Enter the advance amount to collect now."
        }
      >
        Advance payment (check-in par)
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Amount">
          <input type="number" min="0" value={advance.amount} onChange={(e) => setAdvance({ ...advance, amount: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Method">
          <select value={advance.method} onChange={(e) => setAdvance({ ...advance, method: e.target.value })} className={inputClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference">
          <input value={advance.reference} onChange={(e) => setAdvance({ ...advance, reference: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <SectionTitle hint="Refundable. Check-out par wapas hota hai, bill ka hissa nahi hai">
        Security deposit
      </SectionTitle>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Amount">
          <input type="number" min="0" value={deposit.amount} onChange={(e) => setDeposit({ ...deposit, amount: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Method">
          <select value={deposit.method} onChange={(e) => setDeposit({ ...deposit, method: e.target.value })} className={inputClass}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference">
          <input value={deposit.reference} onChange={(e) => setDeposit({ ...deposit, reference: e.target.value })} className={inputClass} />
        </Field>
      </div>

      <SectionTitle>Internal notes</SectionTitle>
      <textarea
        rows="2"
        value={opts.notes}
        onChange={(e) => setOpts({ ...opts, notes: e.target.value })}
        className={inputClass}
      />
    </Modal>
  );
};

export default CheckInModal;