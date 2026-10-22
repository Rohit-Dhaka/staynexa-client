
import api from "../../../api/axiosInstance";

const unwrap = (promise) =>
  promise.then((response) => response.data.data);

/**
 * Record a payment received by restaurant staff.
 *
 * payload:
 * {
 *   amount: 500,
 *   paymentMethod: "cash",
 *   transactionReference: "",
 *   notes: ""
 * }
 */
export const recordRestaurantPayment = (orderId, payload) =>
  unwrap(
    api.post(
      `/restaurant-payments/orders/${orderId}/record`,
      payload
    )
  );

/**
 * Get payment history for a restaurant order.
 */
export const getRestaurantPaymentHistory = (orderId) =>
  unwrap(
    api.get(
      `/restaurant-payments/orders/${orderId}/history`
    )
  );

/**
 * Get total amount, paid amount, balance, and payment status.
 */
export const getRestaurantPaymentSummary = (orderId) =>
  unwrap(
    api.get(
      `/restaurant-payments/orders/${orderId}/summary`
    )
  );
