import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Save, Percent, ArrowLeft } from "lucide-react";
import api from "../../../api/axiosInstance";
import { Link } from "react-router-dom";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function GstSettings() {
  const [slabs, setSlabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [samplePrice, setSamplePrice] = useState(5000);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/settings/gst");
        const rows = res.data?.data?.settings?.roomSlabs || [];
        setSlabs(rows.map((s) => ({ upTo: s.upTo ?? "", percent: s.percent })));
      } catch (e) {
        toast.error(
          e?.response?.data?.message || "Could not load GST settings",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (index, field, value) =>
    setSlabs((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );

  
  const addSlab = () =>
    setSlabs((rows) => {
      const last = rows[rows.length - 1];
      const prev = rows[rows.length - 2];
      const next = (Number(prev?.upTo) || 0) + 1000;
      return [...rows.slice(0, -1), { upTo: next, percent: 12 }, last];
    });

  const removeSlab = (index) =>
    setSlabs((rows) =>
      rows.length > 1 ? rows.filter((_, i) => i !== index) : rows,
    );

  const example = useMemo(() => {
    const price = Number(samplePrice) || 0;
    const slab = slabs.find((s) => s.upTo === "" || price <= Number(s.upTo));
    const percent = Number(slab?.percent) || 0;
    const tax = Math.round((price * percent) / 100);
    return { percent, tax, total: price + tax };
  }, [slabs, samplePrice]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = slabs.map((s, i) => ({
        upTo: i === slabs.length - 1 ? null : Number(s.upTo),
        percent: Number(s.percent),
      }));
      const res = await api.put("/settings/gst", { roomSlabs: payload });
      const rows = res.data?.data?.settings?.roomSlabs || payload;
      setSlabs(rows.map((s) => ({ upTo: s.upTo ?? "", percent: s.percent })));
      toast.success("GST settings saved");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save GST settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="mx-auto  space-y-6 ">
      <Link
        to="/rooms"
        className="inline-flex items-center gap-2 rounded text-sm font-medium text-gray-600 transition-colors hover:text-black"
      >
        <ArrowLeft size={18} />
        <span>Back to Rooms</span>
      </Link>

      <div className="flex items-center gap-3">
        <div className="rounded bg-indigo-50 p-2.5 text-indigo-600">
          <Percent size={22} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">GST Settings</h1>
          <p className="text-sm text-gray-500">
            Room GST rate per-night price ke hisaab se lagta hai. Naye slabs
            sirf nayi bookings par lagu honge, purani bookings ka tax nahi
            badlega.
          </p>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_40px] gap-3 px-1 pb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          <span>Room price per night (up to)</span>
          <span>GST %</span>
          <span />
        </div>

        <div className="space-y-2">
          {slabs.map((slab, index) => {
            const isLast = index === slabs.length - 1;
            return (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_40px] items-center gap-3"
              >
                {isLast ? (
                  <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    {slabs.length > 1 &&
                      `Above ${money(slabs[index - 1]?.upTo)}`}
                    {slabs.length === 1 && "All prices"}
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={slab.upTo}
                    onChange={(e) => update(index, "upTo", e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="e.g. 7500"
                  />
                )}

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={slab.percent}
                  onChange={(e) => update(index, "percent", e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => removeSlab(index)}
                  disabled={slabs.length === 1}
                  className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                  aria-label="Remove slab"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addSlab}
            disabled={slabs.length >= 10}
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            <Plus size={16} /> Add slab
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">
          Quick check
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="text-gray-600">Room price per night</label>
          <input
            type="number"
            min="0"
            value={samplePrice}
            onChange={(e) => setSamplePrice(e.target.value)}
            className="w-32 rounded border border-gray-300 px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
          />
          <span className="text-gray-500">
            GST {example.percent}% = {money(example.tax)} &rarr; Total{" "}
            <b className="text-gray-900">{money(example.total)}</b>
          </span>
        </div>
      </div>
    </div>
  );
}
