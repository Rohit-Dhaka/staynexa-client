import { useState } from "react";
import Modal from "../../../components/common/Modal";
import { extendHold } from "../services/bookings.service";
import { Field, ErrorBox, ModalFooter, inputClass } from "./formUi";
import { formatDateTime, getErrorMessage, timeLeft } from "../utils/bookingUi";

const PRESETS = [
  { hours: 2, label: "2 ghante" },
  { hours: 6, label: "6 ghante" },
  { hours: 24, label: "24 ghante" },
  { hours: 48, label: "48 ghante" },
];

const ExtendHoldModal = ({ booking, onClose, onDone }) => {
  const [mode, setMode] = useState({ type: "preset", hours: 6 });
  const [until, setUntil] = useState("");
  const [note, setNote] = useState(booking.holdNote || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const payload = { holdNote: note };

    if (mode.type === "custom") {
      if (!until) return setError("Date aur time chuno");
      payload.holdUntil = new Date(until).toISOString();
    } else {
      payload.holdHours = mode.hours;
    }

    setSaving(true);
    try {
      await extendHold(booking._id, payload);
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
      title="Hold ka time badhao"
      subtitle={`${booking.bookingNumber}, ${booking.guestDetails?.name}`}
      onClose={onClose}
      busy={saving}
      footer={<ModalFooter onCancel={onClose} onConfirm={submit} confirmText="Time badhao" busy={saving} />}
    >
      <ErrorBox message={error} />

      <p className="mb-4 text-sm text-slate-500">
        Abhi ka hold {formatDateTime(booking.holdExpiresAt)} tak hai ({timeLeft(booking.holdExpiresAt)}).
        Nayi expiry abhi se gini jayegi aur check-in wale din se aage nahi ja sakti.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.hours}
            type="button"
            onClick={() => setMode({ type: "preset", hours: p.hours })}
            className={`rounded px-4 py-2 text-sm font-medium transition ${
              mode.type === "preset" && mode.hours === p.hours
                ? "bg-black text-white"
                : "bg-slate-100 text-slate-700 "
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMode({ type: "custom" })}
          className={`rounded px-4 py-2 text-sm font-medium transition ${
            mode.type === "custom" ? "bg-black text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Khud ka time
        </button>
      </div>

      {mode.type === "custom" && (
        <div className="mb-4">
          <Field label="“Hold Until”">
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className={inputClass} />
          </Field>
        </div>
      )}

      <Field label="Note">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="“The guest requested a hold until tomorrow.”" className={inputClass} />
      </Field>
    </Modal>
  );
};

export default ExtendHoldModal;