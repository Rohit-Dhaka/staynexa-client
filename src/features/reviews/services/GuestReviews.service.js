

import api from "../../../api/axiosInstance.js";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const getEligibleBookings = () =>
  unwrap(api.get("/reviews/guest/eligible-bookings"));

export const getMyReviews = () =>
  unwrap(api.get("/reviews/guest/my"));

export const createGuestReview = (data) =>
  unwrap(api.post("/reviews/guest", data));
