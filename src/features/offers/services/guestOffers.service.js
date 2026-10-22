
// import api from "../api/axiosInstance";
import api from "../../../api/axiosInstance";

const unwrap = (promise) => promise.then((res) => res.data.data);

export const getGuestOffers = () =>
  unwrap(api.get("/offers/guest/available"));

export const validateGuestCoupon = (data) =>
  unwrap(api.post("/offers/validate", data));
