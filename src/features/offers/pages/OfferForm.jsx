
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import toast from "react-hot-toast";
import {
  createOffer,
  getOffer,
  updateOffer,
} from "../services/offer.service";

const initialForm = {
  name: "",
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "10",
  maxDiscount: "",
  minBookingAmount: "0",
  minNights: "1",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  perGuestLimit: "1",
};

const toDateTimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function OfferForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;

    let cancelled = false;

    const load = async () => {
      try {
        const offer = await getOffer(id);
        if (cancelled) return;

        setForm({
          ...initialForm,
          ...offer,
          discountValue: String(offer.discountValue ?? 10),
          maxDiscount: offer.maxDiscount == null ? "" : String(offer.maxDiscount),
          minBookingAmount: String(offer.minBookingAmount ?? 0),
          minNights: String(offer.minNights ?? 1),
          usageLimit: offer.usageLimit == null ? "" : String(offer.usageLimit),
          perGuestLimit: String(offer.perGuestLimit ?? 1),
          startsAt: toDateTimeLocal(offer.startsAt),
          endsAt: toDateTimeLocal(offer.endsAt),
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load offer");
        navigate("/offers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [editing, id, navigate]);

  const setField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      toast.error("End date must be after start date");
      return;
    }

    if (
      form.discountType === "PERCENTAGE" &&
      Number(form.discountValue) > 100
    ) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
      minBookingAmount: Number(form.minBookingAmount || 0),
      minNights: Number(form.minNights || 1),
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      perGuestLimit: Number(form.perGuestLimit || 1),
    };

    setSaving(true);

    try {
      if (editing) {
        await updateOffer(id, payload);
        toast.success("Offer updated successfully");
      } else {
        await createOffer(payload);
        toast.success("Offer created as draft");
      }

      navigate("/offers");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not save offer"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading offer...</div>;
  }

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400";
  const labelClass = "block text-sm font-medium text-slate-700";

  return (
    <main className="w-full min-w-0 space-y-6">
      <Link
        to="/offers"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={17} /> Back to offers
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {editing ? "Edit offer" : "Create offer"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure coupon rules, discount limits and validity.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Basic information
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Offer name *
              <input
                name="name"
                value={form.name}
                onChange={setField}
                required
                maxLength={120}
                placeholder="Summer Special"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Coupon code *
              <input
                name="code"
                value={form.code}
                onChange={setField}
                required
                minLength={3}
                maxLength={40}
                pattern="[A-Za-z0-9_-]+"
                placeholder="SUMMER20"
                className={`${inputClass} font-mono uppercase`}
              />
            </label>

            <label className={`${labelClass} md:col-span-2`}>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={setField}
                rows={3}
                maxLength={1000}
                placeholder="Describe this offer..."
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Discount rules
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>
              Discount type *
              <select
                name="discountType"
                value={form.discountType}
                onChange={setField}
                className={inputClass}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed amount (₹)</option>
              </select>
            </label>

            <label className={labelClass}>
              Discount value *
              <input
                type="number"
                name="discountValue"
                value={form.discountValue}
                onChange={setField}
                min="0.01"
                max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                step="0.01"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Maximum discount (₹)
              <input
                type="number"
                name="maxDiscount"
                value={form.maxDiscount}
                onChange={setField}
                min="0"
                step="0.01"
                placeholder="No maximum"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Minimum booking amount (₹)
              <input
                type="number"
                name="minBookingAmount"
                value={form.minBookingAmount}
                onChange={setField}
                min="0"
                step="0.01"
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Minimum stay (nights)
              <input
                type="number"
                name="minNights"
                value={form.minNights}
                onChange={setField}
                min="1"
                step="1"
                required
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Validity and usage
          </h2>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <label className={labelClass}>
              Starts at *
              <input
                type="datetime-local"
                name="startsAt"
                value={form.startsAt}
                onChange={setField}
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Ends at *
              <input
                type="datetime-local"
                name="endsAt"
                value={form.endsAt}
                onChange={setField}
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Total usage limit
              <input
                type="number"
                name="usageLimit"
                value={form.usageLimit}
                onChange={setField}
                min="1"
                step="1"
                placeholder="Unlimited"
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Uses per guest
              <input
                type="number"
                name="perGuestLimit"
                value={form.perGuestLimit}
                onChange={setField}
                min="1"
                step="1"
                required
                className={inputClass}
              />
            </label>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            New offers are saved as drafts. Activate them from the Offers
            dashboard after checking the details. Usage limits and per-guest
            redemption enforcement must be connected to successful bookings.
          </p>
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            to="/offers"
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : editing ? "Save changes" : "Create draft"}
          </button>
        </div>
      </form>
    </main>
  );
}
