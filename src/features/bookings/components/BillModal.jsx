import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { getBill, addCharge, voidCharge, setDiscount, updateBillTo } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, SectionTitle, inputClass } from "./formUi";
import { CHARGE_CATEGORIES, formatINR, getErrorMessage } from "../utils/bookingUi";

const smallBtn =
  "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60";

const BillModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);

  const [charge, setCharge] = useState({ category: "food", description: "", quantity: "1", unitPrice: "", taxPercent: "" });
  const [voiding, setVoiding] = useState({ id: "", reason: "" });
  const [discount, setDiscountForm] = useState({ amount: "", reason: "" });
  const [billTo, setBillTo] = useState({ companyName: "" });

  const hydrate = (b) => {
    setBill(b);
    setDiscountForm({
      amount: b.discountAmount ? String(b.discountAmount) : "",
      reason: b.discountReason || "",
    });
    setBillTo({ companyName: b.billTo?.companyName || "" });
  };

  useEffect(() => {
    getBill(booking._id)
      .then(hydrate)
      .catch((err) => setError(getErrorMessage(err)));
  }, [booking._id]);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      const result = await fn();
      hydrate(result);
      setChanged(true);
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const close = () => (changed ? onDone() : onClose());

  const submitCharge = async () => {
    if (!charge.description.trim()) return setError("Description likho");
    if (!(Number(charge.unitPrice) >= 0) || charge.unitPrice === "") return setError("Price likho");

    const payload = {
      category: charge.category,
      description: charge.description.trim(),
      quantity: Number(charge.quantity) || 1,
      unitPrice: Number(charge.unitPrice),
    };
    if (isManager && charge.taxPercent !== "") payload.taxPercent = Number(charge.taxPercent);

    const ok = await run(() => addCharge(booking._id, payload));
    if (ok) setCharge({ ...charge, description: "", quantity: "1", unitPrice: "", taxPercent: "" });
  };

  const submitVoid = async () => {
    if (!voiding.reason.trim()) return setError("Reason for Voiding (Required)");
    const ok = await run(() => voidCharge(booking._id, voiding.id, voiding.reason.trim()));
    if (ok) setVoiding({ id: "", reason: "" });
  };

  const submitDiscount = () => {
    const amount = Number(discount.amount) || 0;
    if (amount > 0 && !discount.reason.trim()) return setError("Reason  of Discount");
    return run(() => setDiscount(booking._id, { amount, reason: discount.reason.trim() }));
  };

  const submitBillTo = () => run(() => updateBillTo(booking._id, { companyName: billTo.companyName }));

  const editable = bill?.status === "draft";
  const categories = CHARGE_CATEGORIES.filter((c) => isManager || c.staff);

  return (
  
<Modal
  open
  size="lg"
  title="Bill & Charges"
  subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
  onClose={close}
  busy={busy}
  footer={
    <button
      type="button"
      onClick={close}
      className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Close
    </button>
  }
>
  <ErrorBox message={error} />

  {!bill && !error && (
    <div className="flex justify-center py-10 text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  )}

  {bill && (
    <>
      {!editable && (
        <NoteBox tone="warn">
          This bill has been {bill.status} and can no longer be modified.
        </NoteBox>
      )}

      {booking.openEnded && editable && (
        <NoteBox tone="warn">
          This is an "Open-Ended Check-out" booking. The current total
          includes only the first night and any additional charges. The
          final bill will be generated at check-out.
        </NoteBox>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">GST</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>

          <tbody>
            {bill.lineItems.map((item) => (
              <tr
                key={item._id}
                className={`border-t border-slate-100 ${
                  item.isVoided ? "text-slate-400 line-through" : ""
                }`}
              >
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2 text-right">{item.quantity}</td>
                <td className="px-3 py-2 text-right">
                  {formatINR(item.amount)}
                </td>
                <td className="px-3 py-2 text-right">
                  {item.taxPercent}%
                </td>
                <td className="px-3 py-2 text-right">
                  {editable &&
                    !item.isVoided &&
                    item.category !== "room" && (
                      <button
                        type="button"
                        onClick={() =>
                          setVoiding({ id: item._id, reason: "" })
                        }
                        className="text-xs font-medium text-rose-600 hover:underline"
                      >
                        Void
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {voiding.id && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-rose-50 p-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Reason for Voiding">
              <input
                value={voiding.reason}
                onChange={(e) =>
                  setVoiding({ ...voiding, reason: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={submitVoid}
            disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            Void Charge
          </button>

          <button
            type="button"
            onClick={() => setVoiding({ id: "", reason: "" })}
            className="px-2 py-2 text-sm text-slate-600"
          >
            Keep Charge
          </button>
        </div>
      )}

      <div className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span>{formatINR(bill.subtotal)}</span>
        </div>

        {bill.discountAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-500">Discount</span>
            <span>-{formatINR(bill.discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span className="text-slate-500">GST</span>
          <span>{formatINR(bill.taxTotal)}</span>
        </div>

        <div className="flex justify-between border-t border-slate-100 pt-1.5 text-base font-semibold text-slate-900">
          <span>Grand Total</span>
          <span>{formatINR(bill.grandTotal)}</span>
        </div>
      </div>

      {editable && (
        <>
          <SectionTitle hint="GST is applied automatically based on the selected category.">
            Add New Charge
          </SectionTitle>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Category">
              <select
                value={charge.category}
                onChange={(e) =>
                  setCharge({ ...charge, category: e.target.value })
                }
                className={inputClass}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="col-span-2">
              <Field label="Description">
                <input
                  value={charge.description}
                  onChange={(e) =>
                    setCharge({ ...charge, description: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Quantity">
              <input
                type="number"
                min="1"
                value={charge.quantity}
                onChange={(e) =>
                  setCharge({ ...charge, quantity: e.target.value })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Unit Price">
              <input
                type="number"
                min="0"
                value={charge.unitPrice}
                onChange={(e) =>
                  setCharge({ ...charge, unitPrice: e.target.value })
                }
                className={inputClass}
              />
            </Field>

            {isManager && (
              <Field label="GST % (Leave blank for automatic)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={charge.taxPercent}
                  onChange={(e) =>
                    setCharge({ ...charge, taxPercent: e.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            )}
          </div>

          <button
            type="button"
            onClick={submitCharge}
            disabled={busy}
            className={`mt-3 ${smallBtn}`}
          >
            Add Charge
          </button>

          {isManager && (
            <>
              <SectionTitle hint="The discount is applied to the subtotal, and GST is calculated on the discounted amount.">
                Apply Discount
              </SectionTitle>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Field label="Discount Amount">
                  <input
                    type="number"
                    min="0"
                    value={discount.amount}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discount,
                        amount: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Reason">
                    <input
                      value={discount.reason}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discount,
                          reason: e.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <button
                type="button"
                onClick={submitDiscount}
                disabled={busy}
                className={`mt-3 ${smallBtn}`}
              >
                Apply Discount
              </button>
            </>
          )}

          <SectionTitle hint="Enter company details if the invoice should be issued in the company's name.">
            Company Details
          </SectionTitle>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Company Name">
              <input
                value={billTo.companyName}
                onChange={(e) =>
                  setBillTo({ ...billTo, companyName: e.target.value })
                }
                className={inputClass}
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={submitBillTo}
            disabled={busy}
            className={`mt-3 ${smallBtn}`}
          >
            Save Details
          </button>
        </>
      )}
    </>
  )}
</Modal>

  );
};

export default BillModal;