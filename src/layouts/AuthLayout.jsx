
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Hotel, ShieldCheck } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getHomePath } from "../constants/roles";

const AuthLayout = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    const target =
      location.state?.from?.pathname || getHomePath(user.role);

    return <Navigate to={target} replace />;
  }

  return (
    <main className="min-h-screen ">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Branding panel */}
        <section className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <img
            src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90"
            alt="Modern luxury hotel"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/25 to-slate-950/90" />

          <Link to="/" className="relative z-10 flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded bg-black">
              <Hotel size={23} />
            </span>
            <span className="text-xl font-bold tracking-tight">
              StayNexa
            </span>
          </Link>

          <div className="relative z-10 max-w-xl pb-8 text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur">
              <ShieldCheck size={17} />
              Your hospitality workspace
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-tight xl:text-5xl">
              Everything for your stay, in one place.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-white/80">
              Manage bookings, explore hotel services and enjoy a simpler,
              more organized hospitality experience with StayNexa.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/90">
              <span className="rounded-full border border-white/20 px-4 py-2">
                Room bookings
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                Banquet halls
              </span>
              <span className="rounded-full border border-white/20 px-4 py-2">
                Guest services
              </span>
            </div>
          </div>

          <p className="relative z-10 text-xs text-white/60">
            © {new Date().getFullYear()} StayNexa. All rights reserved.
          </p>
        </section>

        {/* Authentication panel */}
        <section className="relative flex min-h-screen flex-col bg-white px-5 py-8 sm:px-10 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded bg-black text-white">
                <Hotel size={21} />
              </span>
              <span className="text-lg font-bold text-slate-900">
                StayNexa
              </span>
            </Link>

            <span className="hidden text-sm text-slate-500 lg:block">
              Welcome to StayNexa
            </span>

            <Link
              to="/login"
              className="rounded border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-black hover:text-blue-700"
            >
              Sign in
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-[420px]">
              <div className="">
                <span className=" flex h-12 w-12 items-center justify-center rounded bg-black text-blue-600">
                  <Hotel size={25} />
                </span>
                {/* <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to your StayNexa account.
                </p> */}
              </div>

              <Outlet />
            </div>
          </div>

       
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;

