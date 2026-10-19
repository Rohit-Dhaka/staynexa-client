import { useEffect, useState } from "react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { applyLeave, listLeaveBalances } from "../services/attendance.service";
import {
  Field,
  ErrorBox,
  NoteBox,
  ModalFooter,
  inputClass,
} from "../../bookings/components/formUi";
import {
  LEAVE_TYPES,
  addDays,
  getErrorMessage,
  toDayKey,
} from "../../../utils/attendanceUi";
import toast from "react-hot-toast";

const LeaveApplyModal = ({ onClose, onDone }) => {
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);
  const today = toDayKey();

  const [staffList, setStaffList] = useState([]);
  const [form, setForm] = useState({
    userId: user?.role === ROLES.SUPER_ADMIN ? "" : myId,
    type: "casual",
    fromDate: today,
    toDate: today,
    halfDay: "",
    reason: "",
    autoApprove: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isManager) return;
    listLeaveBalances({})
      .then((res) => setStaffList(res.rows.map((r) => r.user)))
      .catch(() => {});
  }, [isManager]);

  const forOther =
    isManager && form.userId && String(form.userId) !== String(myId);
  const singleDay = form.fromDate === form.toDate;

  const change = (patch) => setForm((f) => ({ ...f, ...patch }));

  const changeFrom = (value) =>
    setForm((f) => ({
      ...f,
      fromDate: value,
      toDate: f.toDate < value ? value : f.toDate,
      halfDay: value === (f.toDate < value ? value : f.toDate) ? f.halfDay : "",
    }));

  const changeTo = (value) =>
    setForm((f) => ({
      ...f,
      toDate: value,
      halfDay: f.fromDate === value ? f.halfDay : "",
    }));

  const submit = async () => {
    setError("");
    if (isManager && !form.userId)
      return setError("Kiske liye leave apply karni hai, staff chuno");
    if (!form.reason.trim()) return setError("Leave ka reason likho");

    const payload = {
      type: form.type,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim(),
    };
    if (form.halfDay && singleDay) payload.halfDay = form.halfDay;
    if (forOther) {
      payload.userId = form.userId;
      payload.autoApprove = form.autoApprove;
    }

    setSaving(true);
    try {
      const result = await applyLeave(payload);

      if (result?.skippedDays?.length) {
        const skippedMessage = result.skippedDays
          .map((d) => `${d.date}: ${d.reason}`)
          .join(", ");

        toast.error(`These days were not counted as leave: ${skippedMessage}`);
      }

      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="md"
      title="Leave apply karo"
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Leave bhejo"
          busy={saving}
        />
      }
    >
      <ErrorBox message={error} />

      <div className="space-y-4">
        {isManager && (
          <Field label="Staff">
            <select
              value={form.userId}
              onChange={(e) => change({ userId: e.target.value })}
              className={inputClass}
            >
              <option value="">Staff chuno</option>
              {staffList.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                  {String(s._id) === String(myId) ? " (aap)" : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Leave type">
          <select
            value={form.type}
            onChange={(e) => change({ type: e.target.value })}
            className={inputClass}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Kab se">
            <input
              type="date"
              value={form.fromDate}
              onChange={(e) => changeFrom(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Kab tak">
            <input
              type="date"
              min={form.fromDate}
              value={form.toDate}
              onChange={(e) => changeTo(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {singleDay && (
          <Field label="Half day?">
            <select
              value={form.halfDay}
              onChange={(e) => change({ halfDay: e.target.value })}
              className={inputClass}
            >
              <option value="">Poora din</option>
              <option value="first_half">Half day (pehla hissa)</option>
              <option value="second_half">Half day (doosra hissa)</option>
            </select>
          </Field>
        )}

        <Field label="Reason *">
          <textarea
            rows="2"
            value={form.reason}
            onChange={(e) => change({ reason: e.target.value })}
            className={inputClass}
          />
        </Field>

        {forOther && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.autoApprove}
              onChange={(e) => change({ autoApprove: e.target.checked })}
            />
            Apply karte hi approve bhi kar do
          </label>
        )}

        <NoteBox>
          Weekly off aur holiday ke din leave mein nahi gine jate. Paid leave ka
          balance kam ho to manager baaki din unpaid kar sakta hai.
        </NoteBox>
        {!isManager && (
          <p className="text-xs text-slate-500">
            Leave 7 din se purani date ke liye apply nahi hoti (
            {addDays(today, -7)} se pehle).
          </p>
        )}
      </div>
    </Modal>
  );
};

export default LeaveApplyModal;
