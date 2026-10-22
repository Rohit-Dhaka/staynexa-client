
import api from "../../../api/axiosInstance";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? {};

const asList = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

const getTotal = (data) => {
  const candidates = [
    data?.total,
    data?.meta?.total,
    data?.pagination?.total,
    data?.pagination?.totalItems,
    data?.count,
  ];

  const value = candidates.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      Number.isFinite(Number(item))
  );

  return value === undefined ? null : Number(value);
};

const requestModule = async (
  name,
  request,
  normalize = (data) => data
) => {
  try {
    const response = await request();

    return {
      name,
      ok: true,
      data: normalize(unwrap(response)),
      error: null,
    };
  } catch (error) {
    console.error(`[SuperAdminDashboard] ${name} failed`, {
      status: error.response?.status,
      message: error.response?.data?.message,
      response: error.response?.data,
    });

    return {
      name,
      ok: false,
      data: null,
      error:
        error.response?.data?.message ||
        error.message ||
        "Unable to load this module.",
    };
  }
};

const listModule = (name, request, keys = []) =>
  requestModule(name, request, (data) => ({
    items: asList(data, keys),
    total: getTotal(data),
    raw: data,
  }));

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getDashboardData = async () => {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Each request is a function so it does not start immediately.
  const requests = [
    () =>
      requestModule("rooms", () =>
        api.get("/rooms/summary")
      ),

    () =>
      listModule(
        "bookings",
        () =>
          api.get("/bookings", {
            params: { page: 1, limit: 10 },
          }),
        ["bookings", "items", "results"]
      ),

    () =>
      listModule(
        "guests",
        () =>
          api.get("/guests", {
            params: { page: 1, limit: 10 },
          }),
        ["guests", "items", "results"]
      ),

    () =>
      requestModule("frontDesk", () =>
        api.get("/front-desk/overview")
      ),

    () =>
      requestModule("payments", () =>
        api.get("/payments/summary")
      ),

    () =>
      requestModule("revenue", () =>
        api.get("/billing/revenue", {
          params: { month, year },
        })
      ),

    () =>
      listModule(
        "bills",
        () =>
          api.get("/billing", {
            params: { page: 1, limit: 10 },
          }),
        ["bills", "items", "results"]
      ),

    () =>
      listModule(
        "staff",
        () =>
          api.get("/staff", {
            params: { page: 1, limit: 10 },
          }),
        ["staff", "items", "results"]
      ),

    () =>
      requestModule("attendance", () =>
        api.get("/attendance/monthly", {
          params: { month, year },
        })
      ),

    () =>
      requestModule("payroll", () =>
        api.get("/payroll/summary", {
          params: {
            period: `${year}-${String(month).padStart(2, "0")}`,
          },
        })
      ),

    () =>
      requestModule("banquet", () =>
        api.get("/banquet/summary")
      ),

    () =>
      listModule(
        "housekeeping",
        () =>
          api.get("/housekeeping", {
            params: { page: 1, limit: 10 },
          }),
        ["tasks", "items", "results"]
      ),

    () =>
      requestModule("guestRequests", () =>
        api.get("/guest-requests/summary")
      ),

    () =>
      requestModule("reviews", () =>
        api.get("/reviews/summary")
      ),

    () =>
      listModule(
        "offers",
        () =>
          api.get("/offers", {
            params: { page: 1, limit: 10 },
          }),
        ["offers", "items", "results"]
      ),

    () =>
      listModule(
        "expenses",
        () =>
          api.get("/expenses", {
            params: { page: 1, limit: 10 },
          }),
        ["expenses", "items", "results"]
      ),
  ];

  const results = [];

  // Run requests sequentially to reduce request bursts.
  for (const request of requests) {
    results.push(await request());
    await sleep(400);
  }

  const [
    rooms,
    bookings,
    guests,
    frontDesk,
    payments,
    revenue,
    bills,
    staff,
    attendance,
    payroll,
    banquet,
    housekeeping,
    guestRequests,
    reviews,
    offers,
    expenses,
  ] = results;

  return {
    rooms,
    bookings,
    guests,
    frontDesk,
    payments,
    revenue,
    bills,
    staff,
    attendance,
    payroll,
    banquet,
    housekeeping,
    guestRequests,
    reviews,
    offers,
    expenses,

    failedModules: results.filter((item) => !item.ok).length,
    totalModules: results.length,
    generatedAt: new Date().toISOString(),
    period: { month, year },
  };
};
