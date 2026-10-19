import { useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { convertHold, addPayment } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, SectionTitle, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { ID_PROOF_TYPES, formatINR, getErrorMessage, toInputDate } from "../utils/bookingUi";
import toast from "react-hot-toast";

const ConvertHoldModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const isAdvance = toInputDate(booking.checkIn) > toInputDate();
  const suggested = isAdvance ? Math.round((booking.totalAmount || 0) * 0.25) : 0;
  const g = booking.guestDetails || {};

  const [guest, setGuest] = useState({
    name: g.name || "",
    phone: g.phone || "",
    email: g.email || "",
    city: g.city || "",
    address: g.address || "",
    idType: g.idProof?.type || "aadhaar",
    idNumber: g.idProof?.number || "",
  });
  const [advanceRequired, setAdvanceRequired] = useState("");
  const [pay, setPay] = useState({ amount: suggested ? String(suggested) : "", method: "cash", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!guest.name.trim()) return setError("Guest ka naam likho");
    if (!/^\d{10,15}$/.test(guest.phone.replace(/[\s+-]/g, ""))) {
      return setError("Phone number valid nahi hai (10 se 15 digits)");
    }

    const payload = {
      guestDetails: {
        name: guest.name.trim(),
        phone: guest.phone.trim(),
        email: guest.email.trim(),
        city: guest.city.trim(),
        address: guest.address.trim(),
        ...(guest.idNumber.trim() ? { idProof: { type: guest.idType, number: guest.idNumber.trim() } } : {}),
      },
    };
    if (isManager && advanceRequired !== "") payload.advanceRequired = Number(advanceRequired);

    setSaving(true);
    let notice = "";
    try {
      await convertHold(booking._id, payload);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
      return;
    }

    const amount = Number(pay.amount) || 0;
    if (amount > 0) {
      try {
        await addPayment(booking._id, {
          type: "advance_booking",
          method: pay.method,
          amount,
          reference: pay.reference,
        });
      } catch (err) {
        notice = `Booking confirm ho gayi, par payment record nahi hui: ${getErrorMessage(err)}`;
      }
    }

setSaving(false);

if (notice) {
  toast.error(notice);
}

onDone();
  };

  return (
    <Modal
      open
      size="lg"
      title="Hold ko booking banao"
      subtitle={`${booking.bookingNumber}, Room ${booking.room?.roomNumber}, total ${formatINR(booking.totalAmount)}`}
      onClose={onClose}
      busy={saving}
      footer={<ModalFooter onCancel={onClose} onConfirm={submit} confirmText="Booking confirm karo" busy={saving} />}
    >
      <ErrorBox message={error} />

      <NoteBox tone={isAdvance ? "warn" : "info"}>
        {isAdvance
          ? `Check-in aaj ke baad ki hai, isliye ${formatINR(suggested)} advance chahiye. Advance aate hi booking confirmed hogi, tab tak pending rahegi.`
          : "Check-in aaj ki hai, advance zaroori nahi. Booking seedha confirmed hogi."}
      </NoteBox>

      <SectionTitle>Guest details</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Naam *">
          <input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Phone *">
          <input value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Email">
          <input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} className={inputClass} />
        </Field>
        <Field label="City">
          <input value={guest.city} onChange={(e) => setGuest({ ...guest, city: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Address">
          <input value={guest.address} onChange={(e) => setGuest({ ...guest, address: e.target.value })} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ID type">
            <select value={guest.idType} onChange={(e) => setGuest({ ...guest, idType: e.target.value })} className={inputClass}>
              {ID_PROOF_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ID number">
            <input value={guest.idNumber} onChange={(e) => setGuest({ ...guest, idNumber: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </div>

      {isManager && (
        <>
          <SectionTitle hint="Khali chhodo to 25% (advance booking) ya 0 (aaj ki booking) lagega">
            Manager option
          </SectionTitle>
          <Field label="Advance required (amount)">
            <input type="number" min="0" value={advanceRequired} onChange={(e) => setAdvanceRequired(e.target.value)} className={inputClass} />
          </Field>
        </>
      )}

      <SectionTitle hint="Optional. Abhi advance mil gaya ho to yahin record karo">Advance payment</SectionTitle>
      <PaymentFields value={pay} onChange={(patch) => setPay((p) => ({ ...p, ...patch }))} />
    </Modal>
  );
};

export default ConvertHoldModal;