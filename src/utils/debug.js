
const DEBUG = import.meta.env.DEV;

export const debug = {
  log(step, data = {}) {
    if (!DEBUG) return;
    console.log(`🔍 [DEBUG] ${step}`, data);
  },

  success(step, data = {}) {
    if (!DEBUG) return;
    console.log(`✅ [SUCCESS] ${step}`, data);
  },

  warn(step, data = {}) {
    if (!DEBUG) return;
    console.warn(`⚠️ [WARNING] ${step}`, data);
  },

  error(step, error) {
    if (!DEBUG) return;
    console.error(`❌ [ERROR] ${step}`, {
      message: error?.message,
      status: error?.response?.status,
      response: error?.response?.data,
    });
  },
};
