import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { getCheckoutSummary, checkOutBooking } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, SectionTitle, ModalFooter, inputClass } from "./formUi";
import PaymentFields from "./PaymentFields";
import { PAYMENT_METHODS, formatINR, getErrorMessage } from "../utils/bookingUi";

const CheckOutModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [waiveLate, setWaiveLate] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "cash", reference: "" });
  const [allowDues, setAllowDues] = useState(false);
  const [depositMethod, setDepositMethod] = useState("cash");
  const [notes, setNotes] = useState(booking.internalNotes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    getCheckoutSummary(booking._id, waiveLate ? { waiveLateCharge: true } : {})
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setPay((p) => ({ ...p, amount: data.balanceAmount > 0 ? String(data.balanceAmount) : "" }));
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [booking._id, waiveLate]);

  const entered = Number(pay.amount) || 0;
  const remaining = summary ? Math.max(summary.balanceAmount - entered, 0) : 0;
  const blockedByDues = remaining > 0 && !allowDues;

  const submit = async () => {
    setError("");
    if (entered < 0) return setError("Payment amount valid nahi hai");
    if (summary && entered > summary.balanceAmount) {
      return setError(`Pending balance sirf ${formatINR(summary.balanceAmount)} hai`);
    }

    const payload = { internalNotes: notes };
    if (entered > 0) payload.payment = { amount: entered, method: pay.method, reference: pay.reference };
    if (summary?.depositHeld > 0) payload.depositRefundMethod = depositMethod;
    if (isManager && waiveLate) payload.waiveLateCharge = true;
    if (isManager && allowDues) payload.allowDues = true;

    setSaving(true);
    try {
      await checkOutBooking(booking._id, payload);
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
      title="Check-out"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}, Room ${booking.room?.roomNumber}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Check-out"
          busy={saving}
          disabled={!summary || loading || blockedByDues}
        />
      }
    >
      <ErrorBox message={error} />

      {loading && (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {summary && !loading && (
        <>
          {summary.overstayNights > 0 && (
            <NoteBox tone="warn">
              Guest {summary.overstayNights} raat zyada ruka hai. Extra raaton ka room charge bill mein judega.
            </NoteBox>
          )}

          {summary.lateHours > 0 && (
            <NoteBox tone="warn">
              Late check-out: {summary.lateHours} ghanta. Charge: {formatINR(summary.lateCharge)} (GST alag).
              {isManager && (
                <label className="mt-2 flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={waiveLate} onChange={(e) => setWaiveLate(e.target.checked)} />
                  Late check-out charge maaf karo
                </label>
              )}
            </NoteBox>
          )}

          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {summary.lineItems.map((item, i) => (
                  <tr key={item._id || i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">{formatINR(item.amount)}</td>
                    <td className="px-3 py-2 text-right">{item.taxPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatINR(summary.subtotal)}</span>
            </div>
            {summary.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span>-{formatINR(summary.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">GST</span>
              <span>{formatINR(summary.taxTotal)}</span>
            </div>
            {summary.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Round off</span>
                <span>{formatINR(summary.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-semibold text-slate-900">
              <span>Grand total</span>
              <span>{formatINR(summary.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid So Far</span>
              <span className="text-emerald-600">{formatINR(summary.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Balance</span>
              <span className={summary.balanceAmount > 0 ? "text-rose-600" : ""}>
                {formatINR(summary.balanceAmount)}
              </span>
            </div>
          </div>

          {summary.balanceAmount > 0 && (
            <>
              <SectionTitle hint="Pending balance abhi collect karo">Final payment</SectionTitle>
              <PaymentFields value={pay} onChange={(patch) => setPay((p) => ({ ...p, ...patch }))} />
              {remaining > 0 && (
                <NoteBox tone="danger">
                  {formatINR(remaining)} The balance will remain unpaid. Collect the full payment.
                  {isManager ? ", Or allow check-out with outstanding dues:" : "Or get the outstanding dues approved by the manager."}
                  {isManager && (
                    <label className="mt-2 flex items-center gap-2 font-medium">
                      <input type="checkbox" checked={allowDues} onChange={(e) => setAllowDues(e.target.checked)} />
                      Allow check-out with outstanding dues.
                    </label>
                  )}
                </NoteBox>
              )}
            </>
          )}

          {summary.depositHeld > 0 && (
            <>
              <SectionTitle hint="Security deposit check-out par poora wapas hota hai">
                Deposit wapas karo: {formatINR(summary.depositHeld)}
              </SectionTitle>
              <Field label="Refund method">
                <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className={inputClass}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <SectionTitle>Internal notes</SectionTitle>
          <textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </>
      )}
    </Modal>
  );
};

export default CheckOutModal;