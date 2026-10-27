import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarPlus,
  FileText,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  RotateCcw,
  UserX,
  Wallet,
  XCircle,
  BadgeCheck,
  Timer,
} from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { getBooking, voidPayment } from "../services/bookings.service";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
} from "../components/StatusBadges";
import BookingActionModals, {
  MODAL_COMPONENTS,
} from "../components/BookingActionModals";
import {
  BOOKING_SOURCES,
  formatDate,
  formatDateTime,
  formatINR,
  getErrorMessage,
  toInputDate,
  timeLeft,
} from "../utils/bookingUi";

const ACTIONS = {
  checkin: { label: "Check-in", icon: LogIn, tone: "primary" },
  checkout: { label: "Check-out", icon: LogOut, tone: "primary" },
  payment: { label: "Collect Payment", icon: Wallet, tone: "default" },
  charge: { label: "Add Charge", icon: Plus, tone: "default" },
  extend: { label: "Extend Stay", icon: CalendarPlus, tone: "default" },
  changeRoom: { label: "Change Room", icon: ArrowLeftRight, tone: "default" },
  refund: { label: "Issue Refund", icon: RotateCcw, tone: "default" },
  cancel: { label: "Cancel Booking", icon: XCircle, tone: "danger" },
  noShow: { label: "Mark as No-Show", icon: UserX, tone: "danger" },
  convert: { label: "Confirm Booking", icon: BadgeCheck, tone: "primary" },
  extendHold: { label: "Extend Hold", icon: Timer, tone: "default" },
};

const TONES = {
  primary: "bg-black text-white ",
  default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
};

const PAYMENT_TYPE_LABELS = {
  advance_booking: "Advance (booking)",
  advance_checkin: "Advance (check-in)",
  partial: "Partial",
  final: "Final",
  security_deposit: "Security deposit",
  refund: "Refund",
  deposit_refund: "Deposit refund",
};

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "payments", label: "Payments" },
  { value: "bill", label: "Bill" },
];

const sum = (list, type) =>
  list.filter((p) => p.type === type).reduce((s, p) => s + p.amount, 0);

const Info = ({ label, children }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <dt className="text-slate-500">{label}</dt>
    <dd className="text-right font-medium text-slate-900">{children || "-"}</dd>
  </div>
);

const Card = ({ title, children, className = "" }) => (
  <div
    className={`rounded border border-slate-200 bg-white p-5 ${className}`}
  >
    {title && (
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
    )}
    {children}
  </div>
);

