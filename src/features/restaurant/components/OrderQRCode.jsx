import { useState } from "react";

import {
  createOrderQr,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/restaurant.service";


import { loadRazorpay } from "../../../utils/loadRazorpay";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const getTrackingUrl = (data) =>
  data?.trackingUrl ||
  data?.tracking?.trackingUrl ||
  data?.url ||
  data?.tracking?.url ||
  "";

export default function OrderQRCode({
  orderId,
  orderNumber = "",
  amount = 0,
  onPaid,
}) {
  
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [trackingUrl, setTrackingUrl] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);

  const payableAmount = Number(amount) || 0;
  const busy = ["loading", "paying", "verifying"].includes(status);

  const handlePayNow = async () => {
    if (busy || !orderId) return;

    setError("");
    setNotice("");
    setStatus("loading");

    try {
      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error(
          "Unable to load the payment window. Check your internet connection or ad-blocker."
        );
      }

      // Amount server decide karta hai (order ka remaining balance)
      const paymentOrder = await createRazorpayOrder(orderId);

      const checkout = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        order_id: paymentOrder.razorpayOrderId,
        name: "StayNexa Restaurant",
        description: `Order ${paymentOrder.orderNumber || orderNumber}`,
        prefill: {
          name: paymentOrder.customerName || "",
          contact: paymentOrder.customerPhone || "",
        },
        theme: { color: "#111827" },

        handler: async (response) => {
          setStatus("verifying");

          try {
            await verifyRazorpayPayment(orderId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setStatus("paid");
            onPaid?.();
          } catch (err) {
            // Paisa kat chuka ho sakta hai, isliye guest ko saaf batao
            setStatus("idle");
            setNotice(
              "Your payment was received, but confirmation is still pending. Please refresh in a minute. If the order still shows unpaid, contact restaurant staff."
            );
            setError(
              err?.response?.data?.message ||
                err?.message ||
                "Payment confirmation failed."
            );
            onPaid?.();
          }
        },

        modal: {
          // Guest ne bina pay kiye window band kar di
          ondismiss: () => {
            setStatus((current) =>
              current === "verifying" || current === "paid"
                ? current
                : "idle"
            );
          },
        },
      });

      checkout.on("payment.failed", (response) => {
        setStatus("idle");
        setError(
          response?.error?.description ||
            "Payment failed. You can try again."
        );
      });

      setStatus("paying");
      checkout.open();
    } catch (err) {
      setStatus("idle");
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to start the payment. Please try again."
      );
    }
  };

  const handleGetTrackingLink = async () => {
    try {
      setTrackingLoading(true);
      setError("");

      const response = await createOrderQr(orderId);
      const url = getTrackingUrl(response);

      if (!url) throw new Error("The server did not return a tracking URL.");

      setTrackingUrl(url);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to generate the tracking link."
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const buttonLabel = {
    idle: `Pay ${formatCurrency(payableAmount)}`,
    loading: "Opening payment...",
    paying: "Complete payment in the window...",
    verifying: "Confirming payment...",
    paid: "Payment Completed",
  }[status];

  return (
    <section className="w-full rounded border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Pay for your order
        </h3>

        {orderNumber && (
          <p className="mt-0.5 text-xs text-gray-500">
            Order: <span className="font-medium">{orderNumber}</span>
          </p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {notice}
        </div>
      )}

      {status === "paid" ? (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 px-3 py-3 text-center text-sm font-medium text-emerald-700"
        >
          Payment completed. Thank you!
        </div>
      ) : payableAmount <= 0 ? (
        <p className="rounded border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-500">
          No amount is due for this order.
        </p>
      ) : (
        <>
          <button
            type="button"
            onClick={handlePayNow}
            disabled={busy || !orderId}
            className="w-full rounded bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>

          <p className="mt-2 text-center text-[11px] text-gray-500">
            Pay securely with UPI, card or net banking.
          </p>
        </>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3 text-center">
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-gray-900 underline"
          >
            Open Order Tracking
          </a>
        ) : (
          <button
            type="button"
            onClick={handleGetTrackingLink}
            disabled={trackingLoading || !orderId}
            className="text-xs font-semibold text-gray-900 underline disabled:opacity-50"
          >
            {trackingLoading ? "Generating..." : "Get Order Tracking Link"}
          </button>
        )}
      </div>
    </section>
  );
}