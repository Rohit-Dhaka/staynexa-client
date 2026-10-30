import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  Check,
  MapPin,
  Ruler,
  Users,
} from "lucide-react";
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
            err?.response?.data?.message || "Unable to load banquet halls."
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
      setError("The hall ID could not be found.");
      return;
    }

    navigate(`/guest/banquet/${hallId}/book`);
  }

  const formatRate = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  return (
    <main className="min-h-screen w-full text-slate-900">
      <div className="mx-auto w-full max-w-7xl space-y-7 sm:space-y-9">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Events & celebrations
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
              Find your event space
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore our banquet halls and choose a space that fits your event.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/guest/banquet/my-reservations")}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 sm:w-auto sm:shrink-0"
          >
            <CalendarDays className="h-4 w-4" />
            My Banquet Reservations
          </button>
        </header>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded border border-rose-200 p-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="self-start rounded border border-rose-200 px-3 py-1.5 font-semibold sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        <section aria-label="Available banquet halls">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Available spaces
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? "Finding spaces for your event..."
                  : `${halls.length} ${halls.length === 1 ? "space" : "spaces"} available`}
              </p>
            </div>
            {!loading && halls.length > 0 && (
              <span className="hidden rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Ready to explore
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded border border-slate-200 p-5"
                >
                  <div className="h-5 w-2/3 rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
                  <div className="mt-6 h-16 rounded border border-slate-100" />
                  <div className="mt-5 h-10 rounded border border-slate-200" />
                </div>
              ))}
            </div>
          ) : !error && halls.length === 0 ? (
            <div className="rounded border border-dashed border-slate-300 px-5 py-12 text-center sm:py-16">
              <CalendarDays className="mx-auto h-9 w-9 text-slate-400" />
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No banquet halls available
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
                There are no active halls to show right now. Please check again later.
              </p>
            </div>
          ) : !error ? (
            <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {halls.map((hall, index) => (
                <article
                  key={hall._id || hall.id || `${hall.name}-${index}`}
                  className="flex min-w-0 flex-col rounded border border-slate-200 p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Banquet hall {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 break-words text-lg font-semibold leading-6 text-slate-950 sm:text-xl">
                        {hall.name || "Banquet Hall"}
                      </h3>
                    </div>
                    {hall.code && (
                      <span className="max-w-28 shrink-0 break-all rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                        {hall.code}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">
                    {hall.description || "More details about this hall will be available soon."}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-200 py-4">
                    {hall.capacityMax != null && (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          Capacity
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                          {hall.capacityMin ?? 1}–{hall.capacityMax} guests
                        </p>
                      </div>
                    )}
                    {hall.areaSqFt != null && (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Ruler className="h-3.5 w-3.5 shrink-0" />
                          Hall area
                        </div>
                        <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                          {Number(hall.areaSqFt).toLocaleString("en-IN")} sq. ft.
                        </p>
                      </div>
                    )}
                    {hall.pricingType && (
                      <div className="col-span-2 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          Pricing model
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {hall.pricingType === "per_hour" ? "Hourly booking" : "Per-event booking"}
                        </p>
                      </div>
                    )}
                  </div>

                  {Array.isArray(hall.amenities) && hall.amenities.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Amenities
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {hall.amenities.map((item, amenityIndex) => {
                          const label =
                            typeof item === "string"
                              ? item
                              : item?.name || item?.label || "";

                          return label ? (
                            <span
                              key={`${label}-${amenityIndex}`}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                            >
                              <Check className="h-3 w-3 shrink-0" />
                              <span className="break-words">{label}</span>
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-5">
                    {hall.rate != null && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500">
                          {hall.pricingType === "per_hour" ? "Starting rate per hour" : "Starting rate per event"}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                          {formatRate(hall.rate)}
                        </p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleBookHall(hall)}
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-slate-900 px-4 py-3 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                    >
                      Book this hall
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
