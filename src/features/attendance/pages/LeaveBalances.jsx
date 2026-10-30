import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, RefreshCw } from "lucide-react";
import Modal from "../../../components/common/Modal";
import { adjustLeaveBalance, listLeaveBalances } from "../services/attendance.service";
import {
  Field,
  ErrorBox,
  ModalFooter,
  inputClass,
} from "../../bookings/components/formUi";
import { formatUnits, getErrorMessage } from "../../../utils/attendanceUi";

const TYPES = ["casual", "sick", "paid"];

const TYPE_LABELS = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  paid: "Paid Leave",
};

const getRows = (response) => {
  
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.rows)) return response.rows;
  if (Array.isArray(response?.data?.rows)) return response.data.rows;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getBalance = (row, type) => row?.balance?.[type] ?? {};
const getTotal = (balance) =>
  Number(balance?.allotted ?? 0) + Number(balance?.carriedForward ?? 0);

const LeaveBalances = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    type: "casual",
    allotted: "",
    carriedForward: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadBalances = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");
      try {
        const response = await listLeaveBalances({ year });
        setData(response);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [year],
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await listLeaveBalances({ year });
        if (active) setData(response);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    const intervalId = window.setInterval(() => {
      if (active && !document.hidden) {
        listLeaveBalances({ year })
          .then((response) => {
            if (active) setData(response);
          })
          .catch(() => {
            // Keep the last successful values if a background refresh fails.
          });
      }
    }, 30000);

    const onFocus = () => {
      if (active) {
        listLeaveBalances({ year })
          .then((response) => {
            if (active) setData(response);
          })
          .catch(() => {});
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [year, reload]);

  const rows = useMemo(() => getRows(data), [data]);

  const fillForm = (row, type) => {
    const balance = getBalance(row, type);
    setForm({
      type,
      allotted: String(balance.allotted ?? 0),
      carriedForward: String(balance.carriedForward ?? 0),
    });
    setFormError("");
  };

  const openEdit = (row) => {
    setEditing(row);
    fillForm(row, "casual");
  };

  const closeEdit = () => {
    if (!saving) {
      setEditing(null);
      setFormError("");
    }
  };

  const save = async () => {
    if (!editing) return;

    const allotted = Number(form.allotted);
    const carriedForward = Number(form.carriedForward);

    if (
      form.allotted.trim() === "" ||
      form.carriedForward.trim() === "" ||
      !Number.isFinite(allotted) ||
      !Number.isFinite(carriedForward) ||
      allotted < 0 ||
      carriedForward < 0
    ) {
      setFormError("Please enter valid leave amounts. Values cannot be negative.");
      return;
    }

    setFormError("");
    setSaving(true);

    try {
      await adjustLeaveBalance({
        userId: editing.user._id,
        year,
        type: form.type,
        allotted,
        carriedForward,
      });
      setEditing(null);
      await loadBalances({ silent: true });
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Leave Balance</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Live overview of each staff member’s leave allowance, remaining
            balance, carry-forward, and unpaid leave taken.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="leave-year" className="text-sm font-medium text-slate-600">
            Year
          </label>
          <select
            id="leave-year"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            {[0, 1, 2].map((offset) => {
              const optionYear = new Date().getFullYear() - offset;
              return (
                <option key={optionYear} value={optionYear}>
                  {optionYear}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={() => loadBalances({ silent: true })}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700  disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadBalances()}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white ">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">Staff leave summary</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Remaining balance / total available, including carry-forward
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {rows.length} {rows.length === 1 ? "staff member" : "staff members"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Staff</th>
                <th scope="col" className="px-4 py-3 font-semibold">Casual Leave</th>
                <th scope="col" className="px-4 py-3 font-semibold">Sick Leave</th>
                <th scope="col" className="px-4 py-3 font-semibold">Paid Leave</th>
                <th scope="col" className="px-4 py-3 font-semibold">Unpaid Leave Taken</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-slate-500">
                    <Loader2 size={22} className="mx-auto mb-2 animate-spin text-black" />
                    Loading leave balances…
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="font-medium text-slate-700">No leave balances found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      No staff leave records were returned for {year}.
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row) => (
                  <tr key={row?.user?._id ?? row?.userId ?? row?._id} className="transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {row?.user?.name ?? row?.name ?? "Unknown staff"}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {String(row?.user?.role ?? row?.role ?? "").replaceAll("_", " ")}
                      </p>
                    </td>

                    {TYPES.map((type) => {
                      const balance = getBalance(row, type);
                      return (
                        <td key={type} className="px-4 py-3">
                          <p className="font-semibold tabular-nums text-slate-900">
                            {formatUnits(balance.remaining ?? 0)}
                          </p>
                          <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                            / {formatUnits(getTotal(balance))} total
                          </p>
                        </td>
                      );
                    })}

                    <td className="px-4 py-3">
                      <p className="font-semibold tabular-nums text-slate-900">
                        {formatUnits(row?.balance?.unpaidTaken ?? 0)}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">Taken this year</p>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition "
                        title="Edit leave balance"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        The table refreshes every 30 seconds while the page is open, when you
        return to the tab, and after saving an adjustment. Paid leave and unpaid
        leave taken are tracked separately.
      </p>

      <Modal
        open={Boolean(editing)}
        size="sm"
        title="Edit Leave Balance"
        subtitle={editing ? `${editing.user?.name ?? "Staff"}, ${year}` : ""}
        onClose={closeEdit}
        busy={saving}
        footer={
          <ModalFooter
            onCancel={closeEdit}
            onConfirm={save}
            confirmText="Save Changes"
            busy={saving}
          />
        }
      >
        <div className="space-y-4">
          <ErrorBox message={formError} />

          {editing && (
            <>
              <Field label="Leave Type">
                <select
                  value={form.type}
                  onChange={(event) => fillForm(editing, event.target.value)}
                  className={`${inputClass} capitalize`}
                  disabled={saving}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Annual Leave Allowance">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.allotted}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        allotted: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={saving}
                  />
                </Field>

                <Field label="Carry-Forward Leaves">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.carriedForward}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        carriedForward: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={saving}
                  />
                </Field>
              </div>

              <p className="rounded bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                This form edits allowance and carry-forward. Unpaid leave taken
                must be updated by the backend leave-approval workflow.
              </p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default LeaveBalances;
