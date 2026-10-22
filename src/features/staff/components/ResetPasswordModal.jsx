import { useEffect, useState } from "react";
import { X, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { resetStaffPassword } from "../services/staff.service";

const passwordChecks = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

const ResetPasswordModal = ({ open, staff, onClose, onDone }) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setShowPassword(false);
      setSubmitting(false);
    }
  }, [open, staff]);

  if (!open || !staff) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordChecks.every((rule) => rule.test(password))) {
      toast.error("Password does not meet all requirements");
      return;
    }

    setSubmitting(true);

    try {
      await resetStaffPassword(staff._id, password);
      toast.success("Password reset successfully");
      onDone();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded bg-white p-6 ">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Reset password</h2>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Set a new password for <span className="font-semibold text-gray-900">{staff.name}</span>{" "}
          ({staff.email}). They will be logged out from all devices.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              New password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {password && (
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.label}
                    className={rule.test(password) ? "text-green-600" : "text-gray-400"}
                  >
                    {rule.test(password) ? "✓" : "•"} {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Reset password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;