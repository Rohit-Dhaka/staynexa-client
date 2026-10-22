import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, CheckCircle2, Pencil, Receipt, RotateCcw, Wallet, XCircle } from "lucide-react";
import toast from "react-hot-toast";

import useAuth from "../../../hooks/useAuth";
import Modal from "../../../components/common/Modal";
import { Skeleton } from "../../../components/common/Skeleton";
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  getBooking,
  voidPayment,
} from "../services/banquet.service";
import BanquetPaymentModal from "../components/BanquetPaymentModal";
import { Card, Field, ModalActions, PaymentBadge, StatusBadge } from "../components/BanquetUi";
import {
  EVENT_TYPE_OPTIONS,
  FOOD_TYPE_OPTIONS,
  MANAGEMENT_ROLES,
  MEAL_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_TYPE_OPTIONS,
  SETUP_STYLE_OPTIONS,
  dangerButton,
  formatDate,
  formatDateTime,
  formatINR,
  formatTime,
  getErrorMessage,
  inputClass,
  labelFor,
  outlineButton,
  primaryButton,
  toDayKey,
} from "../../../utils/banquet.utils";

const Row = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <dt className="shrink-0 text-slate-500">{label}</dt>
    <dd className="min-w-0 break-words text-right font-medium text-slate-900">{children || "-"}</dd>
  </div>
);

const Note = ({ title, text }) =>
  text ? (
    <Card title={title}>
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{text}</p>
    </Card>
  ) : null;

const BanquetBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = MANAGEMENT_ROLES.includes(user?.role);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState(null);

  const [paymentType, setPaymentType] = useState("partial");
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [cancelForm, setCancelForm] = useState({ reason: "", refundAmount: "", refundMethod: "cash", refundReference: "" });
  const [allowDues, setAllowDues] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        setBooking(await getBooking(id));
        setLoadError("");
      } catch (error) {
        if (silent) toast.error(getErrorMessage(error, "Could not refresh the booking"));
        else setLoadError(getErrorMessage(error, "Could not load this booking"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key, action, successMessage) => {
    setBusy(key);
    try {
      await action();
      toast.success(successMessage);
      setModal(null);
      setVoidTarget(null);
      await load({ silent: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy("");
    }
  };

  const openPayment = (type) => {
    setPaymentType(type);
    setModal("payment");
  };

  const handleCancel = () => {
    if (!cancelForm.reason.trim()) return toast.error("Enter a reason for cancelling this booking");
    const refund = Number(cancelForm.refundAmount) || 0;
    run(
      "cancel",
      () =>
        cancelBooking(booking._id, {
          reason: cancelForm.reason.trim(),
          refundAmount: refund,
          refundMethod: cancelForm.refundMethod,
          refundReference: cancelForm.refundReference.trim(),
        }),
      "Booking cancelled"
    );
  };

  const handleVoid = () => {
    if (!voidReason.trim()) return toast.error("Enter a reason for voiding this payment");
    run("void", () => voidPayment(booking._id, voidTarget._id, voidReason.trim()), "Payment voided");
  };

  if (loading) {
    return (
      <div className="max-w-6xl space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-80" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="max-w-xl space-y-4">
        <Link to="/banquet" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} />
          Back to Banquet
        </Link>
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">{loadError || "Booking not found"}</p>
      </div>
    );
  }

  const net = booking.paidAmount - booking.refundedAmount;
  const isActive = ["tentative", "confirmed"].includes(booking.status);
  const canEdit = isActive;
  const canConfirm = isManager && booking.status === "tentative";
  const canPay = booking.status !== "cancelled" && booking.balanceAmount > 0;
  const canRefund = isManager && booking.status !== "cancelled" && net > 0;
  const canComplete = isManager && booking.status === "confirmed" && booking.dateKey <= toDayKey();
  const canCancel = isManager && isActive;
  const holdActive = booking.status === "tentative" && booking.holdExpiresAt;

  const timeline = [
    { label: "Created", value: booking.createdAt },
    { label: "Confirmed", value: booking.confirmedAt },
    { label: "Completed", value: booking.completedAt },
    { label: "Cancelled", value: booking.cancelledAt },
  ].filter((entry) => entry.value);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link
          to="/banquet"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Banquet
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{booking.eventName || labelFor(EVENT_TYPE_OPTIONS, booking.eventType)}</h1>
          <StatusBadge status={booking.status} />
          {booking.status !== "cancelled" && <PaymentBadge status={booking.paymentStatus} />}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {booking.bookingNumber}, {booking.hall?.name}, {formatDate(booking.dateKey)}, {formatTime(booking.startTime)} to{" "}
          {formatTime(booking.endTime)}
        </p>
      </div>

      {holdActive && (
        <p className="rounded bg-amber-50 px-4 py-3 text-sm text-amber-700">
          This hall is on hold until {formatDateTime(booking.holdExpiresAt)}. Receive the advance of{" "}
          {formatINR(booking.advanceRequired)} to confirm the booking, otherwise the hold is released automatically.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <button type="button" onClick={() => run("confirm", () => confirmBooking(booking._id), "Booking confirmed")} disabled={busy === "confirm"} className={primaryButton}>
            <BadgeCheck size={16} />
            Confirm Booking
          </button>
        )}
        {canPay && (
          <button type="button" onClick={() => openPayment(booking.status === "tentative" ? "advance" : "partial")} className={primaryButton}>
            <Wallet size={16} />
            Record Payment
          </button>
        )}
        {canComplete && (
          <button
            type="button"
            onClick={() => {
              setAllowDues(false);
              setModal("complete");
            }}
            className={outlineButton}
          >
            <CheckCircle2 size={16} />
            Mark Completed
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={() => navigate(`/banquet/${booking._id}/edit`)} className={outlineButton}>
            <Pencil size={16} />
            Edit
          </button>
        )}
        {canRefund && (
          <button type="button" onClick={() => openPayment("refund")} className={outlineButton}>
            <RotateCcw size={16} />
            Refund
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => {
              setCancelForm({ reason: "", refundAmount: "", refundMethod: "cash", refundReference: "" });
              setModal("cancel");
            }}
            className={dangerButton}
          >
            <XCircle size={16} />
            Cancel Booking
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-bold text-slate-900">{formatINR(booking.totalAmount)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-xl font-bold text-emerald-600">{formatINR(net)}</p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Balance</p>
          <p className={`text-xl font-bold ${booking.balanceAmount > 0 && booking.status !== "cancelled" ? "text-rose-600" : "text-slate-900"}`}>
            {booking.status === "cancelled" ? "-" : formatINR(booking.balanceAmount)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Advance required</p>
          <p className="text-xl font-bold text-slate-900">{formatINR(booking.advanceRequired)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="Catering">
            {booking.catering.length === 0 ? (
              <p className="text-sm text-slate-500">No catering selected. This booking covers the hall only.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Package</th>
                      <th className="py-2 text-right">Per plate</th>
                      <th className="py-2 text-right">Plates</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.catering.map((line) => (
                      <tr key={line._id} className="border-t border-slate-100">
                        <td className="py-2.5">
                          <p className="font-medium text-slate-900">{line.name}</p>
                          <p className="text-xs text-slate-500">
                            {labelFor(MEAL_TYPE_OPTIONS, line.mealType)}, {labelFor(FOOD_TYPE_OPTIONS, line.foodType)}
                          </p>
                        </td>
                        <td className="py-2.5 text-right">{formatINR(line.pricePerPlate)}</td>
                        <td className="py-2.5 text-right">{line.plates}</td>
                        <td className="py-2.5 text-right font-medium">{formatINR(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {booking.extras.length > 0 && (
            <Card title="Extra Services">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Service</th>
                      <th className="py-2 text-right">Unit price</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.extras.map((extra) => (
                      <tr key={extra._id} className="border-t border-slate-100">
                        <td className="py-2.5 font-medium text-slate-900">{extra.description}</td>
                        <td className="py-2.5 text-right">{formatINR(extra.unitPrice)}</td>
                        <td className="py-2.5 text-right">{extra.quantity}</td>
                        <td className="py-2.5 text-right font-medium">{formatINR(extra.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card title="Charges">
            <dl className="ml-auto max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Hall charge</dt>
                <dd>{formatINR(booking.hallCharge)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Catering</dt>
                <dd>{formatINR(booking.cateringCharge)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Extra services</dt>
                <dd>{formatINR(booking.extrasCharge)}</dd>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount{booking.discountReason ? ` (${booking.discountReason})` : ""}</dt>
                  <dd>-{formatINR(booking.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-500">GST ({booking.taxPercent}%)</dt>
                <dd>{formatINR(booking.taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatINR(booking.totalAmount)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Payments">
            {booking.payments.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Receipt size={16} />
                No payments recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Receipt</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Method</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {booking.payments.map((p) => (
                      <tr key={p._id} className={`border-t border-slate-100 ${p.isVoided ? "text-slate-400" : ""}`}>
                        <td className="py-2.5">
                          <p className={p.isVoided ? "line-through" : "font-medium text-slate-900"}>{p.paymentNumber}</p>
                          {p.reference && <p className="text-xs text-slate-500">{p.reference}</p>}
                          {p.isVoided && p.voidReason && <p className="text-xs text-rose-500">Voided: {p.voidReason}</p>}
                        </td>
                        <td className="py-2.5">{formatDateTime(p.paidAt)}</td>
                        <td className="py-2.5">{labelFor(PAYMENT_TYPE_OPTIONS, p.type)}</td>
                        <td className="py-2.5">{labelFor(PAYMENT_METHOD_OPTIONS, p.method)}</td>
                        <td
                          className={`py-2.5 text-right font-medium ${
                            p.isVoided ? "line-through" : p.type === "refund" ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {p.type === "refund" ? "-" : "+"}
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2.5 text-right">
                          {isManager && !p.isVoided && (
                            <button
                              type="button"
                              onClick={() => {
                                setVoidTarget(p);
                                setVoidReason("");
                              }}
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
            )}
          </Card>

          <Note title="Special Requests" text={booking.specialRequests} />
          <Note title="Internal Notes" text={booking.internalNotes} />
          <Note title="Cancellation Reason" text={booking.cancelReason} />
        </div>

        <div className="space-y-5">
          <Card title="Event">
            <dl className="divide-y divide-slate-100">
              <Row label="Type">{labelFor(EVENT_TYPE_OPTIONS, booking.eventType)}</Row>
              <Row label="Hall">{booking.hall?.name}</Row>
              <Row label="Date">{formatDate(booking.dateKey)}</Row>
              <Row label="Time">
                {formatTime(booking.startTime)} to {formatTime(booking.endTime)} ({booking.durationHours} hrs)
              </Row>
              <Row label="Guests">{booking.expectedGuests}</Row>
              <Row label="Setup">{labelFor(SETUP_STYLE_OPTIONS, booking.setupStyle)}</Row>
            </dl>
          </Card>

          <Card title="Customer">
            <dl className="divide-y divide-slate-100">
              <Row label="Name">{booking.customer?.name}</Row>
              <Row label="Phone">{booking.customer?.phone}</Row>
              <Row label="Email">{booking.customer?.email}</Row>
              <Row label="Company">{booking.customer?.companyName}</Row>
              <Row label="GSTIN">{booking.customer?.gstin}</Row>
              <Row label="Address">{booking.customer?.address}</Row>
            </dl>
          </Card>

          <Card title="Timeline">
            <ol className="space-y-3">
              {timeline.map((entry) => (
                <li key={entry.label} className="text-sm">
                  <p className="font-medium text-slate-800">{entry.label}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.value)}</p>
                </li>
              ))}
            </ol>
            {booking.createdBy?.name && <p className="mt-3 text-xs text-slate-500">Created by {booking.createdBy.name}</p>}
          </Card>
        </div>
      </div>

      {modal === "payment" && (
        <BanquetPaymentModal
          booking={booking}
          defaultType={paymentType}
          canRefund={isManager}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            load({ silent: true });
          }}
        />
      )}

      <Modal
        open={modal === "complete"}
        size="sm"
        title="Mark Event as Completed"
        subtitle={booking.bookingNumber}
        onClose={() => setModal(null)}
        busy={busy === "complete"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={() => run("complete", () => completeBooking(booking._id, { allowDues }), "Event marked as completed")}
            confirmText="Mark Completed"
            busy={busy === "complete"}
            disabled={booking.balanceAmount > 0 && !allowDues}
          />
        }
      >
        {booking.balanceAmount > 0 ? (
          <div className="space-y-3">
            <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
              A balance of {formatINR(booking.balanceAmount)} is still pending. Collect it first, or complete the event with dues.
            </p>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={allowDues} onChange={(e) => setAllowDues(e.target.checked)} />
              Complete the event with the balance pending
            </label>
          </div>
        ) : (
          <p className="text-sm text-slate-600">All payments are settled. Mark this event as completed?</p>
        )}
      </Modal>

      <Modal
        open={modal === "cancel"}
        size="md"
        title="Cancel Booking"
        subtitle={booking.bookingNumber}
        onClose={() => setModal(null)}
        busy={busy === "cancel"}
        footer={
          <ModalActions
            onCancel={() => setModal(null)}
            onConfirm={handleCancel}
            confirmText="Cancel Booking"
            busy={busy === "cancel"}
            danger
          />
        }
      >
        <div className="space-y-4">
          <Field label="Reason" required htmlFor="cancelReason">
            <textarea
              id="cancelReason"
              rows={3}
              maxLength={300}
              value={cancelForm.reason}
              onChange={(e) => setCancelForm({ ...cancelForm, reason: e.target.value })}
              className={inputClass}
            />
          </Field>

          {net > 0 && (
            <>
              <p className="text-sm text-slate-600">
                The customer has paid {formatINR(net)}. Enter a refund amount, or leave it blank to keep the payment.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Refund amount" htmlFor="refundAmount">
                  <input
                    id="refundAmount"
                    type="number"
                    min="0"
                    max={net}
                    value={cancelForm.refundAmount}
                    onChange={(e) => setCancelForm({ ...cancelForm, refundAmount: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Refund method" htmlFor="refundMethod">
                  <select
                    id="refundMethod"
                    value={cancelForm.refundMethod}
                    onChange={(e) => setCancelForm({ ...cancelForm, refundMethod: e.target.value })}
                    className={inputClass}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        open={Boolean(voidTarget)}
        size="sm"
        title="Void Payment"
        subtitle={voidTarget ? `${voidTarget.paymentNumber}, ${formatINR(voidTarget.amount)}` : ""}
        onClose={() => setVoidTarget(null)}
        busy={busy === "void"}
        footer={
          <ModalActions
            onCancel={() => setVoidTarget(null)}
            onConfirm={handleVoid}
            confirmText="Void Payment"
            busy={busy === "void"}
            danger
          />
        }
      >
        <p className="mb-3 text-sm text-slate-500">
          A voided payment is removed from the totals but stays in the record for auditing.
        </p>
        <textarea
          rows={3}
          maxLength={300}
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="Reason for voiding"
          className={inputClass}
        />
      </Modal>
    </div>
  );
};

export default BanquetBookingDetail;