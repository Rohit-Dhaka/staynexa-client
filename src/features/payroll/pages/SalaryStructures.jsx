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
  const [removingId, setRemovingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listStructures();
      setRows(Array.isArray(data) ? data : []);
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

    setRemovingId(item._id);
    try {
      await deleteStructure(item._id);
      toast.success("Salary revision removed");

      if (history?.person) {
        await openHistory(history.person);
      }

      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setRemovingId("");
    }
  };

  const missing = rows.filter((row) => !row.current && !row.upcoming).length;

  const renderActions = (user, current) => (
    <div className="flex flex-wrap items-center gap-2">
      {current ? (
        <>
          <button
            type="button"
            onClick={() => openForm(user, current, "revise")}
            className={`${outlineButton} min-h-10 flex-1 justify-center sm:flex-none`}
          >
            <Wallet size={15} />
            Revise
          </button>
          <button
            type="button"
            onClick={() => openForm(user, current, "edit")}
            aria-label="Edit current salary"
            title="Correct the current revision"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-200 p-2 text-slate-600"
          >
            <Pencil size={16} />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => openForm(user, null, "new")}
          className={`${primaryButton} min-h-10 flex-1 justify-center sm:flex-none`}
        >
          <Wallet size={15} />
          Set salary
        </button>
      )}
      <button
        type="button"
        onClick={() => openHistory(user)}
        aria-label={`Salary history for ${user.name}`}
        title="Salary history"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-slate-200 p-2 text-slate-600"
      >
        <History size={16} />
      </button>
    </div>
  );

  const renderSalaryDetails = (current, upcoming) => {
    if (!current) {
      return (
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-700">Salary not set</p>
          {upcoming && (
            <p className="mt-1 text-xs text-sky-700">
              Upcoming salary starts {formatDate(upcoming.effectiveFrom)} ·{" "}
              {formatINR(upcoming.grossMonthly)} per month
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Basic</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {formatINR(current.basic)}
          </p>
        </div>
        <div className="min-w-0 rounded border border-slate-200 p-3">
          <p className="text-xs text-slate-500">Monthly gross</p>
          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
            {formatINR(current.grossMonthly)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">Deductions</p>
          <Flags s={current} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xs text-slate-500">Applies from</p>
          <p className="break-words text-sm text-slate-800">
            {formatDate(current.effectiveFrom)}
          </p>
        </div>
        {upcoming && (
          <div className="col-span-2 rounded border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs font-medium text-sky-700">Upcoming revision</p>
            <p className="mt-1 break-words text-sm text-sky-800">
              {formatINR(upcoming.grossMonthly)} from {formatDate(upcoming.effectiveFrom)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
          Salary Structures
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Set each staff member's salary. Payroll cannot be generated for anyone without a salary.
        </p>
      </header>

      {missing > 0 && (
        <p className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {missing} staff member{missing > 1 ? "s have" : " has"} no salary set yet.
        </p>
      )}

      <section className="min-w-0 overflow-hidden rounded border border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 size={24} />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500 sm:py-16">
            No staff found.
          </p>
        ) : (
          <>
            <div className="space-y-3 p-3 sm:hidden">
              {rows.map(({ user, current, upcoming }) => (
                <article key={user._id} className="min-w-0 rounded border border-slate-200 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-sm font-semibold text-slate-900">
                        {user.name || "Unnamed staff"}
                      </h2>
                      <p className="mt-0.5 text-xs capitalize text-slate-500">
                        {user.role || "-"}
                      </p>
                    </div>
                    {current && (
                      <span className="shrink-0 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    {renderSalaryDetails(current, upcoming)}
                  </div>

                  {form?.person?._id === user._id && (
                    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3">
                      <StructureFormModal
                        key={`${form.person._id}-${form.mode}`}
                        person={form.person}
                        structure={form.structure}
                        mode={form.mode}
                        onClose={closeForm}
                        onSaved={handleSaved}
                      />
                    </div>
                  )}

                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {renderActions(user, current)}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Staff</th>
                    <th className="px-4 py-3 font-medium">Basic</th>
                    <th className="px-4 py-3 font-medium">Monthly gross</th>
                    <th className="px-4 py-3 font-medium">Deductions</th>
                    <th className="px-4 py-3 font-medium">Applies from</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(({ user, current, upcoming }) => (
                    <Fragment key={user._id}>
                      <tr>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs capitalize text-slate-500">{user.role}</p>
                        </td>

                        {current ? (
                          <>
                            <td className="px-4 py-3">{formatINR(current.basic)}</td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatINR(current.grossMonthly)}
                            </td>
                            <td className="px-4 py-3"><Flags s={current} /></td>
                            <td className="px-4 py-3">
                              {formatDate(current.effectiveFrom)}
                              {upcoming && (
                                <p className="mt-1 text-xs text-sky-600">
                                  Next: {formatINR(upcoming.grossMonthly)} from{" "}
                                  {formatDate(upcoming.effectiveFrom)}
                                </p>
                              )}
                            </td>
                          </>
                        ) : (
                          <td colSpan={4} className="px-4 py-3 text-amber-600">
                            Salary not set
                            {upcoming && (
                              <span className="text-sky-600">
                                {" "}(starts {formatDate(upcoming.effectiveFrom)})
                              </span>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            {renderActions(user, current)}
                          </div>
                        </td>
                      </tr>

                      {form?.person?._id === user._id && (
                        <tr key={`salary-form-${user._id}`}>
                          <td colSpan={6} className="bg-slate-50 p-3 sm:p-5">
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
          </>
        )}
      </section>

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
            <Loader2 size={24} />
          </div>
        ) : history?.items?.length === 0 ? (
          <p className="text-sm text-slate-500">No salary revisions yet.</p>
        ) : (
          <ul className="space-y-3">
            {history?.items?.map((item) => (
              <li
                key={item._id}
                className="flex min-w-0 flex-col gap-3 rounded border border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-slate-900">
                    {formatINR(item.grossMonthly)} per month
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-500">
                    From {formatDate(item.effectiveFrom)}, basic {formatINR(item.basic)}
                    {item.note ? `, ${item.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeRevision(item)}
                  disabled={removingId === item._id}
                  className="min-h-10 rounded border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 disabled:opacity-50 sm:shrink-0"
                >
                  {removingId === item._id ? "Removing..." : "Remove"}
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
