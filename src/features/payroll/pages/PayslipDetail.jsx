import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Banknote, CheckCircle2, Loader2, Plus, Printer, RotateCcw, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import Modal from "../../../components/common/Modal";
import {
  addLine,
  approvePayslip,
  cancelPayslip,
  getPayslip,
  payPayslip,
  removeLine,
  reopenPayslip,
} from "../services/payroll.service";
import { Badge, Field, ModalActions } from "../components/PayrollUi";
import {
  MANAGEMENT_ROLES,
  PAYMENT_METHOD_OPTIONS,
  PAYSLIP_STATUS_META,
  dangerButton,
  formatDateTime,
  formatHours,
  formatINR,
  getErrorMessage,
  inputClass,
  labelFor,
  outlineButton,
  periodLabel,
  primaryButton,
} from "../payroll.utils";

const printStyles = `
@media print {
  body * { visibility: hidden; }
  #payslip-print, #payslip-print * { visibility: visible; }
  #payslip-print { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
}
`;

const PayslipDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isManager = MANAGEMENT_ROLES.includes(user?.role);

  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState(null);

  const [lineForm, setLineForm] = useState({ type: "earning", kind: "bonus", label: "", amount: "" });
  const [force, setForce] = useState(false);
  const [payForm, setPayForm] = useState({ method: "bank_transfer", reference: "" });
  const [reason, setReason] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        setSlip(await getPayslip(id));
        setLoadError("");
      } catch (error) {
        if (silent) toast.error(getErrorMessage(error));
        else setLoadError(getErrorMessage(error, "Could not load this payslip"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key, action, successMessage) => {
    setBusy(key);
    try {
      await action();
      toast.success(successMessage);
      setModal(null);
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const submitLine = () => {
    if (!lineForm.label.trim()) return toast.error("Enter a label");
    if (!lineForm.amount || Number(lineForm.amount) <= 0) return toast.error("Enter an amount greater than zero");
    run(
      "line",
      async () => {
        await addLine(slip._id, {
          type: lineForm.type,
          kind: lineForm.kind,
          label: lineForm.label.trim(),
          amount: Number(lineForm.amount),
        });
        setLineForm({ type: "earning", kind: "bonus", label: "", amount: "" });
      },
      "Line added successfully"
    );
  };

  const deleteLine = async (line) => {
    if (!window.confirm(`Remove "${line.label}"?`)) return;
    setBusy("line");
    try {
      await removeLine(slip._id, line._id);
      toast.success("Line removed successfully");
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const submitCancel = () => {
    if (!reason.trim()) return toast.error("Enter a reason for cancelling");
    run("cancel", () => cancelPayslip(slip._id, reason.trim()), "Payslip cancelled");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (loadError || !slip) {
    return (
      <div className="max-w-xl space-y-4">
        <Link to="/payroll" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          Back to Payroll
        </Link>
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">{loadError || "Payslip not found"}</p>
      </div>
    );
  }

  const isDraft = slip.status === "draft";
  const isApproved = slip.status === "approved";
  const att = slip.attendance;
  const backPath = isManager ? "/payroll" : "/payroll/my";

  return (
    <div className="max-w-4xl space-y-5">
      <style>{printStyles}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={backPath} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} />
            Back
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {slip.user?.name}, {periodLabel(slip.periodKey)}
            </h1>
            <Badge meta={PAYSLIP_STATUS_META[slip.status]} value={slip.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{slip.payrollNumber}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className={outlineButton}>
            <Printer size={16} />
            Print
          </button>
          {isManager && isDraft && (
            <>
              <button type="button" onClick={() => setModal("line")} className={outlineButton}>
                <Plus size={16} />
                Add bonus or deduction
              </button>
              <button type="button" onClick={() => setModal("approve")} className={primaryButton}>
                <CheckCircle2 size={16} />
                Approve
              </button>
            </>
          )}
          {isManager && isApproved && (
            <>
              <button type="button" onClick={() => setModal("pay")} className={primaryButton}>
                <Banknote size={16} />
                Mark as paid
              </button>
              <button
                type="button"
                onClick={() => run("reopen", () => reopenPayslip(slip._id), "Payslip reopened as a draft")}
                disabled={busy === "reopen"}
                className={outlineButton}
              >
                <RotateCcw size={16} />
                Reopen
              </button>
            </>
          )}
          {isManager && (isDraft || isApproved) && (
            <button type="button" onClick={() => { setReason(""); setModal("cancel"); }} className={dangerButton}>
              <XCircle size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {isManager && isDraft && att.notMarked > 0 && (
        <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-700">
                   {att.notMarked} working day(s) of this month have no attendance, so they are counted as unpaid. Sundays and
          holidays are not included here. Fix the attendance and regenerate the payroll, or approve with the override.
        </p>
      )}
      {slip.shortfall > 0 && (
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">
          Deductions are {formatINR(slip.shortfall)} more than the earnings. Adjust the deductions before approving.
        </p>
      )}

      <div id="payslip-print" className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-800 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{slip.hotel.name}</h2>
            {slip.hotel.address && <p className="mt-1 max-w-xs text-slate-600">{slip.hotel.address}</p>}
            {(slip.hotel.phone || slip.hotel.email) && (
              <p className="text-slate-600">{[slip.hotel.phone, slip.hotel.email].filter(Boolean).join(" | ")}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-wide text-indigo-600">PAYSLIP</p>
            <p className="font-medium">{periodLabel(slip.periodKey)}</p>
            <p className="text-xs text-slate-500">{slip.payrollNumber}</p>
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-200 py-5 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Employee</p>
            <p className="font-medium">{slip.user?.name}</p>
            <p className="capitalize text-slate-600">{slip.user?.role}</p>
            <p className="text-slate-600">{slip.user?.email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Payment</p>
            {slip.bank?.bankName && <p>{slip.bank.bankName}</p>}
            {slip.bank?.accountLast4 && <p className="text-slate-600">Account ending {slip.bank.accountLast4}</p>}
            {slip.bank?.ifsc && <p className="text-slate-600">IFSC {slip.bank.ifsc}</p>}
            {slip.bank?.upiId && <p className="text-slate-600">UPI {slip.bank.upiId}</p>}
            {slip.status === "paid" && (
              <p className="mt-1 text-emerald-600">
                Paid on {formatDateTime(slip.paidAt)} by {labelFor(PAYMENT_METHOD_OPTIONS, slip.paymentMethod)}
                {slip.paymentReference ? ` (${slip.paymentReference})` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 py-5 text-center sm:grid-cols-4 lg:grid-cols-6">
          {[
            ["Calendar days", att.calendarDays],
            ["Payable days", att.payableDays],
            ["Present", att.present],
            ["Half days", att.halfDay],
            ["Paid leave", att.paidLeave],
            ["Weekly off (paid)", att.weeklyOff],
            ["Holidays (paid)", att.holidays],
            ["Absent", att.absent],
            ["Unpaid leave", att.unpaidLeave],
            ["Loss of pay days", att.lopDays],
            ["Late marks", att.lateCount],
            ["Overtime", formatHours(att.overtimeMinutes)],
          ].map(([label, value]) => (
            <div key={label} className="rounded bg-slate-50 p-2">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-8 py-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Earnings</p>
            <table className="w-full">
              <tbody>
                {slip.earningLines.map((line) => (
                  <tr key={line._id} className="border-b border-slate-100">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">{formatINR(line.amount)}</td>
                    {isManager && isDraft && (
                      <td className="w-8 py-2 text-right print:hidden">
                        {line.isManual && (
                          <button type="button" onClick={() => deleteLine(line)} aria-label="Remove line" className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total earnings</td>
                  <td className="py-2 text-right">{formatINR(slip.grossEarnings)}</td>
                  {isManager && isDraft && <td />}
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Deductions</p>
            <table className="w-full">
              <tbody>
                {slip.deductionLines.length === 0 && (
                  <tr>
                    <td className="py-2 text-slate-500">No deductions</td>
                    <td />
                  </tr>
                )}
                {slip.deductionLines.map((line) => (
                  <tr key={line._id} className="border-b border-slate-100">
                    <td className="py-2">{line.label}</td>
                    <td className="py-2 text-right">{formatINR(line.amount)}</td>
                    {isManager && isDraft && (
                      <td className="w-8 py-2 text-right print:hidden">
                        {line.isManual && (
                          <button type="button" onClick={() => deleteLine(line)} aria-label="Remove line" className="text-slate-400 hover:text-rose-600">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total deductions</td>
                  <td className="py-2 text-right">{formatINR(slip.totalDeductions)}</td>
                  {isManager && isDraft && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between rounded bg-slate-900 px-5 py-4 text-white">
          <span className="text-sm">Net pay</span>
          <span className="text-2xl font-bold">{formatINR(slip.netPay)}</span>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">This is a computer generated payslip.</p>
      </div>

      {slip.status === "cancelled" && slip.cancelReason && (
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">Cancelled: {slip.cancelReason}</p>
      )}

      <Modal
        open={modal === "line"}
        size="sm"
        title="Add Bonus or Deduction"
        onClose={() => setModal(null)}
        busy={busy === "line"}
        footer={<ModalActions onCancel={() => setModal(null)} onConfirm={submitLine} confirmText="Add" busy={busy === "line"} />}
      >
        <div className="space-y-4">
          <Field label="Type" htmlFor="lineType">
            <select id="lineType" value={lineForm.type} onChange={(e) => setLineForm({ ...lineForm, type: e.target.value })} className={inputClass}>
              <option value="earning">Earning (bonus, incentive)</option>
              <option value="deduction">Deduction (fine, damage)</option>
            </select>
          </Field>
          <Field label="Label" required htmlFor="lineLabel">
            <input id="lineLabel" value={lineForm.label} onChange={(e) => setLineForm({ ...lineForm, label: e.target.value })} maxLength={100} placeholder="e.g. Festival bonus" className={inputClass} />
          </Field>
          <Field label="Amount" required htmlFor="lineAmount">
            <input id="lineAmount" type="number" min="1" value={lineForm.amount} onChange={(e) => setLineForm({ ...lineForm, amount: e.target.value })} className={inputClass} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "approve"}
        size="sm"
        title="Approve Payslip"
        subtitle={`Net pay ${formatINR(slip.netPay)}`}
        onClose={() => setModal(null)}
        busy={busy === "approve"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={() => run("approve", () => approvePayslip(slip._id, { force }), "Payslip approved")}
            confirmText="Approve"
            busy={busy === "approve"}
          />
        }
      >
        <p className="text-sm text-slate-600">
          After approval the payslip is locked and any advance installments are recorded as recovered.
        </p>
        {att.notMarked > 0 && (
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-1" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Approve even though {att.notMarked} day(s) have no attendance
          </label>
        )}
      </Modal>

      <Modal
        open={modal === "pay"}
        size="sm"
        title="Mark as Paid"
        subtitle={`${slip.user?.name}, ${formatINR(slip.netPay)}`}
        onClose={() => setModal(null)}
        busy={busy === "pay"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={() => run("pay", () => payPayslip(slip._id, { method: payForm.method, reference: payForm.reference.trim() }), "Payslip marked as paid")}
            confirmText="Mark as Paid"
            busy={busy === "pay"}
          />
        }
      >
        <div className="space-y-4">
          <Field label="Paid by" htmlFor="payMethod">
            <select id="payMethod" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} className={inputClass}>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference" htmlFor="payRef" hint="UPI transaction ID or cheque number">
            <input id="payRef" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} maxLength={100} className={inputClass} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={modal === "cancel"}
        size="sm"
        title="Cancel Payslip"
        onClose={() => setModal(null)}
        busy={busy === "cancel"}
        footer={<ModalActions onCancel={() => setModal(null)} onConfirm={submitCancel} confirmText="Cancel Payslip" busy={busy === "cancel"} danger />}
      >
        <p className="mb-3 text-sm text-slate-500">
          Any advance installments recovered by this payslip are returned to the advance. Regenerating the payroll
          brings back a fresh draft.
        </p>
        <Field label="Reason" required htmlFor="cancelReason">
          <textarea id="cancelReason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
        </Field>
      </Modal>
    </div>
  );
};

export default PayslipDetail;