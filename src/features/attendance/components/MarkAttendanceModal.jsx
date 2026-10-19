import { useState } from "react";
import Modal from "../../../components/common/Modal";
import { markAttendance } from "../services/attendance.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "../../bookings/components/formUi";
import { ATTENDANCE_META, formatDay, getErrorMessage, toTimeInput } from "../../../utils/attendanceUi";

const OPTIONS = ["present", "absent", "half_day", "unpaid_leave", "weekly_off", "holiday"];

const MarkAttendanceModal = ({ staff, dateKey, record, onClose, onDone }) => {
  const isLeave = Boolean(record?.leaveRequest || record?.isLeave);

  const [status, setStatus] = useState(OPTIONS.includes(record?.status) ? record.status : "present");
  const [checkIn, setCheckIn] = useState(toTimeInput(record?.checkInAt));
  const [checkOut, setCheckOut] = useState(toTimeInput(record?.checkOutAt));
  const [remarks, setRemarks] = useState(record?.remarks || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const withTimes = status === "present" || status === "half_day";

  const submit = async () => {
    setError("");
    if (withTimes && checkOut && !checkIn) return setError("Check-out ke saath check-in time bhi bharo");

    const payload = { userId: staff._id, date: dateKey, status, remarks };
    if (withTimes && checkIn) payload.checkIn = checkIn;
    if (withTimes && checkOut) payload.checkOut = checkOut;

    setSaving(true);
    try {
      await markAttendance(payload);
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
      title="Attendance lagao"
      subtitle={`${staff.name}, ${formatDay(dateKey)}`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter onCancel={onClose} onConfirm={submit} confirmText="Save karo" busy={saving} disabled={isLeave} />
      }
    >
      <ErrorBox message={error} />

      {isLeave && (
        <NoteBox tone="warn">
          Is din ki approved leave hai. Attendance badalne ke liye pehle Leaves page se leave cancel karo.
        </NoteBox>
      )}

      <div className="space-y-4">
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isLeave} className={inputClass}>
            {OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ATTENDANCE_META[s].label}
              </option>
            ))}
          </select>
        </Field>

        {withTimes && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Check-in time">
              <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Check-out time">
              <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}

        <Field label="Remarks">
          <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className={inputClass} />
        </Field>

        <p className="text-xs text-slate-500">
          Paid leave yahan se nahi lagti. Uske liye Leaves page se leave apply karke approve karo, taaki leave balance
          sahi kate.
        </p>
      </div>
    </Modal>
  );
};

export default MarkAttendanceModal;