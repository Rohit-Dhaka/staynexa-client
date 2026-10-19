
import { useEffect, useState } from "react";
import { listHalls } from "../services/banquet.service";

export default function GuestBanquet() {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHalls() {
      try {
        setLoading(true);
        setError("");

        const response = await listHalls({ page: 1, limit: 20 });

        if (active) {
          const items = Array.isArray(response)
            ? response
            : response?.halls ?? response?.items ?? response?.data ?? [];

          setHalls(items);
        }
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

  return (
    <main className="mx-auto max-w-7xl p-6">
      <h1 className="text-3xl font-bold">Explore Banquet Halls</h1>

      <p className="mt-2 text-gray-600">
        Apne event ke liye perfect banquet hall choose karein.
      </p>

      {loading && <p className="mt-6">Loading banquet halls...</p>}

      {error && <p className="mt-6 text-red-600">{error}</p>}

      {!loading && !error && halls.length === 0 && (
        <p className="mt-6">Abhi koi banquet hall available nahi hai.</p>
      )}

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => (
          <article
            key={hall._id || hall.id}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-semibold">
              {hall.name || hall.hallName || "Banquet Hall"}
            </h2>

            <p className="mt-2 text-gray-600">
              {hall.description || "Hall details coming soon."}
            </p>

            {hall.capacity != null && (
              <p className="mt-3">Capacity: {hall.capacity} guests</p>
            )}

            {(hall.price != null || hall.basePrice != null) && (
              <p className="mt-2 font-semibold">
                Price: ₹{hall.price ?? hall.basePrice}
              </p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
