import { useState } from "react";
import Modal from "../../../components/common/Modal";
import { refundPayment } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { formatINR, getErrorMessage } from "../utils/bookingUi";

const RefundModal = ({ booking, onClose, onDone }) => {
  const completed = (booking.payments || []).filter((p) => p.status === "completed");
  const sumOf = (type) => completed.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);

  const depositHeld = sumOf("security_deposit") - sumOf("deposit_refund");
  const refundable = Math.max((booking.paidAmount || 0) - (booking.refundedAmount || 0), 0);

  const types = [];
  if (refundable > 0) types.push({ value: "refund", label: "Payment refund", max: refundable });
  if (depositHeld > 0) types.push({ value: "deposit_refund", label: "Security deposit wapas", max: depositHeld });

  const [type, setType] = useState(types[0]?.value || "refund");
  const current = types.find((t) => t.value === type);
  const [pay, setPay] = useState({ amount: current ? String(current.max) : "", method: "cash", reference: "" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const changeType = (value) => {
    setType(value);
    const next = types.find((t) => t.value === value);
    setPay((p) => ({ ...p, amount: next ? String(next.max) : "" }));
  };

  const submit = async () => {
    setError("");
    const amount = Number(pay.amount);
    if (!amount || amount <= 0) return setError("Amount 0 se zyada hona chahiye");
    if (current && amount > current.max) return setError(`Maximum ${formatINR(current.max)} wapas ho sakta hai`);

    setSaving(true);
    try {
      await refundPayment(booking._id, { type, amount, method: pay.method, reference: pay.reference, notes });
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
      title="Refund"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Process Refund"
          busy={saving}
          disabled={types.length === 0}
          danger
        />
      }
    >
      <ErrorBox message={error} />

      {types.length === 0 ? (
        <p className="text-sm text-slate-500">Is booking mein abhi koi refundable amount nahi hai.</p>
      ) : (
        <div className="space-y-4">
          {type === "refund" && booking.status !== "checked_out" && (
            <NoteBox tone="warn">
              Refunding will reduce the booking’s paid amount and increase the outstanding balance.
            </NoteBox>
          )}

          <Field label="Refund type" hint={current ? `Maximum ${formatINR(current.max)}` : ""}>
            <select value={type} onChange={(e) => changeType(e.target.value)} className={inputClass}>
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <PaymentFields value={pay} onChange={(patch) => setPay((p) => ({ ...p, ...patch }))} />

          <Field label="Notes">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}
    </Modal>
  );
};

export default RefundModal;