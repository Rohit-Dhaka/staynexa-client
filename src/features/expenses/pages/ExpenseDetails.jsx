
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { getExpenseById } from "../services/expenses.service";

export default function ExpenseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const data = await getExpenseById(id);
        setExpense(data);
      } catch (error) {
        toast.error(error.message || "Expense load nahi hua");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading expense...</div>;
  }

  if (!expense) {
    return (
      <div className="p-6">
        <p>Expense nahi mila.</p>
        <button
          onClick={() => navigate("/expenses")}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white"
        >
          Back to Expenses
        </button>
      </div>
    );
  }

  const fields = [
    ["Title", expense.title],
    ["Category", expense.category],
    ["Amount", `₹${Number(expense.amount || 0).toLocaleString("en-IN")}`],
    ["Date", expense.date ? new Date(expense.date).toLocaleDateString("en-IN") : "—"],
    ["Payment Method", expense.paymentMethod],
    ["Vendor", expense.vendor],
    ["Status", expense.status],
    ["Description", expense.description],
  ];

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/expenses")}
            className="rounded-lg border p-2 hover:bg-slate-50"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Expense Details
            </h1>
            <p className="text-sm text-slate-500">
              View expense information
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/expenses/${id}/edit`)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Pencil size={16} /> Edit Expense
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{expense.title}</h2>
            <p className="text-sm text-slate-500">{expense.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="mb-1 text-sm text-slate-500">{label}</p>
              <p className="break-words font-medium text-slate-900">
                {value || "—"}
              </p>
            </div>
          ))}
        </div>

        {expense.receiptUrl && (
          <div className="mt-6">
            <a
              href={expense.receiptUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              View Receipt
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
