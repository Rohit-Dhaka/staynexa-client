import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../../components/common/Modal";
import { getLeave, reviewLeave } from "../services/attendance.service";
import { ErrorBox, NoteBox, inputClass } from "../../bookings/components/formUi";
import { LeaveStatusChip } from "./AttendanceChip";
import {formatDay,formatUnits,formatWeekday,getErrorMessage,leaveTypeLabel,} from "../../../utils/attendanceUi";

const CHOICES = [
  { value: "casual", label: "Casual (paid)" },
  { value: "sick", label: "Sick (paid)" },
  { value: "paid", label: "Paid leave (paid)" },
  { value: "unpaid", label: "Unpaid" },
  { value: "reject", label: "Reject" },
];
const PAID = ["casual", "sick", "paid"];

const LeaveReviewModal = ({ leaveId, canReview, onClose, onDone }) => {
  const [data, setData] = useState(null);
  const [choices, setChoices] = useState({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLeave(leaveId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        const init = {};
        res.days.forEach((d) => {
          init[d.dateKey] = d.type;
        });
        (res.suggestion || []).forEach((s) => {
          init[s.dateKey] = s.type;
        });
        setChoices(init);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [leaveId]);

  const editable = canReview && data?.status === "pending";

  const summary = useMemo(() => {
    const s = { paid: 0, unpaid: 0, rejected: 0, usage: {} };
    if (!data) return s;
    data.days.forEach((d) => {
      const c = choices[d.dateKey];
      if (c === "reject") s.rejected += d.units;
      else if (c === "unpaid") s.unpaid += d.units;
      else if (PAID.includes(c)) {
        s.paid += d.units;
        const key = `${d.dateKey.slice(0, 4)}|${c}`;
        s.usage[key] = (s.usage[key] || 0) + d.units;
      }
    });
    return s;
  }, [data, choices]);

  const overdraw = Object.entries(summary.usage).filter(([key, units]) => {
    const [year, type] = key.split("|");
    const remaining = data?.balances?.[year]?.[type]?.remaining;
    return remaining !== undefined && units > remaining;
  });

  const run = async (payload) => {
    setSaving(true);
    setError("");
    try {
      await reviewLeave(leaveId, payload);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const approve = () =>
    run({
      action: "approve",
      note,
      decisions: data.days.map((d) =>
        choices[d.dateKey] === "reject"
          ? { dateKey: d.dateKey, decision: "reject" }
          : { dateKey: d.dateKey, decision: "approve", type: choices[d.dateKey] }
      ),
    });

  const rejectAll = () => {
    if (!note.trim()) return setError("Poori request reject karne ka reason likho");
    return run({ action: "reject", note });
  };

  const balanceYears = data ? Object.keys(data.balances || {}) : [];

  return (
    <Modal
      open
      size="lg"
      title={editable ? "Leave review karo" : "Leave request"}
      subtitle={data ? `${data.requestNumber}, ${data.user?.name}` : ""}
      onClose={onClose}
      busy={saving}
      footer={
        editable ? (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Band karo
            </button>
            <button
              type="button"
              onClick={rejectAll}
              disabled={saving}
              className="rounded-lg border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
            >
              Poori reject karo
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Approve karo
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Band karo
          </button>
        )
      }
    >
      <ErrorBox message={error} />

      {!data && !error && (
        <div className="flex justify-center py-10 text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-600">
              {formatDay(data.fromDateKey)} se {formatDay(data.toDateKey)}, maanga hua: {leaveTypeLabel(data.requestedType)}
            </p>
            <LeaveStatusChip status={data.status} />
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Reason: {data.reason}</p>

          {balanceYears.map((year) => {
            const b = data.balances[year];
            return (
              <div key={year} className="grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-slate-500">{year} Casual baaki</p>
                  <p className="text-base font-semibold text-slate-900">{formatUnits(b.casual.remaining)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-slate-500">Sick baaki</p>
                  <p className="text-base font-semibold text-slate-900">{formatUnits(b.sick.remaining)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-slate-500">Paid baaki</p>
                  <p className="text-base font-semibold text-slate-900">{formatUnits(b.paid.remaining)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-slate-500">Unpaid le chuke</p>
                  <p className="text-base font-semibold text-slate-900">{formatUnits(b.unpaidTaken)}</p>
                </div>
              </div>
            );
          })}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Din</th>
                  <th className="px-3 py-2">Part</th>
                  <th className="px-3 py-2">{editable ? "Decision" : "Result"}</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <tr key={d._id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      {formatDay(d.dateKey)} <span className="text-xs text-slate-400">{formatWeekday(d.dateKey)}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {d.dayPart === "full" ? "Poora din" : d.dayPart === "first_half" ? "Half (pehla)" : "Half (doosra)"}
                    </td>
                    <td className="px-3 py-2">
                      {editable ? (
                        <select
                          value={choices[d.dateKey] || d.type}
                          onChange={(e) => setChoices({ ...choices, [d.dateKey]: e.target.value })}
                          className={`${inputClass} ${choices[d.dateKey] === "reject" ? "border-rose-300 bg-rose-50" : ""}`}
                        >
                          {CHOICES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={
                            d.status === "approved"
                              ? d.isPaid
                                ? "text-emerald-600"
                                : "text-orange-600"
                              : d.status === "rejected"
                              ? "text-rose-600"
                              : "text-slate-500"
                          }
                        >
                          {d.status === "approved"
                            ? `${leaveTypeLabel(d.type)}, ${d.isPaid ? "paid" : "unpaid"}`
                            : d.status === "rejected"
                            ? `Reject${d.note ? ` (${d.note})` : ""}`
                            : "Pending"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-600">Paid: {formatUnits(summary.paid)} din</span>
                <span className="text-orange-600">Unpaid: {formatUnits(summary.unpaid)} din</span>
                <span className="text-rose-600">Reject: {formatUnits(summary.rejected)} din</span>
              </div>

              {overdraw.length > 0 && (
                <NoteBox tone="danger">
                  Balance se zyada paid leave chuni hai:{" "}
                  {overdraw.map(([key, units]) => `${key.replace("|", " ")} (${formatUnits(units)} din)`).join(", ")}.
                  Baaki din Unpaid kar do.
                </NoteBox>
              )}

              <NoteBox>
                Pehle se suggestion lagi hai: balance ke hisaab se pehle paid, jo balance se bahar ho wo unpaid. Har din
                ka decision badal sakte ho.
              </NoteBox>

              <textarea
                rows="2"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (poori reject karne par zaroori)"
                className={inputClass}
              />
            </>
          )}

          {!editable && data.reviewNote && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {data.reviewedBy?.name ? `${data.reviewedBy.name}: ` : ""}
              {data.reviewNote}
            </p>
          )}
          {data.status === "cancelled" && data.cancelReason && (
            <p className="text-sm text-slate-500">Cancel reason: {data.cancelReason}</p>
          )}
        </div>
      )}
    </Modal>
  );
};

export default LeaveReviewModal;