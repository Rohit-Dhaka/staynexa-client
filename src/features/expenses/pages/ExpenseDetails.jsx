import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { getExpenseById } from "../services/expenses.service";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to load the expense. Please try again.";

const getExpense = (response) =>
  response?.expense || response?.data?.expense || response?.data || response;

export default function ExpenseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchExpense = async () => {
      setLoading(true);

      try {
        const response = await getExpenseById(id);
        const result = getExpense(response);

        if (isMounted) {
          setExpense(result && typeof result === "object" ? result : null);
        }
      } catch (error) {
        if (isMounted) {
          setExpense(null);
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchExpense();
    } else {
      setExpense(null);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="w-full p-4 md:p-6" aria-live="polite">
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading expense details...
        </div>
      </main>
    );
  }

  if (!expense || typeof expense !== "object") {
    return (
      <main className="w-full p-4 md:p-6">
        <section className="rounded border border-slate-200 bg-white p-6">
          <h1 className="text-xl font-bold text-slate-900">Expense Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">
            The expense could not be found or may no longer be available.
          </p>
          <button
            type="button"
            onClick={() => navigate("/expenses")}
            className="mt-4 inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
          >
            <ArrowLeft size={16} />
            Back to Expenses
          </button>
        </section>
      </main>
    );
  }

  const fields = [
    ["Title", expense.title],
    ["Category", expense.category],
    ["Amount", formatCurrency(expense.amount)],
    ["Date", formatDate(expense.date)],
    ["Payment Method", expense.paymentMethod],
    ["Vendor", expense.vendor],
    ["Status", expense.status],
    ["Description", expense.description],
  ];

  return (
    <main className="w-full p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/expenses")}
              className="inline-flex shrink-0 items-center justify-center rounded border border-slate-300 bg-white p-2 text-slate-700"
              aria-label="Back to expenses"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">Expense Details</h1>
              <p className="mt-1 text-sm text-slate-500">View expense information.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/expenses/${id}/edit`)}
            className="inline-flex items-center justify-center gap-2 rounded border border-slate-900 bg-black px-4 py-2.5 text-sm font-medium text-white"
          >
            <Pencil size={16} />
            Edit Expense
          </button>
        </header>

        <section className="rounded border border-slate-200 bg-white p-4 sm:p-6">
          <div className="mb-5 flex min-w-0 items-center gap-3 border-b border-slate-200 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-700">
              <Receipt size={24} />
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-lg font-semibold text-slate-900">
                {expense.title || "Untitled Expense"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {expense.category || "Uncategorized"}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="mb-1 text-sm text-slate-500">{label}</dt>
                <dd className="break-words whitespace-pre-wrap font-medium text-slate-900">
                  {value !== null && value !== undefined && String(value).trim() !== ""
                    ? value
                    : "—"}
                </dd>
              </div>
            ))}
          </dl>

          {expense.receiptUrl && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <a
                href={expense.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 underline underline-offset-2"
              >
                <Receipt size={16} />
                View Receipt
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
