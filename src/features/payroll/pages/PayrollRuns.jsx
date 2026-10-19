import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Banknote, CheckCircle2, Loader2, Play } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import ExportButtons from "../../../components/common/ExportButtons";
import {
  approvePeriod,
  generatePayroll,
  getPeriodSummary,
  listPayslips,
  payPeriod,
} from "../services/payroll.service";
import { Badge, Field, ModalActions } from "../components/PayrollUi";
import {
  PAYMENT_METHOD_OPTIONS,
  PAYSLIP_STATUS_META,
  formatINR,
  getErrorMessage,
  inputClass,
  outlineButton,
  periodLabel,
  previousPeriod,
  primaryButton,
} from "../payroll.utils";

const StatCard = ({ label, value, tone = "text-slate-900" }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
  </div>
);

const PayrollRuns = () => {
  const navigate = useNavigate();

  const [period, setPeriod] = useState(previousPeriod());
  const [summary, setSummary] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);

  const [allowOngoing, setAllowOngoing] = useState(false);
  const [lockAttendance, setLockAttendance] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ method: "bank_transfer", reference: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list] = await Promise.all([
        getPeriodSummary({ period }),
        listPayslips({ period, limit: 100 }),
      ]);
      setSummary(s);
      setPayslips(Array.isArray(list) ? list : list?.items ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load payroll"));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setResult(null);
    load();
  }, [load]);

  const run = async (key, action, onDone) => {
    setBusy(key);
    try {
      const data = await action();
      onDone?.(data);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const handleGenerate = () =>
    run("generate", () => generatePayroll({ period, allowOngoing }), (data) => {
      setResult({ type: "generate", ...data });
      toast.success(`Payroll generated: ${data.created ?? 0} new, ${data.updated ?? 0} updated`);
    });

  const handleApprove = () => {
    if (!window.confirm(`Approve all draft payslips for ${periodLabel(period)}?`)) return;
    run("approve", () => approvePeriod({ period, lockAttendance }), (data) => {
      setResult({ type: "approve", ...data });
      toast.success(`${data.approved} payslip(s) approved`);
    });
  };

  const handlePay = () =>
    run(
      "pay",
      () => payPeriod({ period, method: payForm.method, reference: payForm.reference.trim() }),
      (data) => {
        setPayModal(false);
        toast.success(`${data.paid} salary payment(s) marked as paid`);
      }
    );

  const by = summary?.byStatus;

  const exportColumns = [
    { header: "Staff Name", value: (p) => p.user?.name || "-" },
    { header: "Role", value: (p) => p.user?.role || "-" },
    { header: "Payroll Period", value: () => period },
    { header: "Payable Days", value: (p) => p.attendance?.payableDays ?? 0 },
    { header: "Calendar Days", value: (p) => p.attendance?.calendarDays ?? 0 },
    { header: "Unmarked Days", value: (p) => p.attendance?.notMarked ?? 0 },
    { header: "Gross Earnings", value: (p) => p.grossEarnings ?? 0 },
    { header: "Total Deductions", value: (p) => p.totalDeductions ?? 0 },
    { header: "Net Pay", value: (p) => p.netPay ?? 0 },
    { header: "Status", value: (p) => p.status || "-" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate payslips from attendance, review them, approve, then mark salaries as paid.
          </p>
        </div>
        <div>
          <label htmlFor="period" className="mb-1.5 block text-xs font-medium text-slate-700">
            Month
          </label>
          <input
            id="period"
            type="month"
            value={period}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Draft payslips" value={by?.draft ?? 0} tone="text-amber-600" />
          <StatCard label="Approved" value={by?.approved ?? 0} tone="text-sky-600" />
          <StatCard label="Paid" value={by?.paid ?? 0} tone="text-emerald-600" />
          <StatCard label="Total net pay" value={formatINR(summary.totals?.net ?? 0)} />
          <StatCard label="Total deductions" value={formatINR(summary.totals?.deductions ?? 0)} />
        </div>
      )}

      {summary?.missingStructure?.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">
            No salary is set for: {summary.missingStructure.map((m) => m.name).join(", ")}
          </p>
          <Link to="/payroll/structures" className="mt-1 inline-block font-semibold underline">
            Set salaries
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Run payroll for {periodLabel(period)}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleGenerate} disabled={Boolean(busy)} className={primaryButton}>
            {busy === "generate" ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {payslips.length ? "Regenerate drafts" : "Generate payroll"}
          </button>
          <button type="button" onClick={handleApprove} disabled={Boolean(busy) || !by?.draft} className={outlineButton}>
            {busy === "approve" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Approve all drafts
          </button>
          <button type="button" onClick={() => setPayModal(true)} disabled={Boolean(busy) || !by?.approved} className={outlineButton}>
            <Banknote size={16} />
            Mark approved as paid
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          {summary?.isOngoing && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allowOngoing} onChange={(e) => setAllowOngoing(e.target.checked)} />
              Generate a preview for this running month
            </label>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={lockAttendance} onChange={(e) => setLockAttendance(e.target.checked)} />
            Also lock this month's attendance when approving
          </label>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Regenerating a draft refreshes the calculated lines but keeps any bonus or deduction added by hand. Approved
          and paid payslips are never changed.
        </p>
      </div>

      {result && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
          {result?.type === "generate" && (
            <div className="space-y-3">
              <p>Created: {result.created ?? 0} | Updated: {result.updated ?? 0}</p>
              {(result.skipped ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold">Skipped employees</h3>
                  {result.skipped.map((item, index) => (
                    <p key={`${item.name}-${index}`}>{item.name}: {item.reason}</p>
                  ))}
                </div>
              )}
              {(result.failed ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold">Generation errors</h3>
                  {result.failed.map((item, index) => (
                    <p key={`${item.name}-${index}`}>{item.name}: {item.reason}</p>
                  ))}
                </div>
              )}
              {(result.warnings ?? []).length > 0 && (
                <div>
                  <h3 className="font-semibold">Warnings</h3>
                  {result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Payslips</h2>
            <p className="text-xs text-slate-500">{periodLabel(period)} · {payslips.length} loaded record(s)</p>
          </div>
          <ExportButtons
            title={`Payroll - ${periodLabel(period)}`}
            fileName={`payroll-${period}`}
            columns={exportColumns}
            rows={payslips}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : payslips.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-500">
            No payslips for {periodLabel(period)} yet. Click Generate payroll.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Payable days</th>
                  <th className="px-4 py-3 text-right font-medium">Gross</th>
                  <th className="px-4 py-3 text-right font-medium">Deductions</th>
                  <th className="px-4 py-3 text-right font-medium">Net pay</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map((p) => (
                  <tr key={p._id} onClick={() => navigate(`/payroll/${p._id}`)} className="cursor-pointer hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.user?.name}</p>
                      <p className="text-xs capitalize text-slate-500">{p.user?.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.attendance?.payableDays ?? 0} / {p.attendance?.calendarDays ?? 0}
                      {(p.attendance?.notMarked ?? 0) > 0 && (
                        <p className="text-xs text-amber-600">{p.attendance.notMarked} unmarked day(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{formatINR(p.grossEarnings)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(p.totalDeductions)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(p.netPay)}</td>
                    <td className="px-4 py-3"><Badge meta={PAYSLIP_STATUS_META[p.status]} value={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={payModal}
        size="sm"
        title="Mark Salaries as Paid"
        subtitle={`${by?.approved || 0} approved payslip(s), ${periodLabel(period)}`}
        onClose={() => setPayModal(false)}
        busy={busy === "pay"}
        footer={<ModalActions onCancel={() => setPayModal(false)} onConfirm={handlePay} confirmText="Mark as Paid" busy={busy === "pay"} />}
      >
        <div className="space-y-4">
          <Field label="Paid by" htmlFor="payMethod">
            <select id="payMethod" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className={inputClass}>
              {PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Reference" htmlFor="payRef" hint="Bulk transfer batch number or any note">
            <input id="payRef" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} maxLength={100} className={inputClass} />
          </Field>
        </div>
      </Modal>
    </div>
  );
};

export default PayrollRuns;
