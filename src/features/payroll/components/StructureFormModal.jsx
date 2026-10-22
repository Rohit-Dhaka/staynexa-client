import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { createStructure, updateStructure } from "../services/payroll.service";
import { Field } from "./PayrollUi";
import {
  PAY_DAYS_BASIS_OPTIONS,
  formatINR,
  getErrorMessage,
  inputClass,
  outlineButton,
  toDayKey,
} from "../payroll.utils";

import {primaryButton,} from "../../../utils/banquet.utils";

const toForm = (structure) => ({
  effectiveFrom: toDayKey(),
  basic: String(structure?.basic ?? ""),
  allowances: (structure?.allowances || []).map((a) => ({
    name: a.name,
    amount: String(a.amount),
  })),
  payDaysBasis: structure?.payDaysBasis || "calendar",
  fixedDays: String(structure?.fixedDays ?? 30),
  overtimeRatePerHour: String(structure?.overtimeRatePerHour ?? 0),
  pfApplicable: structure?.pfApplicable ?? false,
  esiApplicable: structure?.esiApplicable ?? false,
  ptApplicable: structure?.ptApplicable ?? false,
  bankName: structure?.bank?.bankName || "",
  accountHolder: structure?.bank?.accountHolder || "",
  accountNumber: "",
  ifsc: structure?.bank?.ifsc || "",
  upiId: structure?.bank?.upiId || "",
  note: structure?.note || "",
});