const getActions = (booking, isManager, balance, netPaid) => {
  const today = toInputDate();
  const due = toInputDate(booking.checkIn) <= today;
  const list = [];

  switch (booking.status) {
    case "hold":
      if (due) list.push("checkin");
      list.push("convert", "extendHold", "cancel");
      break;
    case "pending":
    case "confirmed":
      if (due) list.push("checkin");
      list.push("payment", "cancel");
      if (due) list.push("noShow");
      break;
    case "checked_in":
      list.push("checkout", "payment", "charge", "extend", "changeRoom");
      break;
    case "checked_out":
      if (balance > 0) list.push("payment");
      break;
    default:
      break;
  }

  if (
    isManager &&
    netPaid > 0 &&
    ["pending", "confirmed", "checked_in", "checked_out"].includes(
      booking.status,
    )
  ) {
    list.push("refund");
  }

  return list.filter((key) => MODAL_COMPONENTS[key]);
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState(location.state?.notice || "");

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidBusy, setVoidBusy] = useState(false);
  const [voidError, setVoidError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      setBooking(await getBooking(id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const handleDone = () => {
    setAction(null);
    load();
  };

  const submitVoid = async () => {
    if (!voidReason.trim())
      return setVoidError("Reason for Voiding (Required)");
    setVoidBusy(true);
    setVoidError("");
    try {
      await voidPayment(voidTarget._id, voidReason.trim());
      setVoidTarget(null);
      setVoidReason("");
      load();
    } catch (err) {
      setVoidError(getErrorMessage(err));
    } finally {
      setVoidBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate("/bookings")}
          className="text-sm text-indigo-600"
        >
          Back to Bookings
        </button>
        <p className="rounded bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error || "No booking found."}
        </p>
      </div>
    );
  }

  
  const payments = booking.payments || [];
  const completed = payments.filter((p) => p.status === "completed");
  const depositHeld =
    sum(completed, "security_deposit") - sum(completed, "deposit_refund");
  const netPaid = (booking.paidAmount || 0) - (booking.refundedAmount || 0);
  const balance =
    booking.balanceAmount ??
    Math.max(
      booking.totalAmount - booking.paidAmount + (booking.refundedAmount || 0),
      0,
    );
  const closed = ["cancelled", "no_show"].includes(booking.status);

  
  const billPending =
    Boolean(booking.openEnded) && booking.status !== "checked_out" && !closed;

  const actions = getActions(booking, isManager, balance, netPaid);
  const bill =
    booking.bill && typeof booking.bill === "object" ? booking.bill : null;
  const sourceLabel =
    BOOKING_SOURCES.find((s) => s.value === booking.source)?.label ||
    booking.source;
  const proof = booking.guestDetails?.idProof;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/bookings")}
            className="mt-1 rounded p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-900">
                {booking.bookingNumber}
              </h1>
              <BookingStatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
              {booking.isAdvance && (
                <span className="rounded-full bg-black px-2.5 py-0.5 text-xs font-medium text-indigo-600">
                  Advance booking
                </span>
              )}
              {booking.openEnded && (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Check-out baad mein
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {booking.guestDetails?.name}, Room {booking.room?.roomNumber} (
              {booking.roomType?.name}), source: {sourceLabel}
            </p>
          </div>
        </div>

        {!closed && !billPending && (
          <button
            type="button"
            onClick={() => navigate(`/bookings/${booking._id}/invoice`)}
            className="flex items-center gap-2 rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <FileText size={16} /> Invoice
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-4 rounded bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="font-medium"
          >
            Ok
          </button>
        </div>
      )}

      {booking.status === "hold" && (
        <div className="flex items-start gap-3 rounded bg-black px-4 py-3 text-sm text-indigo-700">
          <Timer size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              The room is on hold until {formatDateTime(booking.holdExpiresAt)}{" "}
              ({timeLeft(booking.holdExpiresAt)} remaining).
            </p>

            {booking.holdNote && (
              <p className="mt-0.5">Note: {booking.holdNote}</p>
            )}

            <p className="mt-0.5 text-indigo-600">
              If the guest arrives, click Check-in or confirm the booking and
              collect an advance payment. The room will be released
              automatically when the hold expires.
            </p>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((key) => {
            const { icon: Icon, tone } = ACTIONS[key];
            const label =
              key === "cancel" && booking.status === "hold"
                ? "Release Hold"
                : ACTIONS[key].label;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setAction(key)}
                className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${TONES[tone]}`}
              >
                <Icon size={16} /> {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-semibold text-slate-900">
            {billPending ? "Check-out par" : formatINR(booking.totalAmount)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Paid</p>
          <p className="text-xl font-semibold text-emerald-600">
            {formatINR(netPaid)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Balance</p>
          <p
            className={`text-xl font-semibold ${balance > 0 && !closed && !billPending ? "text-rose-600" : "text-slate-900"}`}
          >
            {closed || billPending ? "-" : formatINR(balance)}
          </p>
        </div>
        <div className="rounded border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">
            {booking.advanceRequired > 0
              ? "Advance Payment Required"
              : "Deposit Held"}
          </p>
          <p className="text-xl font-semibold text-slate-900">
            {formatINR(
              booking.advanceRequired > 0
                ? booking.advanceRequired
                : depositHeld,
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              tab === t.value
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Stay">
            <dl>
              <Info label="Room">
                {booking.room?.roomNumber} (Floor {booking.room?.floor})
              </Info>
              <Info label="Room type">{booking.roomType?.name}</Info>
              <Info label="Check-in">{formatDate(booking.checkIn)}</Info>
              <Info label="Check-out">
                {billPending
                  ? "Baad mein decide hoga"
                  : formatDate(booking.checkOut)}
              </Info>
              <Info label="Nights">
                {billPending ? "Check-out par pata chalega" : booking.nights}
              </Info>
              <Info label="Guests">
                {booking.adults} adults, {booking.children || 0} children
              </Info>
              <Info label="Rate / night">
                {formatINR(booking.pricePerNight)}
              </Info>
              <Info label="Expected arrival">
                {booking.expectedArrivalTime}
              </Info>
              {booking.checkedInAt && (
                <Info label="Checked in at">
                  {formatDateTime(booking.checkedInAt)}
                </Info>
              )}
              {booking.earlyCheckIn?.isEarly && (
                <Info label="Early check-in charge">
                  {formatINR(booking.earlyCheckIn.charge)}
                </Info>
              )}
              {booking.checkedOutAt && (
                <Info label="Checked out at">
                  {formatDateTime(booking.checkedOutAt)}
                </Info>
              )}
              {booking.lateCheckOut?.isLate && (
                <Info label="Late check-out">
                  {booking.lateCheckOut.hours} hr,{" "}
                  {formatINR(booking.lateCheckOut.charge)}
                </Info>
              )}
              {booking.status === "cancelled" && (
                <>
                  <Info label="Cancelled at">
                    {formatDateTime(booking.cancelledAt)}
                  </Info>
                  <Info label="Reason">{booking.cancelReason}</Info>
                </>
              )}
              {booking.status === "no_show" && (
                <Info label="Reason">{booking.cancelReason}</Info>
              )}
            </dl>
          </Card>

          <Card title="Primary guest">
            <dl>
              <Info label="Naam">{booking.guestDetails?.name}</Info>
              <Info label="Phone">{booking.guestDetails?.phone}</Info>
              <Info label="Email">{booking.guestDetails?.email}</Info>
              <Info label="City">{booking.guestDetails?.city}</Info>
              <Info label="Address">{booking.guestDetails?.address}</Info>
              <Info label="ID proof">
                {proof?.type
                  ? `${proof.type.replace(/_/g, " ")}: ${proof.number || "-"}${proof.verified ? " (verified)" : ""}`
                  : "Abhi nahi liya"}
              </Info>
            </dl>
          </Card>

          <Card
            title={`Additional guests (${booking.additionalGuests?.length || 0})`}
            className="lg:col-span-2"
          >
            {(booking.additionalGuests || []).length === 0 ? (
              <p className="text-sm text-slate-500">No additional guests.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Naam</th>
                      <th className="py-2">Age</th>
                      <th className="py-2">Relation</th>
                      <th className="py-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.additionalGuests.map((g) => (
                      <tr key={g._id} className="border-t border-slate-100">
                        <td className="py-2 text-slate-900">
                          {g.name}
                          {g.isChild && (
                            <span className="ml-1.5 text-xs text-slate-500">
                              (child)
                            </span>
                          )}
                        </td>
                        <td className="py-2">{g.age ?? "-"}</td>
                        <td className="py-2">{g.relation || "-"}</td>
                        <td className="py-2">
                          {g.idProof?.type
                            ? `${g.idProof.type.replace(/_/g, " ")}: ${g.idProof.number || "-"}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {(booking.specialRequests || booking.internalNotes) && (
            <Card title="Requests aur notes" className="lg:col-span-2">
              <dl>
                <Info label="Special requests">{booking.specialRequests}</Info>
                <Info label="Internal notes">{booking.internalNotes}</Info>
              </dl>
            </Card>
          )}

          {(booking.extensions?.length > 0 ||
            booking.roomHistory?.length > 0) && (
            <Card title="History" className="lg:col-span-2">
              <ul className="space-y-2 text-sm">
                {(booking.extensions || []).map((e) => (
                  <li
                    key={e._id}
                    className="flex flex-wrap justify-between gap-2 text-slate-700"
                  >
                    <span>
                      Stay extend: {e.extraNights} night
                      {e.extraNights > 1 ? "s" : ""} (
                      {formatDate(e.previousCheckOut)} se{" "}
                      {formatDate(e.newCheckOut)})
                      {e.reason ? `, ${e.reason}` : ""}
                    </span>
                    <span className="text-slate-500">
                      {formatINR(e.extraAmount)}
                    </span>
                  </li>
                ))}
                {(booking.roomHistory || []).map((r) => (
                  <li
                    key={r._id}
                    className="flex flex-wrap justify-between gap-2 text-slate-700"
                  >
                    <span>
                      Room change, {formatDate(r.at)}: {r.reason}
                    </span>
                    <span className="text-slate-500">
                      {r.priceDifference > 0
                        ? `+${formatINR(r.priceDifference)}`
                        : "No extra charge"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {tab === "payments" && (
        <Card>
          {payments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No payment has been made yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Receipt</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Type</th>
                    <th className="py-2">Method</th>
                    <th className="py-2 text-right">Amount</th>
                    <th className="py-2">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const voided = p.status === "voided";
                    return (
                      <tr
                        key={p._id}
                        className={`border-t border-slate-100 ${voided ? "text-slate-400" : ""}`}
                      >
                        <td className="py-2.5">
                          <p
                            className={
                              voided
                                ? "line-through"
                                : "font-medium text-slate-900"
                            }
                          >
                            {p.paymentNumber}
                          </p>
                          {p.reference && (
                            <p className="text-xs text-slate-500">
                              {p.reference}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5">{formatDateTime(p.paidAt)}</td>
                        <td className="py-2.5">
                          {PAYMENT_TYPE_LABELS[p.type] || p.type}
                        </td>
                        <td className="py-2.5 capitalize">
                          {String(p.method).replace(/_/g, " ")}
                        </td>
                        <td
                          className={`py-2.5 text-right font-medium ${
                            voided
                              ? "line-through"
                              : p.direction === "out"
                                ? "text-rose-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {p.direction === "out" ? "-" : "+"}
                          {formatINR(p.amount)}
                        </td>
                        <td className="py-2.5 capitalize">
                          {p.status}
                          {voided && p.voidReason && (
                            <p className="text-xs">{p.voidReason}</p>
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                      
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "bill" && (
        <Card>
          {billPending ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Is booking ka bill check-out ke time banega. Guest jitne din
              rukega, utne nights aur extra charges ke hisaab se.
            </p>
          ) : !bill ? (
            <p className="py-6 text-center text-sm text-slate-500">
              Bill nahi mila
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">
                  Status:{" "}
                  <span className="font-medium capitalize text-slate-900">
                    {bill.status}
                  </span>
                  {bill.invoiceNumber && (
                    <span className="ml-3">Invoice: {bill.invoiceNumber}</span>
                  )}
                </span>
                {bill.billTo?.companyName && (
                  <span className="text-slate-500">
                    {bill.billTo.companyName}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Amount</th>
                      <th className="py-2 text-right">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bill.lineItems || []).map((item) => (
                      <tr
                        key={item._id}
                        className={`border-t border-slate-100 ${item.isVoided ? "text-slate-400 line-through" : ""}`}
                      >
                        <td className="py-2.5">{item.description}</td>
                        <td className="py-2.5 text-right">{item.quantity}</td>
                        <td className="py-2.5 text-right">
                          {formatINR(item.unitPrice)}
                        </td>
                        <td className="py-2.5 text-right">
                          {formatINR(item.amount)}
                        </td>
                        <td className="py-2.5 text-right">
                          {item.taxPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto mt-4 max-w-xs space-y-1.5 border-t border-slate-100 pt-4 text-sm">
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
                {bill.roundOff !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Round off</span>
                    <span>{formatINR(bill.roundOff)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-slate-900">
                  <span>Grand total</span>
                  <span>{formatINR(bill.grandTotal)}</span>
                </div>
              </div>
            </>
          )}
        </Card>
      )}

      <BookingActionModals
        action={action}
        booking={booking}
        onClose={() => setAction(null)}
        onDone={handleDone}
      />

      <Modal
        open={Boolean(voidTarget)}
        title="Void Payment"
        subtitle={
          voidTarget
            ? `${voidTarget.paymentNumber}, ${formatINR(voidTarget.amount)}`
            : ""
        }
        onClose={() => setVoidTarget(null)}
        busy={voidBusy}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setVoidTarget(null)}
              disabled={voidBusy}
              className="rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitVoid}
              disabled={voidBusy}
              className="flex items-center justify-center gap-2 rounded bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
            >
              {voidBusy && <Loader2 size={16} className="animate-spin" />}
              Void Payment
            </button>
          </>
        }
      >
        {voidError && (
          <p className="mb-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {voidError}
          </p>
        )}
        <p className="mb-3 text-sm text-slate-500">
          When voided, this payment will be removed from the booking’s paid
          amount. The record will not be deleted.
        </p>
        <textarea
          rows="3"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          placeholder="Reason for Voiding (Required)"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </Modal>
    </div>
  );
};

export default BookingDetail;
