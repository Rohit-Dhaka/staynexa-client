import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { getInvoice } from "../services/bookings.service";
import { formatDate, formatDateTime, formatINR, getErrorMessage } from "../utils/bookingUi";

const printStyles = `
@media print {
  body * { visibility: hidden; }
  #invoice-print, #invoice-print * { visibility: visible; }
  #invoice-print { position: absolute; left: 0; top: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
}
`;

const BookingInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getInvoice(id)
      .then(setInv)
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-indigo-600">
          Wapas jao
        </button>
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const { hotel, booking, billTo, totals } = inv;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <style>{printStyles}</style>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(`/bookings/${id}`)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Back to Booking
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      <div id="invoice-print" className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{hotel.name}</h1>
            {hotel.address && <p className="mt-1 max-w-xs text-slate-600">{hotel.address}</p>}
            {(hotel.phone || hotel.email) && (
              <p className="text-slate-600">{[hotel.phone, hotel.email].filter(Boolean).join(" | ")}</p>
            )}
            {hotel.gstin && <p className="mt-1 font-medium">GSTIN: {hotel.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-wide text-indigo-600">
              {inv.isProforma ? "PROFORMA INVOICE" : "TAX INVOICE"}
            </p>
            {inv.invoiceNumber && <p className="mt-1 font-medium">{inv.invoiceNumber}</p>}
            <p className="text-slate-600">Date: {formatDate(inv.invoiceDate)}</p>
            {inv.isProforma && <p className="mt-1 text-xs text-amber-600">Draft hai, final invoice check-out par banega</p>}
          </div>
        </div>

        <div className="grid gap-6 border-b border-slate-200 py-5 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Bill to</p>
            {billTo.companyName && <p className="font-medium">{billTo.companyName}</p>}
            <p className={billTo.companyName ? "" : "font-medium"}>{billTo.name}</p>
            {billTo.phone && <p className="text-slate-600">{billTo.phone}</p>}
            {billTo.email && <p className="text-slate-600">{billTo.email}</p>}
            {billTo.address && <p className="text-slate-600">{billTo.address}</p>}
            {billTo.gstin && <p className="mt-1 font-medium">GSTIN: {billTo.gstin}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Stay details</p>
            <p>Booking: {booking.bookingNumber}</p>
            <p>
              Room {booking.room} ({booking.roomType})
            </p>
            <p>
              {formatDate(booking.checkIn)} se {formatDate(booking.checkOut)} ({booking.nights} night
              {booking.nights > 1 ? "s" : ""})
            </p>
            <p>
              {booking.adults} adults, {booking.children || 0} children
            </p>
          </div>
        </div>

        <div className="overflow-x-auto py-5">
          <table className="w-full min-w-[560px] text-left">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">#</th>
                <th className="py-2">Description</th>
                <th className="py-2">SAC</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Rate</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-right">GST</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((item, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{item.description}</td>
                  <td className="py-2">{item.sac}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatINR(item.unitPrice)}</td>
                  <td className="py-2 text-right">{formatINR(item.amount)}</td>
                  <td className="py-2 text-right">{item.taxPercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Tax summary</p>
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-1.5">SAC</th>
                  <th className="py-1.5 text-right">Taxable</th>
                  <th className="py-1.5 text-right">CGST</th>
                  <th className="py-1.5 text-right">SGST</th>
                </tr>
              </thead>
              <tbody>
                {inv.taxSummary.map((t, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5">
                      {t.sac} ({t.taxPercent}%)
                    </td>
                    <td className="py-1.5 text-right">{formatINR(t.taxableValue)}</td>
                    <td className="py-1.5 text-right">{formatINR(t.cgst)}</td>
                    <td className="py-1.5 text-right">{formatINR(t.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatINR(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Discount{totals.discountReason ? ` (${totals.discountReason})` : ""}</span>
                <span>-{formatINR(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">GST</span>
              <span>{formatINR(totals.taxTotal)}</span>
            </div>
            {totals.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Round off</span>
                <span>{formatINR(totals.roundOff)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Grand total</span>
              <span>{formatINR(totals.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Paid</span>
              <span>{formatINR(inv.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance due</span>
              <span>{formatINR(inv.balanceAmount)}</span>
            </div>
          </div>
        </div>

        {inv.payments.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Payments received</p>
            <ul className="space-y-1 text-xs text-slate-600">
              {inv.payments.map((p) => (
                <li key={p.paymentNumber} className="flex justify-between">
                  <span>
                    {p.paymentNumber}, {formatDateTime(p.paidAt)}, {String(p.method).replace(/_/g, " ")}
                  </span>
                  <span>{formatINR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          Thank you! We hope your stay with us was memorable.
        </p>
      </div>
    </div>
  );
};

export default BookingInvoice;