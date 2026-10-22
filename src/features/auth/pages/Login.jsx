import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../../../hooks/useAuth";
const inputClass = "w-full rounded border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60";

const Login = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      const user = await login({
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`Welcome back, ${user.name}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold tracking-tight text-[#0f172a] sm:text-[28px]">
        Welcome Back to StayNexa!
      </h2>
      <p className="mt-1.5 text-xs text-slate-500">Sign in your account</p>

      <form onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium text-slate-800"
          >
            Your Email
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={submitting}
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-xs font-medium text-slate-800"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={submitting}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-800"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer accent-slate-900"
            />
            Remember Me
          </label>

          <Link
            to="/forgot-password"
            className="text-xs text-slate-500 transition hover:text-slate-900"
          >
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded bg-[#1a1a1a] py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-16 text-center text-xs text-slate-500">
        Don&apos;t have any account?{" "}
        <Link to="/signup" className="font-semibold text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
};

export default Login;