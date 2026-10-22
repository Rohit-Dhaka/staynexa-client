const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let loadingPromise = null;

export const loadRazorpay = () => {
  
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(true);
  }

  
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    const script = document.createElement("script");

    script.src = CHECKOUT_SRC;
    script.async = true;

    script.onload = () => resolve(true);

    script.onerror = () => {
      
      loadingPromise = null;
      script.remove();
      resolve(false);
    };

    document.body.appendChild(script);
  });

  return loadingPromise;
};