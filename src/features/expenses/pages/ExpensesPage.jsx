import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Receipt,
  Wallet,
  Clock3,
  CheckCircle2,
  Pencil,
  Trash2,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CalendarDays,
  CreditCard,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import ExportButtons from "../../../components/common/ExportButtons";
import { getExpenses, deleteExpense } from "../services/expenses.service.js";

const categories = [
  "Utilities",
  "Maintenance",
  "Housekeeping",
  "Food & Beverage",
  "Salary",
  "Supplies",
  "Marketing",
  "Transportation",
  "Other",
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateText = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const statusStyle = {
  Paid: "bg-emerald-50 text-emerald-700",
  Pending: "bg-amber-50 text-amber-700",
  Cancelled: "bg-slate-100 text-slate-600",
};

const cx = (...classes) => classes.filter(Boolean).join(" ");

const expenseExportColumns = [
  { header: "Expense", value: (expense) => expense?.title || "Untitled expense" },
  { header: "Vendor", value: (expense) => expense?.vendor || "—" },
  { header: "Category", value: (expense) => expense?.category || "Other" },
  { header: "Date", value: (expense) => dateText(expense?.date) },
  { header: "Payment Method", value: (expense) => expense?.paymentMethod || "—" },
  { header: "Amount (INR)", value: (expense) => Number(expense?.amount) || 0 },
  { header: "Status", value: (expense) => expense?.status || "Unknown" },
  { header: "Description", value: (expense) => expense?.description || "—" },
];

const getExpenseRows = (result) => {
  if (Array.isArray(result?.expenses)) return result.expenses;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.expenses)) return result.data.expenses;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  return [];
};

const getExpenseSearchFields = (expense) => [
  expense?.title,
  expense?.vendor,
  expense?.category,
  expense?.paymentMethod,
  expense?.status,
];

