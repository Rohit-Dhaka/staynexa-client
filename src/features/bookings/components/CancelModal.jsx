import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { cancelBooking, getCancelQuote } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { formatINR, getErrorMessage } from "../utils/bookingUi";

const CancelModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState({ amount: "", method: "cash", reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getCancelQuote(booking._id)
      .then((data) => {
        if (cancelled) return;
        setQuote(data);
        setRefund((r) => ({ ...r, amount: String(data.suggestedRefund) }));
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [booking._id]);

  const refundAmount = isManager ? Number(refund.amount) || 0 : quote?.suggestedRefund || 0;
  const needsMethod = refundAmount > 0 || (quote?.depositHeld || 0) > 0;

  const submit = async () => {
    setError("");
    if (!reason.trim()) return setError("Cancel karne ka reason likho");
    if (isManager && refundAmount > quote.paidAmount) {
      return setError(`Refund maximum ${formatINR(quote.paidAmount)} ho sakta hai`);
    }

    const payload = { reason: reason.trim() };
    if (needsMethod) {
      payload.refundMethod = refund.method;
      payload.refundReference = refund.reference;
    }
    if (isManager) payload.refundAmount = refundAmount;

    setSaving(true);
    try {
      await cancelBooking(booking._id, payload);
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
      title="Booking cancel karo"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Cancel booking"
          busy={saving}
          disabled={!quote}
          danger
        />
      }
    >
      <ErrorBox message={error} />

      {loading && (
        <div className="flex justify-center py-8 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {quote && (
        <div className="space-y-4">
          <NoteBox tone={quote.refundPercent === 100 ? "info" : "warn"}>
            Check-in is approximately{quote.hoursBeforeCheckIn} hours away. According to the policy, a{" "}
            {quote.refundPercent}% refund is applicable.
          </NoteBox>

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Paid So Far</dt>
              <dd className="font-medium">{formatINR(quote.paidAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Policy refund</dt>
              <dd className="font-medium">{formatINR(quote.suggestedRefund)}</dd>
            </div>
            {quote.depositHeld > 0 && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Security deposit (poora wapas hoga)</dt>
                <dd className="font-medium">{formatINR(quote.depositHeld)}</dd>
              </div>
            )}
          </dl>

          <Field label="Cancellation Reason">
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </Field>

          {isManager && (
            <Field label="Refund amount" hint="Change this if you want to offer a refund different from the policy.">
              <input
                type="number"
                min="0"
                value={refund.amount}
                onChange={(e) => setRefund({ ...refund, amount: e.target.value })}
                className={inputClass}
              />
            </Field>
          )}

          {needsMethod && (
            <PaymentFields
              showAmount={false}
              value={refund}
              onChange={(patch) => setRefund((r) => ({ ...r, ...patch }))}
            />
          )}

          <p className="text-xs text-slate-500">
            Upon cancellation, the bill will be voided and the room will become available for booking again. This action cannot be undone.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default CancelModal;