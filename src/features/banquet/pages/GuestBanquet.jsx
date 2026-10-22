import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listHalls } from "../services/banquet.service";

export default function GuestBanquet() {
  const navigate = useNavigate();

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHalls() {
      try {
        setLoading(true);
        setError("");

        const response = await listHalls({
          active: true,
          page: 1,
          limit: 50,
        });

        const items = Array.isArray(response)
          ? response
          : response?.items ??
            response?.halls ??
            response?.data?.items ??
            response?.data?.halls ??
            [];

        if (active) setHalls(items);
      } catch (err) {
        if (active) {
          setError(
            err?.response?.data?.message ||
              "Banquet halls load nahi ho paaye."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHalls();

    return () => {
      active = false;
    };
  }, []);

  function handleBookHall(hall) {
    const hallId = hall._id || hall.id;

    if (!hallId) {
      setError("Is hall ki ID nahi mili.");
      return;
    }

    navigate(`/guest/banquet/${hallId}/book`);
  }

  if (loading) {
    return <main className="p-6">Loading banquet halls...</main>;
  }

 
return (
  <main className="min-h-screen ">
    <div className="mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div className="">
          <h1 className="text-2xl font-semibold text-gray-800 sm:text-3xl">
            Explore Banquet Halls
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Choose the perfect banquet hall for your event.
          </p>
        </div>
  <button
  onClick={() => navigate("/guest/banquet/my-reservations")}
  className="rounded border border-indigo-200 px-4 py-2 font-semibold bg-black text-white"
>
  My Banquet Reservations
</button>
      </div>

      {loading && (
        <p className="py-8 text-center text-gray-500">
          Loading banquet halls...
        </p>
      )}

      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {!loading && !error && halls.length === 0 && (
        <div className="rounded border border-gray-200 bg-white p-8 text-center">
          <p className="font-medium text-gray-700">
            No banquet halls available
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Please check again later.
          </p>
        </div>
      )}

      {!loading && !error && halls.length > 0 && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {halls.map((hall) => (
            <article
              key={hall._id || hall.id}
              className="rounded border border-gray-200 bg-white p-5 "
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  {hall.name || "Banquet Hall"}
                </h2>

                {hall.code && (
                  <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">
                    {hall.code}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                {hall.description || "Hall details coming soon."}
              </p>

              <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                {hall.capacityMax != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Capacity</span>
                    <span className="font-medium text-gray-700">
                      {hall.capacityMin ?? 1}–{hall.capacityMax} guests
                    </span>
                  </div>
                )}

                {hall.areaSqFt != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Area</span>
                    <span className="font-medium text-gray-700">
                      {hall.areaSqFt} sq. ft.
                    </span>
                  </div>
                )}

                {hall.rate != null && (
                  <div className="pt-2">
                    <p className="text-xs text-gray-500">
                      {hall.pricingType === "per_hour"
                        ? "Price per hour"
                        : "Price per event"}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-gray-800">
                      ₹{Number(hall.rate).toLocaleString("en-IN")}
                    </p>
                  </div>
                )}
              </div>

              {Array.isArray(hall.amenities) &&
                hall.amenities.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {hall.amenities.map((item, index) => {
                      const label =
                        typeof item === "string"
                          ? item
                          : item?.name || item?.label || "";

                      return label ? (
                        <span
                          key={`${label}-${index}`}
                          className="rounded  px-2.5 py-1 text-xs text-gray-600"
                        >
                          {label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

              <button
                type="button"
                onClick={() => handleBookHall(hall)}
                className="mt-5 w-full rounded bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              >
                Book This Hall
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  </main>
);

}