export default function ExpensesPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadExpenses = useCallback(
    async ({ showRefresh = false, page = pagination.page } = {}) => {
      setLoading(true);
      if (showRefresh) setRefreshing(true);
      try {
        const result = await getExpenses({
          page,
          limit: pagination.limit,
          category: category || undefined,
          status: status || undefined,
        });
        const next = result?.pagination || {
          page,
          limit: pagination.limit,
          total: 0,
          totalPages: 0,
        };
        const rows = getExpenseRows(result);
        if (
          page > 1 &&
          rows.length === 0 &&
          next.total > 0 &&
          page > (next.totalPages || 1)
        ) {
          setPagination((old) => ({
            ...old,
            ...next,
            page: Math.max(1, next.totalPages || page - 1),
          }));
          return;
        }
        setExpenses(rows);
        setPagination((old) => ({ ...old, ...next, page: next.page || page }));
        if (showRefresh) toast.success("Expenses refreshed");
      } catch (error) {
        toast.error(error?.message || "Failed to load expenses");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, status, pagination.page, pagination.limit],
  );

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return expenses;
    return expenses.filter((expense) =>
      getExpenseSearchFields(expense).some((value) =>
        String(value || "").toLowerCase().includes(term),
      ),
    );
  }, [expenses, search]);

  const getAllFilteredExpenses = useCallback(async () => {
    const limit = 100;
    const allRows = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const result = await getExpenses({
        page: currentPage,
        limit,
        category: category || undefined,
        status: status || undefined,
      });
      const rows = getExpenseRows(result);
      allRows.push(...rows);
      const meta = result?.pagination ?? result?.meta ?? result?.data?.pagination ?? {};
      const reportedPages = Number(meta.totalPages ?? meta.pages ?? 1);
      totalPages = Number.isFinite(reportedPages) && reportedPages > 0 ? reportedPages : 1;
      if (rows.length === 0) break;
      currentPage += 1;
    } while (currentPage <= totalPages && currentPage <= 500);

    const term = search.trim().toLowerCase();
    if (!term) return allRows;
    return allRows.filter((expense) =>
      getExpenseSearchFields(expense).some((value) =>
        String(value || "").toLowerCase().includes(term),
      ),
    );
  }, [category, status, search]);

  const stats = useMemo(() => {
    const totalAmount = expenses.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const pending = expenses
      .filter((item) => item.status === "Pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paid = expenses.filter((item) => item.status === "Paid");
    return {
      total: totalAmount,
      pending,
      paidAmount: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidCount: paid.length,
    };
  }, [expenses]);

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("");
    setPagination((old) => ({ ...old, page: 1 }));
  };
  const hasFilters = Boolean(search || category || status);
  const page = pagination.page || 1;
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const total = pagination.total || 0;

  const confirmDelete = async () => {
    if (!selectedExpense?._id || deleting) return;
    setDeleting(true);
    try {
      await deleteExpense(selectedExpense._id);
      toast.success("Expense deleted successfully");
      setSelectedExpense(null);
      await loadExpenses({ page });
    } catch (error) {
      toast.error(error?.message || "Unable to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="w-full space-y-5 pb-8 text-slate-800">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            Finance / Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage and review your hotel expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButtons
            title="Hotel Expenses"
            fileName="hotel-expenses"
            columns={expenseExportColumns}
            getRows={getAllFilteredExpenses}
          />
          <button
            type="button"
            onClick={() => loadExpenses({ showRefresh: true })}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate("/expenses/new")}
            className="inline-flex items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={17} /> Add expense
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Expense amount" value={money(stats.total)} note="Current page" icon={Wallet} />
        <StatCard title="Total records" value={total.toLocaleString("en-IN")} note="Matching records" icon={Receipt} />
        <StatCard title="Pending amount" value={money(stats.pending)} note="Awaiting payment" icon={Clock3} />
        <StatCard title="Paid records" value={stats.paidCount.toLocaleString("en-IN")} note={money(stats.paidAmount) + " paid"} icon={CheckCircle2} />
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Expense records</h2>
              <p className="mt-1 text-sm text-slate-500">Search and filter your transactions.</p>
            </div>
            <span className="text-sm text-slate-500">{total.toLocaleString("en-IN")} records</span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_190px_170px_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
                placeholder="Search expenses..."
                aria-label="Search expenses"
                className="w-full rounded border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-600"
              />
            </div>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPagination((old) => ({ ...old, page: 1 }));
              }}
              aria-label="Filter category"
              className="rounded border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
            >
              <option value="">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((old) => ({ ...old, page: 1 }));
              }}
              aria-label="Filter status"
              className="rounded border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
            >
              <option value="">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasFilters}
              className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-3 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Expense</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-500"><span className="inline-flex items-center gap-2"><RefreshCw size={16}  /> Loading expenses...</span></td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Receipt size={25} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-800">{hasFilters ? "No matching expenses" : "No expenses yet"}</p>
                    <p className="mt-1 text-sm text-slate-500">{hasFilters ? "Try changing your search or filters." : "Add your first expense to get started."}</p>
                    {hasFilters ? (
                      <button type="button" onClick={resetFilters} className="mt-3 text-sm font-semibold text-indigo-600">Clear filters</button>
                    ) : (
                      <button type="button" onClick={() => navigate("/expenses/new")} className="mt-3 text-sm font-semibold text-indigo-600">+ Add expense</button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense._id} >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500"><Receipt size={17} /></span>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate text-sm font-semibold text-slate-900">{expense.title || "Untitled expense"}</p>
                          <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500">{expense.vendor || "No vendor"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{expense.category || "Other"}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14} className="text-slate-400" />{dateText(expense.date)}</span></td>
                    <td className="px-4 py-3.5 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><CreditCard size={14} className="text-slate-400" />{expense.paymentMethod || "—"}</span></td>
                    <td className="px-4 py-3.5 text-sm font-semibold tabular-nums text-slate-900">{money(expense.amount)}</td>
                    <td className="px-4 py-3.5"><span className={cx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusStyle[expense.status] || "bg-slate-100 text-slate-700")}>{expense.status || "Unknown"}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <ActionButton label="View" onClick={() => navigate(`/expenses/${expense._id}`)}><Eye size={16} /></ActionButton>
                        <ActionButton label="Edit" onClick={() => navigate(`/expenses/${expense._id}/edit`)}><Pencil size={16} /></ActionButton>
                        <ActionButton label="Delete" danger onClick={() => setSelectedExpense(expense)}><Trash2 size={16} /></ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-slate-500">Showing <span className="font-medium text-slate-700">{total ? (page - 1) * pagination.limit + 1 : 0}–{Math.min(page * pagination.limit, total)}</span> of <span className="font-medium text-slate-700">{total}</span></p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPagination((old) => ({ ...old, page: Math.max(1, old.page - 1) }))} className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40"><ChevronLeft size={15} /> Previous</button>
            <span className="px-2 text-sm text-slate-600">{page} / {totalPages}</span>
            <button type="button" disabled={loading || page >= (pagination.totalPages || 0)} onClick={() => setPagination((old) => ({ ...old, page: old.page + 1 }))} className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-sm font-medium disabled:opacity-40">Next <ChevronRight size={15} /></button>
          </div>
        </footer>
      </section>

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) setSelectedExpense(null); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-rose-50 text-rose-600"><AlertTriangle size={19} /></span>
              <div><h2 id="delete-title" className="font-semibold text-slate-900">Delete expense?</h2><p className="mt-1 text-sm text-slate-500">This action cannot be undone.</p></div>
              <button type="button" onClick={() => setSelectedExpense(null)} disabled={deleting} aria-label="Close" className="ml-auto rounded p-1 text-slate-400 disabled:opacity-40"><X size={17} /></button>
            </div>
            <div className="mt-4 rounded bg-slate-50 p-3"><p className="text-sm font-medium text-slate-800">{selectedExpense.title || "Untitled expense"}</p><p className="mt-1 text-sm text-slate-500">{money(selectedExpense.amount)}</p></div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={deleting} onClick={() => setSelectedExpense(null)} className="rounded border border-slate-200 px-3.5 py-2 text-sm font-medium">Cancel</button>
              <button type="button" disabled={deleting} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60">{deleting && <RefreshCw size={14}  />}{deleting ? "Deleting..." : "Delete expense"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({ title, value, note, icon: Icon }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-blue-100 text-indigo-600"><Icon size={18} /></span>
      </div>
    </article>
  );
}

function ActionButton({ label, onClick, children, danger = false }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={cx("inline-flex h-8 w-8 items-center justify-center rounded focus:outline-none", danger ? "text-rose-600" : "text-slate-500")}>{children}</button>
  );
}
