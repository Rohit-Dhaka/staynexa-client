import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import {
  getPayrollSettings,
  updatePayrollSettings,
} from "../services/payroll.service";
import { Card, Field } from "../components/PayrollUi";
import {
  getErrorMessage,
  inputClass,
  primaryButton,
} from "../payroll.utils";

const toForm = (s) => ({
  pfEnabled: Boolean(s.pf?.enabled),
  pfPercent: String(s.pf?.employeePercent ?? 12),
  ptEnabled: Boolean(s.professionalTax?.enabled),
  ptAmount: String(s.professionalTax?.amount ?? 0),
  ptMinGross: String(s.professionalTax?.minGross ?? 0),
  overtimeMultiplier: String(s.overtimeMultiplier ?? 1),
});

const PayrollSettings = () => {
  const { user } = useAuth();
  const canEdit = user?.role === ROLES.SUPER_ADMIN;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPayrollSettings()
      .then((s) => setForm(toForm(s)))
      .catch((error) =>
        toast.error(getErrorMessage(error, "Could not load payroll rules"))
      );
  }, []);

  const change = (event) => {
    setForm((f) => ({
      ...f,
      [event.target.name]: event.target.value,
    }));
  };

  const toggle = (name) => {
    setForm((f) => ({
      ...f,
      [name]: !f[name],
    }));
  };

  const save = async () => {
    if (saving || !canEdit) return;

    setSaving(true);

    try {
      const saved = await updatePayrollSettings({
        pf: {
          enabled: form.pfEnabled,
          employeePercent: Number(form.pfPercent),
        },
        professionalTax: {
          enabled: form.ptEnabled,
          amount: Number(form.ptAmount),
          minGross: Number(form.ptMinGross),
        },
        overtimeMultiplier: Number(form.overtimeMultiplier),
      });

      setForm(toForm(saved));
      toast.success("Payroll rules saved successfully");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center text-slate-400">
        <Loader2 size={28} />
      </div>
    );
  }

  const input = (name, extra = {}) => (
    <input
      type="number"
      min="0"
      step="any"
      name={name}
      value={form[name]}
      onChange={change}
      disabled={!canEdit || saving}
      className={`${inputClass} w-full min-w-0`}
      {...extra}
    />
  );

  return (
    <main className="min-h-screen w-full min-w-0 space-y-5 sm:space-y-6">
      <header className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Payroll Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Configure the rules used when payslips are generated.
        </p>
      </header>

      {!canEdit && (
        <div className="w-full rounded border border-slate-200 bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-600">
          Only a super admin can change these rules.
        </div>
      )}

      <div className="w-full rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        PF and professional tax rates can change over time and may differ by
        state. Confirm the applicable rates with your accountant before
        enabling these deductions.
      </div>

      <Card title="Provident Fund (PF)">
        <div className="space-y-5">
          <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded"
              checked={form.pfEnabled}
              onChange={() => toggle("pfEnabled")}
              disabled={!canEdit || saving}
            />
            <span className="min-w-0">
              Deduct PF from staff who are marked as PF applicable
            </span>
          </label>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
            <Field label="Employee contribution (%)">
              {input("pfPercent", { max: 100 })}
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Professional Tax">
        <div className="space-y-5">
          <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded"
              checked={form.ptEnabled}
              onChange={() => toggle("ptEnabled")}
              disabled={!canEdit || saving}
            />
            <span className="min-w-0">
              Deduct professional tax from staff who are marked as applicable
            </span>
          </label>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
            <Field label="Monthly amount">{input("ptAmount")}</Field>

            <Field label="Applies when monthly gross is at least">
              {input("ptMinGross")}
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Overtime">
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-5">
          <Field
            label="Overtime multiplier"
            hint="1 pays the normal overtime rate; 2 pays double."
          >
            {input("overtimeMultiplier")}
          </Field>
        </div>
      </Card>

      {canEdit && (
        <div className="flex w-full min-w-0 flex-col-reverse gap-4 rounded border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="min-w-0 text-xs leading-5 text-slate-500">
            Changes will apply to payroll calculations that use these settings.
          </p>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={`${primaryButton} w-full shrink-0 sm:w-auto`}
          >
            {saving && <Loader2 size={16} />}
            {saving ? "Saving Rules..." : "Save Rules"}
          </button>
        </div>
      )}
    </main>
  );
};

export default PayrollSettings;
