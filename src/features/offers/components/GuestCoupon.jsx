
import { useEffect, useState } from "react";
import { Tag, TicketPercent, CheckCircle2, XCircle } from "lucide-react";
// import { getGuestOffers, validateGuestCoupon } from "../../services/guestOffers.service";
import { getGuestOffers, validateGuestCoupon } from "../services/guestOffers.service";

export default function GuestCoupon({
  subtotal,
  nights,
  roomTypeId,
  onCouponApplied,
}) {
  const [offers, setOffers] = useState([]);
  const [code, setCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    getGuestOffers()
      .then((data) => {
        if (active) setOffers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError("Offers load nahi ho sake.");
      })
      .finally(() => {
        if (active) setLoadingOffers(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const applyCoupon = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!code.trim()) {
      setError("Coupon code enter karein.");
      return;
    }

    setValidating(true);

    try {
      const result = await validateGuestCoupon({
        code: code.trim().toUpperCase(),
        subtotal: Number(subtotal),
        nights: Number(nights),
        roomTypeId,
      });

      setAppliedCoupon(result);
      setSuccess(`Coupon ${result.code} apply ho gaya!`);
      onCouponApplied?.(result);
    } catch (err) {
      setAppliedCoupon(null);
      onCouponApplied?.(null);
      setError(
        err?.response?.data?.message || "Coupon apply nahi ho saka."
      );
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCode("");
    setError("");
    setSuccess("");
    onCouponApplied?.(null);
  };

  return (
    <section className="space-y-4 rounded border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="rounded bg-black p-3 text-blue-600">
          <TicketPercent size={22} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Offers & Coupons</h3>
          <p className="text-sm text-slate-500">
            Save on your next stay
          </p>
        </div>
      </div>

      <form onSubmit={applyCoupon} className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          maxLength={40}
          disabled={validating || Boolean(appliedCoupon)}
          className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {appliedCoupon ? (
          <button
            type="button"
            onClick={removeCoupon}
            className="rounded border border-slate-300 px-4 text-sm font-semibold"
          >
            Remove
          </button>
        ) : (
          <button
            type="submit"
            disabled={validating}
            className="rounded bg-black px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-60"
          >
            {validating ? "Checking..." : "Apply"}
          </button>
        )}
      </form>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600">
          <XCircle size={16} /> {error}
        </p>
      )}

      {success && (
        <p role="status" className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} /> {success}
        </p>
      )}

      {appliedCoupon && (
        <div className="rounded bg-green-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-slate-600">Coupon discount</span>
            <strong className="text-green-700">
              -₹{Number(appliedCoupon.discount).toFixed(2)}
            </strong>
          </div>
          <div className="mt-2 flex justify-between gap-3">
            <span className="text-slate-600">Preview final amount</span>
            <strong>
              ₹{Number(appliedCoupon.finalAmount).toFixed(2)}
            </strong>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-800">
          Available offers
        </h4>

        {loadingOffers ? (
          <p className="text-sm text-slate-500">Offers load ho rahe hain...</p>
        ) : offers.length === 0 ? (
          <p className="text-sm text-slate-500">
            Abhi koi active offer available nahi hai.
          </p>
        ) : (
          offers.map((offer) => (
            <div
              key={offer._id}
              className="flex items-start justify-between gap-3 rounded border border-dashed border-blue-200 bg-black/50 p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{offer.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {offer.description || "Special offer on your booking"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Min. booking ₹{offer.minBookingAmount}
                  {" · "}
                  Min. {offer.minNights} night(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCode(offer.code);
                  setError("");
                  setSuccess("");
                }}
                className="flex shrink-0 items-center gap-1 rounded border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-black"
              >
                <Tag size={14} />
                {offer.code}
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
