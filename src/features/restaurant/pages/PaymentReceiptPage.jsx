
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getRestaurantPaymentHistory,
} from "../services/restaurant-payment.service";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getStatusStyle = (status) => {
  switch (status) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-200";
    case "partial":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "pending":
    case "unpaid":
      return "bg-red-50 text-red-700 border-red-200";
    case "refunded":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export default function PaymentReceiptPage() {
  const { orderId } = useParams();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadReceipt = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getRestaurantPaymentHistory(orderId);

        if (active) {
          setReceipt(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Unable to load payment details."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (orderId) {
      loadReceipt();
    } else {
      setError("Order ID is missing.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            Loading payment receipt...
          </p>
        </div>
      </main>
    );
  }

  if (error || !receipt?.order) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded border border-red-200 bg-white p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Receipt Unavailable
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error || "Payment receipt could not be found."}
          </p>
        </div>
      </main>
    );
  }

  const { order, payments = [] } = receipt;

  const paymentStatus = String(
    order.paymentStatus || "unpaid"
  ).toLowerCase();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <section className="rounded border border-gray-200 bg-white p-5 sm:p-8">
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
                paymentStatus === "paid"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-gray-200 bg-gray-50 text-gray-600"
              }`}
            >
              {paymentStatus === "paid" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-8 w-8"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-8 w-8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path
                    d="M12 7v5l3 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {paymentStatus === "paid"
                ? "Payment Successful"
                : paymentStatus === "partial"
                  ? "Partial Payment"
                  : paymentStatus === "refunded"
                    ? "Payment Refunded"
                    : "Payment Pending"}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Restaurant payment receipt
            </p>

            <span
              className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase ${getStatusStyle(
                paymentStatus
              )}`}
            >
              {paymentStatus}
            </span>
          </div>

          <div className="mt-8 rounded border border-gray-200 p-4 sm:p-5">
            <p className="text-sm text-gray-500">
              Order Number
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {order.orderNumber || "N/A"}
            </p>

            <div className="my-4 border-t border-gray-100" />

            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-gray-500">
                Total Bill
              </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-gray-500">
                Amount Paid
              </span>
              <span className="font-semibold text-green-700">
                {formatCurrency(order.paidAmount)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-gray-500">
                Balance Due
              </span>
              <span className="font-semibold text-red-600">
                {formatCurrency(order.balanceAmount)}
              </span>
            </div>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-bold text-gray-900">
              Payment History
            </h2>

            {payments.length === 0 ? (
              <div className="mt-4 rounded border border-gray-200 p-5 text-center">
                <p className="text-sm text-gray-500">
                  No payments have been recorded for this order.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {payments.map((payment) => (
                  <article
                    key={payment._id}
                    className="rounded border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold capitalize text-gray-900">
                          {String(
                            payment.paymentMethod || "unknown"
                          ).replace("_", " ")}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(
                            payment.paidAt || payment.createdAt
                          )}
                        </p>
                      </div>

                      <p className="font-bold text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                          payment.paymentStatus === "completed"
                            ? "paid"
                            : payment.paymentStatus
                        )}`}
                      >
                        {payment.paymentStatus}
                      </span>

                      {payment.transactionReference && (
                        <p className="break-all text-xs text-gray-500">
                          Reference: {payment.transactionReference}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="mt-8 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
            This receipt displays payment records available in
            the restaurant system.
          </p>
        </section>
      </div>
    </main>
  );
}
