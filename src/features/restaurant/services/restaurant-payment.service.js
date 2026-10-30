
import api from "../../../api/axiosInstance";

const unwrap = (promise) =>
  promise.then((response) => response.data.data);


export const recordRestaurantPayment = (orderId, payload) =>
  unwrap(
    api.post(
      `/restaurant-payments/orders/${orderId}/record`,
      payload
    )
  );

export const getRestaurantPaymentHistory = (orderId) =>
  unwrap(
    api.get(
      `/restaurant-payments/orders/${orderId}/history`
    )
  );


export const getRestaurantPaymentSummary = (orderId) =>
  unwrap(
    api.get(
      `/restaurant-payments/orders/${orderId}/summary`
    )
  );
