import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import useAuth from "../../../hooks/useAuth";
import { ROLES } from "../../../constants/roles";
import Modal from "../../../components/common/Modal";
import { changeRoom, searchAvailability } from "../services/bookings.service";
import { Field, ErrorBox, NoteBox, ModalFooter, inputClass } from "./formUi";
import { formatINR, getErrorMessage, nightsBetween, toInputDate } from "../utils/bookingUi";

const ChangeRoomModal = ({ booking, onClose, onDone }) => {
  const { user } = useAuth();
  const isManager = [ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(user?.role);

  const today = toInputDate();
  const checkOut = toInputDate(booking.checkOut);
  const remainingNights = nightsBetween(today, checkOut);

  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(remainingNights >= 1);
  const [selected, setSelected] = useState({ roomId: "", opt: null });
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState({ price: "", keepRate: false, override: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (remainingNights < 1) return undefined;
    let cancelled = false;

    searchAvailability({
      checkIn: today,
      checkOut,
      adults: booking.adults,
      children: booking.children || 0,
    })
      .then((result) => {
        if (!cancelled) setOptions(result.options || []);
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentTypeId = booking.roomType?._id || booking.roomType;
  const diffFor = (opt) =>
    String(opt.roomType._id) === String(currentTypeId) ? 0 : opt.pricePerNight - booking.pricePerNight;

  const submit = async () => {
    setError("");
    if (!selected.roomId) return setError("Naya room select karo");
    if (!reason.trim()) return setError("Room change ka reason likho");

    const payload = { newRoom: selected.roomId, reason: reason.trim() };
    if (isManager) {
      if (extra.price !== "") payload.pricePerNight = Number(extra.price);
      else if (extra.keepRate) payload.keepRate = true;
      if (extra.override) payload.overrideRoomStatus = true;
    }

    setSaving(true);
    try {
      await changeRoom(booking._id, payload);
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const selectedDiff = selected.opt ? diffFor(selected.opt) : 0;

  return (
    <Modal
      open
      size="lg"
      title="Room change"
      subtitle={`${booking.bookingNumber}, abhi Room ${booking.room?.roomNumber} (${booking.roomType?.name})`}
      onClose={onClose}
      busy={saving}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={submit}
          confirmText="Change  Room" 
          busy={saving}
          disabled={remainingNights < 1}
        />
      }
    >
      <ErrorBox message={error} />

      {remainingNights < 1 ? (
        <p className="text-sm text-slate-500">The guest is checking out today, so there’s no need to change rooms.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            From Today Until Check-out ({remainingNights} nights) Vacant rooms are available.
          </p>

          {loading && (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          )}

          {!loading && options.length === 0 && (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No other rooms are available for the remaining dates.
            </p>
          )}

          <div className="space-y-3">
            {options.map((opt) => {
              const diff = diffFor(opt);
              return (
                <div key={opt.roomType._id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{opt.roomType.name}</p>
                      <p className="text-xs text-slate-500">{formatINR(opt.pricePerNight)} / night</p>
                    </div>
                    <p className={`text-xs font-medium ${diff > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {diff === 0
                        ? "Same rate"
                        : diff > 0
                        ? `+${formatINR(diff)}/night, kul +${formatINR(diff * remainingNights)} (GST alag)`
                        : "Rate kam hai, bill apne aap kam nahi hoga"}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {opt.rooms.map((r) => (
                      <button
                        key={r._id}
                        type="button"
                        onClick={() => setSelected({ roomId: r._id, opt })}
                        className={`rounded-lg px-3 py-1.5 text-sm transition ${
                          selected.roomId === r._id
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {r.roomNumber} <span className="text-xs opacity-70">(F{r.floor})</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selected.opt && selectedDiff > 0 && (
            <div className="mt-4">
              <NoteBox tone="warn">Upgrade ka difference bill mein judega (manager chahe to free upgrade de sakta hai).</NoteBox>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <Field label="Reason *">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="AC not working, guest request, complimentary upgrade..."
                className={inputClass}
              />
            </Field>

            {isManager && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-3 text-sm font-medium text-slate-700">Manager options</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Custom rate per night (optional)">
                    <input
                      type="number"
                      min="0"
                      value={extra.price}
                      onChange={(e) => setExtra({ ...extra, price: e.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <div className="space-y-2 self-end pb-1 text-sm text-slate-700">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={extra.keepRate}
                        onChange={(e) => setExtra({ ...extra, keepRate: e.target.checked })}
                      />
                      Complimentary Upgrade (Keep Original Rate)
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={extra.override}
                        onChange={(e) => setExtra({ ...extra, override: e.target.checked })}
                      />
                      Move Even If the Room Is Not Ready
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};

export default ChangeRoomModal;