const StructureFormModal = ({ person, structure, mode, onClose, onSaved }) => {
  const editing = mode === "edit";
  const [form, setForm] = useState(() => {
    const initial = toForm(structure);
    if (editing && structure) initial.effectiveFrom = structure.effectiveFrom;
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const change = (event) =>
    setForm((f) => ({ ...f, [event.target.name]: event.target.value }));
  const toggle = (name) => setForm((f) => ({ ...f, [name]: !f[name] }));

  const updateAllowance = (index, patch) =>
    setForm((f) => ({
      ...f,
      allowances: f.allowances.map((a, i) =>
        i === index ? { ...a, ...patch } : a,
      ),
    }));

  const gross =
    (Number(form.basic) || 0) +
    form.allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

  const submit = async () => {
    if (form.basic === "" || Number(form.basic) < 0)
      return toast.error("Enter the basic salary");
    if (!editing && !form.effectiveFrom)
      return toast.error("Select the date from which this salary applies");
    if (form.allowances.some((a) => !a.name.trim() || a.amount === "")) {
      return toast.error(
        "Fill in the name and amount of every allowance, or remove it",
      );
    }

    const bank = {
      bankName: form.bankName.trim(),
      accountHolder: form.accountHolder.trim(),
      ifsc: form.ifsc.trim().toUpperCase(),
      upiId: form.upiId.trim(),
    };
    if (form.accountNumber.trim())
      bank.accountNumber = form.accountNumber.trim();

    const payload = {
      basic: Number(form.basic),
      allowances: form.allowances.map((a) => ({
        name: a.name.trim(),
        amount: Number(a.amount),
      })),
      payDaysBasis: form.payDaysBasis,
      fixedDays: Number(form.fixedDays || 30),
      overtimeRatePerHour: Number(form.overtimeRatePerHour || 0),
      pfApplicable: form.pfApplicable,
      esiApplicable: form.esiApplicable,
      ptApplicable: form.ptApplicable,
      bank,
      note: form.note.trim(),
    };

    setSaving(true);
    try {
      if (editing) await updateStructure(structure._id, payload);
      else
        await createStructure({
          ...payload,
          userId: person._id,
          effectiveFrom: form.effectiveFrom,
        });
      toast.success("Salary saved successfully");
      onSaved();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setSaving(false);
    }
  };

  const title = editing
    ? "Edit Salary Revision"
    : mode === "revise"
      ? "Revise Salary"
      : "Set Salary";


return (
  <div className="rounded border border-slate-200 bg-white">
    {/* Compact header */}
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p className="text-xs text-slate-500">{person.name}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="rounded px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>

    {/* Compact form fields */}
    <div className="space-y-4 p-4">
      {!editing && (
        <Field
          label="Applies from"
          required
          htmlFor="effectiveFrom"
          hint="Past payslips remain unchanged."
        >
          <input
            id="effectiveFrom"
            type="date"
            name="effectiveFrom"
            value={form.effectiveFrom}
            onChange={change}
            className={inputClass}
          />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Basic salary (monthly)" required htmlFor="basic">
          <input
            id="basic"
            type="number"
            min="0"
            name="basic"
            value={form.basic}
            onChange={change}
            className={inputClass}
          />
        </Field>

        <Field
          label="Overtime rate per hour"
          htmlFor="overtimeRatePerHour"
        >
          <input
            id="overtimeRatePerHour"
            type="number"
            min="0"
            name="overtimeRatePerHour"
            value={form.overtimeRatePerHour}
            onChange={change}
            className={inputClass}
          />
        </Field>

        <Field label="Pay days basis" htmlFor="payDaysBasis">
          <select
            id="payDaysBasis"
            name="payDaysBasis"
            value={form.payDaysBasis}
            onChange={change}
            className={inputClass}
          >
            {PAY_DAYS_BASIS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {form.payDaysBasis === "fixed" && (
          <Field label="Fixed days" htmlFor="fixedDays">
            <input
              id="fixedDays"
              type="number"
              min="1"
              max="31"
              name="fixedDays"
              value={form.fixedDays}
              onChange={change}
              className={inputClass}
            />
          </Field>
        )}
      </div>

      {/* Allowances */}
      <div className="rounded border border-slate-200 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">
            Allowances
          </p>

          <button
            type="button"
            onClick={() =>
              setForm((f) => ({
                ...f,
                allowances: [...f.allowances, { name: "", amount: "" }],
              }))
            }
            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} />
            Add allowance
          </button>
        </div>

        {form.allowances.length === 0 ? (
          <p className="text-xs text-slate-500">No allowances added.</p>
        ) : (
          <div className="space-y-2">
            {form.allowances.map((allowance, index) => (
              <div
                key={index}
                className="grid grid-cols-12 items-center gap-2"
              >
                <input
                  value={allowance.name}
                  onChange={(event) =>
                    updateAllowance(index, { name: event.target.value })
                  }
                  placeholder="Allowance name"
                  maxLength={60}
                  aria-label="Allowance name"
                  className={`${inputClass} col-span-7`}
                />

                <input
                  type="number"
                  min="0"
                  value={allowance.amount}
                  onChange={(event) =>
                    updateAllowance(index, { amount: event.target.value })
                  }
                  placeholder="Amount"
                  aria-label="Allowance amount"
                  className={`${inputClass} col-span-4`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      allowances: f.allowances.filter(
                        (_, i) => i !== index
                      ),
                    }))
                  }
                  aria-label="Remove allowance"
                  className="col-span-1 flex justify-center rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-slate-100 pt-2 text-right text-sm font-semibold text-slate-900">
          Monthly gross: {formatINR(gross)}
        </div>
      </div>

      {/* Statutory deductions */}
      <div className="rounded border border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Statutory deductions
        </p>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.pfApplicable}
              onChange={() => toggle("pfApplicable")}
            />
            PF
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.esiApplicable}
              onChange={() => toggle("esiApplicable")}
            />
            ESI
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.ptApplicable}
              onChange={() => toggle("ptApplicable")}
            />
            Professional tax
          </label>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          A deduction applies only when enabled here and in Payroll Settings.
        </p>
      </div>

      {/* Bank details */}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Bank details
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Bank name" htmlFor="bankName">
            <input
              id="bankName"
              name="bankName"
              value={form.bankName}
              onChange={change}
              maxLength={80}
              className={inputClass}
            />
          </Field>

          <Field label="Account holder" htmlFor="accountHolder">
            <input
              id="accountHolder"
              name="accountHolder"
              value={form.accountHolder}
              onChange={change}
              maxLength={80}
              className={inputClass}
            />
          </Field>

          <Field
            label="Account number"
            htmlFor="accountNumber"
            hint={
              structure?.bank?.accountLast4
                ? `Saved account ends ${structure.bank.accountLast4}; leave blank to keep it.`
                : "Only the last 4 digits are stored."
            }
          >
            <input
              id="accountNumber"
              name="accountNumber"
              value={form.accountNumber}
              onChange={change}
              className={inputClass}
            />
          </Field>

          <Field label="IFSC" htmlFor="ifsc">
            <input
              id="ifsc"
              name="ifsc"
              value={form.ifsc}
              onChange={change}
              maxLength={11}
              className={inputClass}
            />
          </Field>

          <Field label="UPI ID" htmlFor="upiId">
            <input
              id="upiId"
              name="upiId"
              value={form.upiId}
              onChange={change}
              maxLength={80}
              className={inputClass}
            />
          </Field>

          <Field label="Note" htmlFor="note">
            <input
              id="note"
              name="note"
              value={form.note}
              onChange={change}
              maxLength={300}
              placeholder="e.g. Annual increment"
              className={inputClass}
            />
          </Field>
        </div>
      </div>
    </div>

    {/* Compact footer */}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-600">
        Monthly gross:{" "}
        <span className="font-semibold text-slate-900">
          {formatINR(gross)}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className={outlineButton}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className={`${primaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {saving ? "Saving..." : "Save Salary"}
        </button>
      </div>
    </div>
  </div>
);

};

export default StructureFormModal;
