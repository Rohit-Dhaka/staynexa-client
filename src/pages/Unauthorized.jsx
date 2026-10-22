import { Link } from "react-router-dom";
import { ShieldX } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { getHomePath } from "../constants/roles";

const Unauthorized = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <ShieldX size={32} />
      </div>
      <h1 className="mt-6 text-3xl font-bold text-gray-900">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        You do not have permission to view this page. If you think this is a
        mistake, please contact your administrator.
      </p>
      <Link
        to={user ? getHomePath(user.role) : "/login"}
        className="mt-6 rounded bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
      >
        Go back home
      </Link>
    </div>
  );
};

export default Unauthorized;