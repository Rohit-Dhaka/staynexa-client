
import { useState } from "react";
import { ArrowLeft, Save, Receipt } from "lucide-react";
import toast from "react-hot-toast";
import { createExpense } from "../services/expenses.service.js";

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

const paymentMethods = [
  "Cash",
  "Card",
  "Bank Transfer",
  "UPI",
  "Other",
];

const initialForm = {
  title: "",
  category: "Other",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "Cash",
  vendor: "",
  description: "",
  receiptUrl: "",
  status: "Paid",
};

export default function ExpenseForm() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error("Expense title is required");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }

    setSaving(true);

    try {
      await createExpense({
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount),
      });

      toast.success("Expense created successfully");

      // Return to the expenses list after saving.
      window.location.assign("/expenses");
    } catch (error) {
      toast.error(error.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";


return (
  <div className="min-h-screen w-full ">
    <div className="w-full">
      <button
        type="button"
        onClick={() => navigate("/expenses")}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-indigo-600"
      >
        <ArrowLeft size={18} />
        Back to Expenses
      </button>

      <div className="mb-8 flex items-center gap-4">
        <div className="rounded-2xl bg-indigo-100 p-4 text-indigo-600">
          <Receipt size={28} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Add Expense
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter and manage your hotel expense details.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-10"
      >
        <div className="border-b border-slate-100 pb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Expense Information
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Fields marked with * are required.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <label className="text-sm font-medium text-slate-700">
              Expense Title *
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Electricity Bill"
              maxLength={150}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Category *
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Amount (INR) *
            </label>
            <input
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Expense Date *
            </label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={form.paymentMethod}
              onChange={handleChange}
              className={inputClass}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Vendor / Supplier
            </label>
            <input
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              placeholder="Vendor name"
              maxLength={150}
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">
              Payment Status
            </label>
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
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="text-sm font-medium text-slate-700">
              Receipt URL
            </label>
            <input
              name="receiptUrl"
              type="url"
              value={form.receiptUrl}
              onChange={handleChange}
              placeholder="https://example.com/receipt"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Add expense details..."
              rows={5}
              maxLength={1000}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/expenses")}
            className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save Expense"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

}
