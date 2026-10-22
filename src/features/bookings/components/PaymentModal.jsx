import { useState } from "react";
import Modal from "../../../components/common/Modal";
import { addPayment } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { formatINR, getErrorMessage } from "../utils/bookingUi";

const TYPE_LABELS = {
  advance_booking: "Booking advance",
  advance_checkin: "Advance (check-in par)",
  partial: "Partial payment",
  final: "Final payment (settlement)",
  security_deposit: "Security deposit (refundable)",
};

const OPTIONS_BY_STATUS = {
  pending: ["advance_booking", "partial"],
  confirmed: ["advance_booking", "partial", "security_deposit"],
  checked_in: ["partial", "advance_checkin", "security_deposit", "final"],
  checked_out: ["final"],
};

const PaymentModal = ({ booking, onClose, onDone }) => {
  const options = OPTIONS_BY_STATUS[booking.status] || ["partial"];

  const netPaid = (booking.paidAmount || 0) - (booking.refundedAmount || 0);
  const balance =
    booking.balanceAmount ??
    Math.max(booking.totalAmount - booking.paidAmount + (booking.refundedAmount || 0), 0);
  const advanceDue =
    booking.status === "pending" ? Math.max((booking.advanceRequired || 0) - netPaid, 0) : 0;

  const defaultAmount = (type) => {
    if (type === "security_deposit") return "";
    if (type === "advance_booking" && advanceDue > 0) return String(advanceDue);
    return balance > 0 ? String(balance) : "";
  };

  const [type, setType] = useState(options[0]);
  const [pay, setPay] = useState({ amount: defaultAmount(options[0]), method: "cash", reference: "" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const changeType = (value) => {
    setType(value);
    setPay((p) => ({ ...p, amount: defaultAmount(value) }));
  };

  const submit = async () => {
    setError("");
    const amount = Number(pay.amount);
    if (!amount || amount <= 0) return setError("Amount 0 se zyada hona chahiye");
    if (type !== "security_deposit" && amount > balance) {
      return setError(`Pending balance sirf ${formatINR(balance)} hai`);
    }

    setSaving(true);
    try {
      await addPayment(booking._id, { type, method: pay.method, amount, reference: pay.reference, notes });
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
      title="Collect Payment"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
      onClose={onClose}
      busy={saving}
      footer={<ModalFooter onCancel={onClose} onConfirm={submit} confirmText="Save Payment" busy={saving} />}
    >
      <ErrorBox message={error} />

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="font-semibold text-slate-900">{formatINR(booking.totalAmount)}</p>
        </div>
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="font-semibold text-emerald-600">{formatINR(netPaid)}</p>
        </div>
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Balance</p>
          <p className="font-semibold text-rose-600">{formatINR(balance)}</p>
        </div>
      </div>

      {advanceDue > 0 && (
        <NoteBox tone="warn">
          To Confirm the Booking {formatINR(advanceDue)} additional advance required. The booking will be confirmed once this amount is received.
        </NoteBox>
      )}

      <div className="space-y-4">
        <Field label="Payment type">
          <select value={type} onChange={(e) => changeType(e.target.value)} className={inputClass}>
            {options.map((value) => (
              <option key={value} value={value}>
                {TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </Field>

        <PaymentFields value={pay} onChange={(patch) => setPay((p) => ({ ...p, ...patch }))} />

        {type === "security_deposit" && (
          <p className="text-xs text-slate-500">
            Deposit bill ka hissa nahi hai, ye check-out par wapas hota hai aur balance mein count nahi hota.
          </p>
        )}

        <Field label="Notes">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
};

export default PaymentModal;