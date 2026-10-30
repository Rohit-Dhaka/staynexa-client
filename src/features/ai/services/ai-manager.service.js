import api from "../../../api/axiosInstance";



const BASE_URL = "/ai-manager";


const unwrap = (promise) =>
  promise.then((response) => {
    const result = response?.data;

    if (result?.success === false) {
      throw new Error(
        result.message || "Unable to complete the request."
      );
    }

    return result?.data ?? result;
  });


const handleError = (error) => {
  const message =
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again.";

  const normalizedError = new Error(message);

  normalizedError.status =
    error?.response?.status ?? null;

  normalizedError.code =
    error?.code ?? null;

  normalizedError.originalError = error;

  return normalizedError;
};

const request = async (promise) => {
  try {
    return await unwrap(promise);
  } catch (error) {
    throw handleError(error);
  }
};


const buildParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ""
    )
  );
};


export const getAIManagerStatus = () =>
  request(api.get(`${BASE_URL}/status`));

/**

 *
 * @param {Object} params
 * @param {string} params.date
 */
export const getHotelOverview = (params = {}) =>
  request(
    api.get(`${BASE_URL}/overview`, {
      params: buildParams(params),
    })
  );

/**
 * Get daily hotel intelligence report.
 *
 * GET /api/ai-manager/daily-report
 *
 * @param {Object} params
 * @param {string} params.date - Optional date in YYYY-MM-DD format
 */
export const getDailyHotelReport = (params = {}) =>
  request(
    api.get(`${BASE_URL}/daily-report`, {
      params: buildParams(params),
    })
  );


export const getAIManagerAlerts = () =>
  request(api.get(`${BASE_URL}/alerts`));

/**
 * Get department insights.
 *
 * GET /api/ai-manager/department-insights
 *
 * @param {Object} params
 * @param {string} params.date - Optional date in YYYY-MM-DD format
 */
export const getDepartmentInsights = (params = {}) =>
  request(
    api.get(`${BASE_URL}/department-insights`, {
      params: buildParams(params),
    })
  );

/**
 * Ask AI Hotel Manager a question.
 *
 * POST /api/ai-manager/ask
 *
 * @param {string} question
 */
export const askAIHotelManager = (question) => {
  if (typeof question !== "string" || !question.trim()) {
    return Promise.reject(
      new Error("Please enter a question.")
    );
  }

  if (question.trim().length > 2000) {
    return Promise.reject(
      new Error("Question must not exceed 2000 characters.")
    );
  }

  return request(
    api.post(`${BASE_URL}/ask`, {
      question: question.trim(),
    })
  );
};


const aiManagerService = {
  getAIManagerStatus,
  getHotelOverview,
  getDailyHotelReport,
  getAIManagerAlerts,
  getDepartmentInsights,
  askAIHotelManager,
};

export default aiManagerService;
