import { useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { markNoShow } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { formatINR, getErrorMessage } from "../utils/bookingUi";

const NoShowModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const completed = (booking.payments || []).filter((p) => p.status === "completed");
  const sumOf = (type) => completed.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);
  const depositHeld = sumOf("security_deposit") - sumOf("deposit_refund");
  const netPaid = Math.max((booking.paidAmount || 0) - (booking.refundedAmount || 0), 0);

  const [reason, setReason] = useState("Guest did not arrive");
  const [refund, setRefund] = useState({ amount: "", method: "cash", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refundAmount = isManager ? Number(refund.amount) || 0 : 0;
  const needsMethod = refundAmount > 0 || depositHeld > 0;

  const submit = async () => {
    setError("");
    if (refundAmount > netPaid) return setError(`Refund maximum ${formatINR(netPaid)} ho sakta hai`);

    const payload = { reason: reason.trim() };
    if (needsMethod) {
      payload.refundMethod = refund.method;
      payload.refundReference = refund.reference;
    }
    if (isManager) payload.refundAmount = refundAmount;

    setSaving(true);
    try {
      await markNoShow(booking._id, payload);
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
      title="No-show mark karo"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
      onClose={onClose}
      busy={saving}
      footer={<ModalFooter onCancel={onClose} onConfirm={submit} confirmText="No-show mark karo" busy={saving} danger />}
    >
      <ErrorBox message={error} />

      <div className="space-y-4">
        {netPaid > 0 && (
          <NoteBox tone="warn">
            Guest ne {formatINR(netPaid)} advance diya hai. Default mein ye forfeit hota hai.
            {isManager ? " Chaho to neeche refund de sakte ho." : ""}
          </NoteBox>
        )}

        <Field label="Reason">
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>

        {isManager && netPaid > 0 && (
          <Field label="Refund amount (optional)">
            <input
              type="number"
              min="0"
              value={refund.amount}
              onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
              className={inputClass}
            />
          </Field>
        )}

        {depositHeld > 0 && (
          <p className="text-xs text-slate-500">Security deposit {formatINR(depositHeld)} poora wapas hoga.</p>
        )}

        {needsMethod && (
          <PaymentFields
            showAmount={false}
            value={refund}
            onChange={(patch) => setRefund((r) => ({ ...r, ...patch }))}
          />
        )}

        <p className="text-xs text-slate-500">
          No-show check-in wale din raat 8 baje ke baad hi mark hota hai (manager kabhi bhi kar sakta hai).
        </p>
      </div>
    </Modal>
  );
};

export default NoShowModal;