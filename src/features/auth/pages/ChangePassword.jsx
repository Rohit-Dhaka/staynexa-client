import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../../hooks/useAuth";

const passwordChecks = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /[0-9]/.test(v) },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

const PasswordField = ({ label, name, value, onChange, show, onToggle }) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        required
        className={inputClass}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const ChangePassword = () => {
  const { changePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggle = () => setShowPassword((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordChecks.every((rule) => rule.test(form.newPassword))) {
      toast.error("New password does not meet all requirements");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (form.currentPassword === form.newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success("Password changed. Please login again");
      navigate("/login", { replace: true, state: null });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">Change password</h2>
        <p className="mt-1 text-sm text-gray-500">
          You will be logged out from all devices after changing your password
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <PasswordField
            label="Current password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            show={showPassword}
            onToggle={toggle}
          />

          <div>
            <PasswordField
              label="New password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              show={showPassword}
              onToggle={toggle}
            />
            {form.newPassword && (
              <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                {passwordChecks.map((rule) => (
                  <li
                    key={rule.label}
                    className={
                      rule.test(form.newPassword) ? "text-green-600" : "text-gray-400"
                    }
                  >
                    {rule.test(form.newPassword) ? "✓" : "•"} {rule.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <PasswordField
            label="Confirm new password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            show={showPassword}
            onToggle={toggle}
          />

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;