import api from "../../../api/axiosInstance";

/**
 * Super Admin Dashboard Service
 * Har API independently load hoti hai.
 * Ek API fail hone par baaki dashboard data load ho sakta hai.
 */

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? null;

const getLocalDateKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const safeGet = async (key, url, params) => {
  try {
    const response = await api.get(
      url,
      params ? { params } : undefined
    );

    return {
      ok: true,
      data: unwrap(response),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error:
        error?.response?.data?.message ||
        error?.message ||
        `Unable to load ${key}`,
    };
  }
};

/**
 * Dashboard ki sabhi required GET APIs.
 */
export const getDashboardData = async () => {
  const today = getLocalDateKey();

  const requests = [
    ["frontDesk", "/front-desk/overview"],

    ["rooms", "/rooms/summary"],

    ["bookings", "/bookings", {
      page: 1,
      limit: 100,
    }],

    ["payments", "/payments/summary"],

    ["revenue", "/billing/revenue"],

    ["expenses", "/expenses", {
      page: 1,
      limit: 100,
    }],

    ["housekeepingSummary", "/housekeeping/summary"],

    ["housekeeping", "/housekeeping", {
      page: 1,
      limit: 100,
    }],

    ["banquet", "/banquet/summary"],

    ["banquetBookings", "/banquet/bookings", {
      page: 1,
      limit: 100,
    }],

    ["staff", "/staff", {
      page: 1,
      limit: 100,
    }],

    ["attendanceToday", "/attendance/daily", {
      date: today,
    }],

    ["leaves", "/attendance/leaves", {
      status: "PENDING",
      page: 1,
      limit: 100,
    }],

 [
  "payroll",
  "/payroll/summary",
  {
    period: `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`,
  },
],
    ["payrollList", "/payroll", {
      page: 1,
      limit: 100,
    }],

    ["guests", "/guests", {
      page: 1,
      limit: 100,
    }],

    ["offers", "/offers", {
      page: 1,
      limit: 100,
    }],
  ];

  const responses = await Promise.all(
    requests.map(async ([key, url, params]) => {
      const result = await safeGet(
        key,
        url,
        params
      );

      return [key, result];
    })
  );

  return Object.fromEntries(responses);
};