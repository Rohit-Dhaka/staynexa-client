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
      value: (advance) =>
        advance.firstRecoveryPeriod ? periodLabel(advance.firstRecoveryPeriod) : "-",
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

  const renderAdvanceActions = (advance) => {
    if (!isManager || advance.status !== "active") return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setRepaying(advance);
            setRepayAmount(String(advance.balanceAmount ?? ""));
          }}
          className="min-h-10 rounded border border-indigo-200 px-3 py-2 text-xs font-medium text-indigo-700"
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
            className="min-h-10 rounded border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600"
          >
            Cancel
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Salary Advances</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {isManager
              ? "Advances given to staff. Installments are deducted automatically from the monthly payslip."
              : "Your salary advances and how much is still to be recovered."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ExportButtons
            title="Salary Advances"
            fileName="salary-advances"
            columns={exportColumns}
            getRows={getExportRows}
          />
          {isManager && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={`${primaryButton} w-full justify-center sm:w-auto`}
            >
              <Plus size={16} />
              Give Advance
            </button>
          )}
        </div>
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`min-h-9 shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              status === tab.value
                ? "bg-black text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 size={24} />
          </div>
        ) : data.items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            No advances found.
          </p>
        ) : (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              {data.items.map((advance) => (
                <article key={advance._id} className="min-w-0 rounded border border-slate-200 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isManager && (
                        <p className="break-words text-sm font-semibold text-slate-900">
                          {advance.user?.name || "-"}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-slate-500">
                        Given on {formatDate(advance.givenOn)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge
                        meta={ADVANCE_STATUS_META[advance.status]}
                        value={advance.status}
                      />
                    </div>
                  </div>

                  {advance.reason && (
                    <p className="mt-2 break-words text-xs text-slate-500">
                      {advance.reason}
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Advance amount</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {formatINR(advance.amount)}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs text-slate-500">Remaining balance</p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {formatINR(advance.balanceAmount)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">Installments</p>
                      <p className="mt-1 text-sm text-slate-800">
                        {advance.installments ?? 0} × {formatINR(advance.installmentAmount)}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        From {advance.firstRecoveryPeriod ? periodLabel(advance.firstRecoveryPeriod) : "-"}
                      </p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-xs text-slate-500">Recovered</p>
                      <p className="mt-1 break-words text-sm font-medium text-emerald-600">
                        {formatINR(advance.recoveredAmount)}
                      </p>
                    </div>
                  </div>

                  {isManager && advance.status === "active" && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {renderAdvanceActions(advance)}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
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
                    {isManager && <th className="px-4 py-3 font-medium">Actions</th>}
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
                      <td className="px-4 py-3 text-right font-medium">
                        {formatINR(advance.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {advance.installments} × {formatINR(advance.installmentAmount)}
                        <p className="text-xs text-slate-500">
                          From {advance.firstRecoveryPeriod ? periodLabel(advance.firstRecoveryPeriod) : "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {formatINR(advance.recoveredAmount)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatINR(advance.balanceAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          meta={ADVANCE_STATUS_META[advance.status]}
                          value={advance.status}
                        />
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {renderAdvanceActions(advance)}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!loading && data.pages > 1 && (
          <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <span className="text-xs sm:text-sm">
              Page {data.page} of {data.pages} ({data.total} advances)
            </span>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
                className="min-h-10 rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.pages || loading}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-10 rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

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
        subtitle={
          repaying
            ? `${repaying.user?.name || "Staff member"}, balance ${formatINR(repaying.balanceAmount)}`
            : ""
        }
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
        <div className="space-y-4">
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
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelling)}
        size="sm"
        title="Cancel Advance"
        subtitle={
          cancelling
            ? `${cancelling.user?.name || "Staff member"}, ${formatINR(cancelling.amount)}`
            : ""
        }
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
