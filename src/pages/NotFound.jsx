import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getHomePath } from "../constants/roles";

const NotFound = () => {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-extrabold text-blue-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        The page you are looking for does not exist or has been moved.
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

export default NotFound;