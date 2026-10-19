
import { Fragment, useCallback, useEffect, useState } from "react";
import { History, Loader2, Pencil, Wallet } from "lucide-react";
import toast from "react-hot-toast";

import Modal from "../../../components/common/Modal";
import {
  deleteStructure,
  getStructureHistory,
  listStructures,
} from "../services/payroll.service";
import StructureFormModal from "../components/StructureFormModal";
import {
  formatDate,
  formatINR,
  getErrorMessage,
  outlineButton,
  primaryButton,
} from "../payroll.utils";

const Flags = ({ s }) => {
  const flags = [
    s.pfApplicable && "PF",
    s.esiApplicable && "ESI",
    s.ptApplicable && "PT",
  ].filter(Boolean);

  return flags.length ? (
    <div className="flex flex-wrap gap-1">
      {flags.map((flag) => (
        <span
          key={flag}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
        >
          {flag}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-slate-400">-</span>
  );
};

const SalaryStructures = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await listStructures();
      setRows(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load salaries"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = (person, structure, mode) => {
    setHistory(null);
    setForm({ person, structure, mode });
  };

  const closeForm = () => {
    setForm(null);
  };

  const handleSaved = async () => {
    setForm(null);
    await load();
  };

  const openHistory = async (person) => {
    setForm(null);
    setHistory({ person, items: [] });
    setHistoryLoading(true);

    try {
      const data = await getStructureHistory(person._id);

      setHistory({
        person,
        items: data.history || [],
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const removeRevision = async (item) => {
    if (
      !window.confirm(
        `Remove the salary revision from ${formatDate(item.effectiveFrom)}?`
      )
    ) {
      return;
    }

    try {
      await deleteStructure(item._id);

      toast.success("Salary revision removed");

      if (history?.person) {
        await openHistory(history.person);
      }

      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const missing = rows.filter(
    (row) => !row.current && !row.upcoming
  ).length;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Salary Structures
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Set each staff member's salary. Payroll cannot be generated
          for anyone without a salary.
        </p>
      </div>

      {/* Missing salary warning */}
      {missing > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {missing} staff member{missing > 1 ? "s have" : " has"} no
          salary set yet.
        </p>
      )}

      {/* Salary table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-slate-500">
            No staff found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Basic</th>
                  <th className="px-4 py-3 font-medium">
                    Monthly gross
                  </th>
                  <th className="px-4 py-3 font-medium">Deductions</th>
                  <th className="px-4 py-3 font-medium">Applies from</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map(({ user, current, upcoming }) => (
                  <Fragment key={user._id}>
                    {/* Staff row */}
                    <tr>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {user.name}
                        </p>
                        <p className="text-xs capitalize text-slate-500">
                          {user.role}
                        </p>
                      </td>

                      {current ? (
                        <>
                          <td className="px-4 py-3">
                            {formatINR(current.basic)}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {formatINR(current.grossMonthly)}
                          </td>

                          <td className="px-4 py-3">
                            <Flags s={current} />
                          </td>

                          <td className="px-4 py-3">
                            {formatDate(current.effectiveFrom)}

                            {upcoming && (
                              <p className="text-xs text-sky-600">
                                Next: {formatINR(upcoming.grossMonthly)} from{" "}
                                {formatDate(upcoming.effectiveFrom)}
                              </p>
                            )}
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-amber-600"
                        >
                          Salary not set

                          {upcoming && (
                            <span className="text-sky-600">
                              {" "}(starts{" "}
                              {formatDate(upcoming.effectiveFrom)})
                            </span>
                          )}
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {current ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  openForm(user, current, "revise")
                                }
                                className={outlineButton}
                              >
                                <Wallet size={15} />
                                Revise
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openForm(user, current, "edit")
                                }
                                aria-label="Edit current salary"
                                title="Correct the current revision"
                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                              >
                                <Pencil size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                openForm(user, null, "new")
                              }
                              className={primaryButton}
                            >
                              <Wallet size={15} />
                              Set salary
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openHistory(user)}
                            aria-label="Salary history"
                            title="Salary history"
                            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                          >
                            <History size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline form: only for the selected employee */}
                    {form?.person?._id === user._id && (
                      <tr key={`salary-form-${user._id}`}>
                        <td
                          colSpan={6}
                          className="bg-slate-50 p-3 sm:p-5"
                        >
                          <StructureFormModal
                            key={`${form.person._id}-${form.mode}`}
                            person={form.person}
                            structure={form.structure}
                            mode={form.mode}
                            onClose={closeForm}
                            onSaved={handleSaved}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salary History modal remains separate */}
      <Modal
        open={Boolean(history)}
        size="md"
        title="Salary History"
        subtitle={history?.person?.name}
        onClose={() => setHistory(null)}
        footer={
          <button
            type="button"
            onClick={() => setHistory(null)}
            className={outlineButton}
          >
            Close
          </button>
        }
      >
        {historyLoading ? (
          <div className="flex justify-center py-8 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : history?.items?.length === 0 ? (
          <p className="text-sm text-slate-500">
            No salary revisions yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {history?.items?.map((item) => (
              <li
                key={item._id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatINR(item.grossMonthly)} per month
                  </p>

                  <p className="text-xs text-slate-500">
                    From {formatDate(item.effectiveFrom)}, basic{" "}
                    {formatINR(item.basic)}
                    {item.note ? `, ${item.note}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeRevision(item)}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
};

export default SalaryStructures;
