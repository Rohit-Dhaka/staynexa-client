import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Hotel } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getHomePath } from "../constants/roles";

const AuthLayout = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    const target = location.state?.from?.pathname || getHomePath(user.role);
    return <Navigate to={target} replace />;
  }

  return (
    <main className="min-h-screen  ">
      <div className="mx-auto grid min-h-screen  overflow-hidden bg-white sm:min-h-[calc(100vh-2rem)]  lg:grid-cols-2">
        <section className="relative hidden p-4 lg:block">
          <div className="relative h-full min-h-[600px] overflow-hidden rounded-2xl bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=90"
              alt="Luxury hotel architecture"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/75" />

            <Link
              to="/"
              className="absolute left-6 top-6 z-10 flex items-center gap-3 text-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900">
                <Hotel size={19} strokeWidth={1.8} />
              </span>
              <span className="text-base font-medium">StayNexa</span>
            </Link>

            <div className="absolute bottom-10 left-8 right-8 z-10 text-white">
              <h1 className="text-3xl font-semibold leading-tight xl:text-4xl">
                Find your perfect stay
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/85">
                Book rooms and banquet halls in just a few clicks.
                <br />
                Everything for your stay in one place.
              </p>

            
            </div>
          </div>
        </section>

        <section className="relative flex flex-col justify-center px-6 py-24 sm:px-12 lg:px-14 xl:px-24">
          <Link
            to="/"
            className="absolute left-6 top-6 flex items-center gap-2.5 lg:hidden"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
              <Hotel size={18} />
            </span>
            <span className="text-base font-semibold text-slate-900">StayNexa</span>
          </Link>

          <Link
            to="/login"
            className="absolute right-6 top-6 rounded-full bg-black px-7 py-2.5 text-xs font-medium text-white transition hover:bg-slate-700 sm:right-8 sm:top-8"
          >
            Sign in
          </Link>

          <div className="mx-auto w-full max-w-[380px]">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;