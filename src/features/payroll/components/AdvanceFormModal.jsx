import { useState } from "react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import { createAdvance } from "../services/payroll.service";
import { Field, ModalActions } from "./PayrollUi";
import {
  PAYMENT_METHOD_OPTIONS,
  formatINR,
  getErrorMessage,
  inputClass,
  toDayKey,
  toPeriod,
} from "../payroll.utils";

const nextMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return toPeriod(d);
};

const AdvanceFormModal = ({ people, onClose, onSaved }) => {
  const [form, setForm] = useState({
    userId: "",
    amount: "",
    givenOn: toDayKey(),
    installments: "1",
    firstRecoveryPeriod: nextMonth(),
    method: "cash",
    reference: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const change = (event) => setForm((f) => ({ ...f, [event.target.name]: event.target.value }));

  const installmentAmount =
    Number(form.amount) > 0 && Number(form.installments) > 0
      ? Math.ceil(Number(form.amount) / Number(form.installments))
      : 0;

  const submit = async () => {
    if (!form.userId) return toast.error("Select a staff member");
    if (!form.amount || Number(form.amount) <= 0) return toast.error("Enter the advance amount");

    setSaving(true);
    try {
      await createAdvance({
        userId: form.userId,
        amount: Number(form.amount),
        givenOn: form.givenOn,
        installments: Number(form.installments || 1),
        firstRecoveryPeriod: form.firstRecoveryPeriod,
        method: form.method,
        reference: form.reference.trim(),
        reason: form.reason.trim(),
      });
      toast.success("Salary advance recorded successfully");
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      title="Give Salary Advance"
      onClose={onClose}
      busy={saving}
      footer={<ModalActions onCancel={onClose} onConfirm={submit} confirmText="Save Advance" busy={saving} />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Staff member" required htmlFor="userId">
            <select id="userId" name="userId" value={form.userId} onChange={change} className={inputClass}>
              <option value="">Select a staff member</option>
              {people.map((p) => (
                <option key={p.user._id} value={p.user._id}>
                  {p.user.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Amount" required htmlFor="amount">
          <input id="amount" type="number" min="1" name="amount" value={form.amount} onChange={change} className={inputClass} />
        </Field>
        <Field label="Given on" htmlFor="givenOn">
          <input id="givenOn" type="date" max={toDayKey()} name="givenOn" value={form.givenOn} onChange={change} className={inputClass} />
        </Field>
        <Field
          label="Installments"
          htmlFor="installments"
          hint={installmentAmount ? `About ${formatINR(installmentAmount)} will be deducted every month` : ""}
        >
          <input id="installments" type="number" min="1" max="36" name="installments" value={form.installments} onChange={change} className={inputClass} />
        </Field>
        <Field label="First deduction month" htmlFor="firstRecoveryPeriod">
          <input id="firstRecoveryPeriod" type="month" name="firstRecoveryPeriod" value={form.firstRecoveryPeriod} onChange={change} className={inputClass} />
        </Field>
        <Field label="Paid by" htmlFor="method">
          <select id="method" name="method" value={form.method} onChange={change} className={inputClass}>
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reference" htmlFor="reference">
          <input id="reference" name="reference" value={form.reference} onChange={change} maxLength={100} className={inputClass} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reason" htmlFor="reason">
            <input id="reason" name="reason" value={form.reason} onChange={change} maxLength={300} className={inputClass} />
          </Field>
        </div>
      </div>
    </Modal>
  );
};

export default AdvanceFormModal;