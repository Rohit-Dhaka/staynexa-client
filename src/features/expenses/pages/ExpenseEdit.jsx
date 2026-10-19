
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  getExpenseById,
  updateExpense,
} from "../services/expenses.service";

const categories = [
  "Utilities",
  "Maintenance",
  "Supplies",
  "Food & Beverage",
  "Salaries",
  "Marketing",
  "Transport",
  "Other",
];

const paymentMethods = [
  "Cash",
  "Card",
  "Bank Transfer",
  "UPI",
  "Other",
];

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ExpenseEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "Other",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: "Cash",
    vendor: "",
    description: "",
    receiptUrl: "",
    status: "Paid",
  });

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const data = await getExpenseById(id);

        setForm({
          title: data.title || "",
          category: data.category || "Other",
          amount: data.amount ?? "",
          date: data.date ? new Date(data.date).toISOString().slice(0, 10) : "",
          paymentMethod: data.paymentMethod || "Cash",
          vendor: data.vendor || "",
          description: data.description || "",
          receiptUrl: data.receiptUrl || "",
          status: data.status || "Paid",
        });
      } catch (error) {
        toast.error(error.message || "Expense load nahi hua");
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || form.amount === "" || Number(form.amount) <= 0) {
      toast.error("Title aur valid amount enter karo");
      return;
    }

    setSaving(true);

    try {
      await updateExpense(id, {
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount),
      });

      toast.success("Expense successfully update ho gaya");
      navigate(`/expenses/${id}`);
    } catch (error) {
      toast.error(error.message || "Expense update nahi hua");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading expense...</div>;
  }

  return (
    <div className="w-full p-4 md:p-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(`/expenses/${id}`)}
          className="rounded-lg border p-2 hover:bg-slate-50"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit Expense</h1>
          <p className="text-sm text-slate-500">Update expense information</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Title *</span>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Category *</span>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputClass}
              required
            >
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Amount (₹) *</span>
            <input
              type="number"
              name="amount"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Date *</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Payment Method</span>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className={inputClass}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Status</span>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Vendor</span>
            <input
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Receipt URL</span>
            <input
              type="url"
              name="receiptUrl"
              value={form.receiptUrl}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://..."
            />
          </label>

          <label className="block md:col-span-2 xl:col-span-1">
            <span className="mb-1.5 block text-sm font-medium">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className={inputClass}
              rows={3}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={() => navigate(`/expenses/${id}`)}
            className="rounded-lg border px-4 py-2.5 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save size={17} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
