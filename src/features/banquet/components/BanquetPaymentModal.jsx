import { useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import { addPayment } from "../services/banquet.service";
import { Field, ModalActions } from "./BanquetUi";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  formatINR,
  getErrorMessage,
  inputClass,
} from "../../../utils/banquet.utils";

const BanquetPaymentModal = ({ booking, defaultType = "partial", canRefund, onClose, onDone }) => {
  const net = booking.paidAmount - booking.refundedAmount;
  const balance = booking.balanceAmount;

  const types = PAYMENT_TYPE_OPTIONS.filter((t) => t.value !== "refund" || canRefund);

  const amountFor = (type) => {
    if (type === "refund") return net > 0 ? String(net) : "";
    if (type === "advance") {
      const needed = Math.max(booking.advanceRequired - net, 0);
      return String(needed > 0 ? Math.min(needed, balance) : balance);
    }
    return balance > 0 ? String(balance) : "";
  };

  const [type, setType] = useState(defaultType);
  const [form, setForm] = useState({ amount: amountFor(defaultType), method: "cash", reference: "", note: "" });
  const [saving, setSaving] = useState(false);

  const changeType = (value) => {
    setType(value);
    setForm((f) => ({ ...f, amount: amountFor(value) }));
  };

  const change = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const submit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter an amount greater than zero");
    if (type === "refund" && amount > net) return toast.error(`The maximum refund is ${formatINR(net)}`);
    if (type !== "refund" && amount > balance) return toast.error(`The remaining balance is ${formatINR(balance)}`);

    setSaving(true);
    try {
      await addPayment(booking._id, {
        type,
        amount,
        method: form.method,
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
      toast.success(type === "refund" ? "Refund recorded successfully" : "Payment recorded successfully");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="md"
      title={type === "refund" ? "Issue Refund" : "Record Payment"}
      subtitle={booking.bookingNumber}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={submit}
          confirmText={type === "refund" ? "Issue Refund" : "Save Payment"}
          busy={saving}
          danger={type === "refund"}
        />
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-sm font-semibold text-slate-900">{formatINR(booking.totalAmount)}</p>
        </div>
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-sm font-semibold text-emerald-600">{formatINR(net)}</p>
        </div>
        <div className="rounded bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Balance</p>
          <p className="text-sm font-semibold text-rose-600">{formatINR(balance)}</p>
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Type" htmlFor="type">
          <select id="type" value={type} onChange={(e) => changeType(e.target.value)} className={inputClass}>
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Amount" required htmlFor="amount">
            <input id="amount" type="number" min="1" name="amount" value={form.amount} onChange={change} className={inputClass} />
          </Field>
          <Field label="Method" htmlFor="method">
            <select id="method" name="method" value={form.method} onChange={change} className={inputClass}>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Reference" htmlFor="reference" hint="UPI transaction ID, cheque number or slip number">
          <input id="reference" name="reference" value={form.reference} onChange={change} maxLength={100} className={inputClass} />
        </Field>

        <Field label="Note" htmlFor="note">
          <input id="note" name="note" value={form.note} onChange={change} maxLength={300} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
};

export default BanquetPaymentModal;