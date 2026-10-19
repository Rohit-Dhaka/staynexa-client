import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import Modal from "../../../components/common/Modal";
import ExportButtons from "../../../components/common/ExportButtons";
import {
  cancelAdvance,
  listAdvances,
  listStructures,
  repayAdvance,
} from "../services/payroll.service";
import AdvanceFormModal from "../components/AdvanceFormModal";
import { Badge, Field, ModalActions } from "../components/PayrollUi";
import {
  ADVANCE_STATUS_META,
  MANAGEMENT_ROLES,
  formatDate,
  formatINR,
  getErrorMessage,
  inputClass,
  periodLabel,
  primaryButton,
} from "../payroll.utils";
import { fetchAllPages } from "../../../utils/exportUtils";

const Advances = () => {
  const { user } = useAuth();
  const isManager = MANAGEMENT_ROLES.includes(user?.role);

  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);

  const [creating, setCreating] = useState(false);
  const [repaying, setRepaying] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (status) params.status = status;
      const response = await listAdvances(params);
      setData({
        items: Array.isArray(response?.items) ? response.items : [],
        total: Number(response?.total || 0),
        page: Number(response?.page || page),
        pages: Math.max(1, Number(response?.pages || 1)),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load advances"));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (isManager) listStructures().then(setPeople).catch(() => {});
  }, [isManager]);

  const getExportRows = async () => {
    const params = {};
    if (status) params.status = status;

    return fetchAllPages(
      ({ page: exportPage, limit }) =>
        listAdvances({ ...params, page: exportPage, limit }),
      { limit: 100 }
    );
  };

  const exportColumns = [
    ...(isManager
      ? [{ header: "Staff", value: (advance) => advance.user?.name || "-" }]
      : []),
    { header: "Given On", value: (advance) => formatDate(advance.givenOn) },
    { header: "Amount", value: (advance) => Number(advance.amount || 0) },
    { header: "Installments", value: (advance) => advance.installments ?? 0 },
    {
      header: "Installment Amount",
      value: (advance) => Number(advance.installmentAmount || 0),
    },
    {
      header: "First Recovery Period",
      value: (advance) => advance.firstRecoveryPeriod ? periodLabel(advance.firstRecoveryPeriod) : "-",
    },
    {
      header: "Recovered Amount",
      value: (advance) => Number(advance.recoveredAmount || 0),
    },
    {
      header: "Balance Amount",
      value: (advance) => Number(advance.balanceAmount || 0),
    },
    { header: "Status", value: (advance) => advance.status || "-" },
    { header: "Reason", value: (advance) => advance.reason || "-" },
  ];

  const submitRepay = async () => {
    const amount = Number(repayAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return toast.error("Enter the repayment amount");
    }
    if (repaying && amount > Number(repaying.balanceAmount || 0)) {
      return toast.error("Repayment amount cannot exceed the remaining balance");
    }

    setBusy("repay");
    try {
      await repayAdvance(repaying._id, { amount });
      toast.success("Repayment recorded successfully");
      setRepaying(null);
      setRepayAmount("");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const submitCancel = async () => {
    if (!cancelReason.trim()) return toast.error("Enter a reason for cancelling");
    setBusy("cancel");
    try {
      await cancelAdvance(cancelling._id, cancelReason.trim());
      toast.success("Advance cancelled");
      setCancelling(null);
      setCancelReason("");
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const tabs = [
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "", label: "All" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Salary Advances</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isManager
              ? "Advances given to staff. Installments are deducted automatically from the monthly payslip."
              : "Your salary advances and how much is still to be recovered."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Salary Advances"
            fileName="salary-advances"
            columns={exportColumns}
            getRows={getExportRows}
          />
          {isManager && (
            <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
              <Plus size={16} />
              Give Advance
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              status === tab.value
                ? "bg-indigo-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-500">No advances found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {isManager && <th className="px-4 py-3 font-medium">Staff</th>}
                  <th className="px-4 py-3 font-medium">Given on</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Installments</th>
                  <th className="px-4 py-3 text-right font-medium">Recovered</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isManager && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((advance) => (
                  <tr key={advance._id}>
                    {isManager && (
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {advance.user?.name || "-"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {formatDate(advance.givenOn)}
                      {advance.reason && (
                        <p className="max-w-[180px] truncate text-xs text-slate-500">
                          {advance.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(advance.amount)}</td>
                    <td className="px-4 py-3">
                      {advance.installments} x {formatINR(advance.installmentAmount)}
                      <p className="text-xs text-slate-500">
                        From {periodLabel(advance.firstRecoveryPeriod)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600">
                      {formatINR(advance.recoveredAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(advance.balanceAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge meta={ADVANCE_STATUS_META[advance.status]} value={advance.status} />
                    </td>
                    {isManager && (
                      <td className="px-4 py-3">
                        {advance.status === "active" && (
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setRepaying(advance);
                                setRepayAmount(String(advance.balanceAmount ?? ""));
                              }}
                              className="text-xs font-medium text-indigo-600 hover:underline"
                            >
                              Repayment
                            </button>
                            {Number(advance.recoveredAmount || 0) === 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelling(advance);
                                  setCancelReason("");
                                }}
                                className="text-xs font-medium text-rose-600 hover:underline"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>Page {data.page} of {data.pages} ({data.total} advances)</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.pages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <AdvanceFormModal
          people={people}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      <Modal
        open={Boolean(repaying)}
        size="sm"
        title="Record Repayment"
        subtitle={repaying ? `${repaying.user?.name || "Staff member"}, balance ${formatINR(repaying.balanceAmount)}` : ""}
        onClose={() => setRepaying(null)}
        busy={busy === "repay"}
        footer={
          <ModalActions
            onCancel={() => setRepaying(null)}
            onConfirm={submitRepay}
            confirmText="Save Repayment"
            busy={busy === "repay"}
          />
        }
      >
        <Field
          label="Amount received"
          htmlFor="repayAmount"
          hint="Use this when the staff member repays part or all of the advance directly."
        >
          <input
            id="repayAmount"
            type="number"
            min="1"
            max={repaying?.balanceAmount}
            step="0.01"
            value={repayAmount}
            onChange={(event) => setRepayAmount(event.target.value)}
            className={inputClass}
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(cancelling)}
        size="sm"
        title="Cancel Advance"
        subtitle={cancelling ? `${cancelling.user?.name || "Staff member"}, ${formatINR(cancelling.amount)}` : ""}
        onClose={() => setCancelling(null)}
        busy={busy === "cancel"}
        footer={
          <ModalActions
            onCancel={() => setCancelling(null)}
            onConfirm={submitCancel}
            confirmText="Cancel Advance"
            busy={busy === "cancel"}
            danger
          />
        }
      >
        <Field label="Reason" required htmlFor="cancelReason">
          <textarea
            id="cancelReason"
            rows={3}
            maxLength={300}
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            className={inputClass}
          />
        </Field>
      </Modal>
    </div>
  );
};

export default Advances;
