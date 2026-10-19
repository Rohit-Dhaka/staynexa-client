import { useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { extendStay } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, SectionTitle, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import {
  addDaysToInput,
  formatDate,
  formatINR,
  getErrorMessage,
  nightsBetween,
  toInputDate,
} from "../utils/bookingUi";

const ExtendStayModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const currentOut = toInputDate(booking.checkOut);
  const [newOut, setNewOut] = useState(addDaysToInput(currentOut, 1));
  const [reason, setReason] = useState("");
  const [price, setPrice] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "cash", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const extraNights = nightsBetween(currentOut, newOut);
  const rate = isManager && price !== "" ? Number(price) || 0 : booking.pricePerNight;

  const submit = async () => {
    setError("");
    if (extraNights < 1) return setError("The new check-out date must be after the current check-out date.");

    const payload = { newCheckOut: newOut, reason };
    if (isManager && price !== "") payload.pricePerNight = Number(price);
    const amount = Number(pay.amount) || 0;
    if (amount > 0) payload.payment = { amount, method: pay.method, reference: pay.reference };

    setSaving(true);
    try {
      await extendStay(booking._id, payload);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
  <Modal
  open
  size="md"
  title="Extend Stay"
  subtitle={`${booking.bookingNumber}, Room ${booking.room?.roomNumber}`}
  onClose={onClose}
  busy={saving}
  footer={
    <ModalFooter
      onCancel={onClose}
      onConfirm={submit}
      confirmText="Extend Stay"
      busy={saving}
    />
  }
>
  <ErrorBox message={error} />

  <p className="mb-4 text-sm text-slate-500">
    Current Check-out Date: {formatDate(booking.checkOut)}
  </p>

  <div className="space-y-4">
    <Field label="New Check-out Date">
      <input
        type="date"
        min={addDaysToInput(currentOut, 1)}
        value={newOut}
        onChange={(e) => setNewOut(e.target.value)}
        className={inputClass}
      />
    </Field>

    {extraNights > 0 && (
      <NoteBox>
        {extraNights} extra nights × {formatINR(rate)} ={" "}
        {formatINR(extraNights * rate)} (GST will be added separately).
        If the room is unavailable on the additional dates, the server
        will return an error explaining that a room change is required.
      </NoteBox>
    )}

    {isManager && (
      <Field
        label="Custom Rate per Night (Optional)"
        hint="Leave blank to use the existing booking rate."
      >
        <input
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={inputClass}
        />
      </Field>
    )}

    <Field label="Reason">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className={inputClass}
      />
    </Field>
  </div>

  <SectionTitle hint="Optional. Collect payment now for the extended stay.">
    Payment
  </SectionTitle>

  <PaymentFields
    value={pay}
    onChange={(patch) => setPay((p) => ({ ...p, ...patch }))}
  />
</Modal>
  );
};

export default ExtendStayModal;