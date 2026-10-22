
import { useState } from "react";
import { recordRestaurantPayment } from "../services/restaurant-payment.service";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function RecordRestaurantPayment({
  order,
  onPaymentRecorded,
  onCancel,
}) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const totalAmount = Number(order?.totalAmount || 0);
  const paidAmount = Number(order?.paidAmount || 0);
  const balanceAmount = Math.max(
    0,
    Number(
      order?.balanceAmount ??
        totalAmount - paidAmount
    )
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (paymentAmount > balanceAmount + 0.001) {
      setError(
        `The payment cannot exceed the remaining balance of ${formatCurrency(balanceAmount)}.`
      );
      return;
    }

    setLoading(true);

    try {
      const response = await recordRestaurantPayment(
        order._id || order.id,
        {
          amount: paymentAmount,
          paymentMethod,
          transactionReference: transactionReference.trim(),
          notes: notes.trim(),
        }
      );

      setResult(response);
      setAmount("");
      setTransactionReference("");
      setNotes("");

      if (onPaymentRecorded) {
        await onPaymentRecorded(response);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to record the payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!order?._id && !order?.id) {
    return (
      <div className="rounded border border-red-200 p-4 text-sm text-red-700">
        A valid restaurant order is required.
      </div>
    );
  }

  return (
    <section className="w-full max-w-xl rounded border border-gray-200 bg-white p-5 text-gray-900 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">
            Record Payment
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Order {order.orderNumber || "—"}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Close
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Total Bill</p>
          <p className="mt-1 font-semibold">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        <div className="rounded border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="mt-1 font-semibold text-green-700">
            {formatCurrency(paidAmount)}
          </p>
        </div>

        <div className="rounded border border-gray-200 p-3">
          <p className="text-xs text-gray-500">Balance Due</p>
          <p className="mt-1 font-semibold text-red-600">
            {formatCurrency(balanceAmount)}
          </p>
        </div>
      </div>

      {result && (
        <div
          role="status"
          className="mt-5 rounded border border-green-200 bg-green-50 p-4"
        >
          <p className="font-semibold text-green-800">
            Payment recorded successfully
          </p>
          <p className="mt-1 text-sm text-green-700">
            {formatCurrency(result.payment?.amount)} received.
          </p>
          {result.summary && (
            <div className="mt-3 space-y-1 text-sm text-green-800">
              <p>
                Paid: {formatCurrency(result.summary.paidAmount)}
              </p>
              <p>
                Remaining: {formatCurrency(result.summary.balanceAmount)}
              </p>
              <p>
                Status: {result.summary.paymentStatus}
              </p>
            </div>
          )}
        </div>
      )}

      {balanceAmount <= 0 ? (
        <div className="mt-5 rounded border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          This order is fully paid. No additional payment is due.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="payment-amount"
              className="mb-1.5 block text-sm font-medium"
            >
              Payment Amount (INR)
            </label>
            <input
              id="payment-amount"
              type="number"
              min="0.01"
              max={balanceAmount}
              step="0.01"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount received"
              className="w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="mb-1.5 block text-sm font-medium"
            >
              Payment Method
            </label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-3 outline-none focus:border-gray-900"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="online">Online</option>
            </select>
          </div>

          {paymentMethod !== "cash" && (
            <div>
              <label
                htmlFor="transaction-reference"
                className="mb-1.5 block text-sm font-medium"
              >
                Transaction Reference
              </label>
              <input
                id="transaction-reference"
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(event.target.value)
                }
                maxLength={150}
                placeholder="Enter transaction reference"
                className="w-full rounded border border-gray-300 px-3 py-3 outline-none focus:border-gray-900"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="payment-notes"
              className="mb-1.5 block text-sm font-medium"
            >
              Notes (Optional)
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add payment notes"
              className="w-full resize-y rounded border border-gray-300 px-3 py-3 outline-none focus:border-gray-900"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || balanceAmount <= 0}
            className="w-full rounded bg-gray-900 px-4 py-3 font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Recording Payment..." : "Record Payment"}
          </button>

          <p className="text-xs text-gray-500">
            Record only payments that have actually been received.
          </p>
        </form>
      )}
    </section>
  );
}
