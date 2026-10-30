import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  Check,
  CircleDollarSign,
  ImagePlus,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Sparkles,
  Users,
  Wifi,
  Wind,
  Tv,
  Coffee,
  Bath,
  X,
  Building2,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  createRoomType,
  getRoomTypeById,
  updateRoomType,
} from "../services/rooms.service";

import { FormSkeleton } from "../../../components/common/Skeleton";

const BED_TYPES = ["single", "double", "queen", "king", "twin"];
const MAX_IMAGES = 6;
const MAX_SIZE_MB = 5;
const BACK_PATH = "/rooms?tab=types";

const inputClass =
  "w-full rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-60";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

const emptyForm = {
  name: "",
  description: "",
  basePrice: "",
  adults: 2,
  children: 0,
  bedType: "double",
  sizeSqFt: "",
  amenities: "",
};

const BED_META = {
  single: { label: "Single", detail: "1 single bed" },
  double: { label: "Double", detail: "1 double bed" },
  queen: { label: "Queen", detail: "1 queen bed" },
  king: { label: "King", detail: "1 king bed" },
  twin: { label: "Twin", detail: "2 single beds" },
};

const AMENITY_SUGGESTIONS = [
  { label: "WiFi", icon: Wifi },
  { label: "AC", icon: Wind },
  { label: "TV", icon: Tv },
  { label: "Mini Bar", icon: Coffee },
  { label: "Bathtub", icon: Bath },
];

const toForm = (roomType) => ({
  name: roomType.name || "",
  description: roomType.description || "",
  basePrice: roomType.basePrice ?? "",
  adults: roomType.capacity?.adults ?? 2,
  children: roomType.capacity?.children ?? 0,
  bedType: roomType.bedType || "double",
  sizeSqFt: roomType.sizeSqFt ?? "",
  amenities: (roomType.amenities || []).join(","),
});

const SectionTitle = ({ icon: Icon, eyebrow, title, description }) => (
  <div className="mb-6 flex items-start gap-3.5">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-black text-indigo-600">
      <Icon size={21} />
    </div>
    <div className="min-w-0">
      {eyebrow && (
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
    </div>
  </div>
);

const RoomTypeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [removedIds, setRemovedIds] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [dragging, setDragging] = useState(false);

  const newImagesRef = useRef(newImages);
  newImagesRef.current = newImages;

  const keptExisting = existingImages.filter(
    (image) => !removedIds.includes(image.publicId),
  );

  const totalImages = keptExisting.length + newImages.length;

  const amenitiesList = form.amenities
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!isEdit) return undefined;

    let active = true;

    const loadRoomType = async () => {
      try {
        const data = await getRoomTypeById(id);
        if (!active) return;

        const roomType = data.roomType || data;

        setForm(toForm(roomType));
        setExistingImages(roomType.images || []);
      } catch (error) {
        if (!active) return;

        console.error("Room type loading failed:", error);

        toast.error(
          error.response?.data?.message || "Could not load room type details",
        );

        navigate(BACK_PATH, { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadRoomType();

    return () => {
      active = false;
    };
  }, [id, isEdit, navigate]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach((item) => {
        URL.revokeObjectURL(item.preview);
      });
    };
  }, []);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const slotsLeft = MAX_IMAGES - totalImages;

    if (slotsLeft <= 0) {
      toast.error(`You can upload up to ${MAX_IMAGES} images`);
      return;
    }

    const accepted = [];
    let rejected = 0;

    incoming.forEach((file) => {
      if (
        ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
        file.size <= MAX_SIZE_MB * 1024 * 1024
      ) {
        accepted.push(file);
      } else {
        rejected += 1;
      }
    });

    if (rejected) {
      toast.error(
        `${rejected} file(s) skipped. Use images up to ${MAX_SIZE_MB} MB each.`,
      );
    }

    if (accepted.length > slotsLeft) {
      toast.error(`Only ${slotsLeft} more image(s) can be added`);
    }

    const added = accepted.slice(0, slotsLeft).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    if (added.length) {
      setNewImages((prev) => [...prev, ...added]);
    }
  };

  const handleFileInput = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    if (!submitting) addFiles(e.dataTransfer.files);
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => {
      const item = prev[index];

      if (item) URL.revokeObjectURL(item.preview);

      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (publicId) => {
    if (!publicId) {
      toast.error("This image cannot be removed because its ID is missing.");
      return;
    }

    setRemovedIds((prev) =>
      prev.includes(publicId) ? prev : [...prev, publicId],
    );
  };

  const toggleAmenity = (amenity) => {
    const exists = amenitiesList.some(
      (item) => item.toLowerCase() === amenity.toLowerCase(),
    );

    const updated = exists
      ? amenitiesList.filter(
          (item) => item.toLowerCase() !== amenity.toLowerCase(),
        )
      : [...amenitiesList, amenity];

    updateField("amenities", updated.join(","));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const price = Number(form.basePrice);
    const adults = Number(form.adults);
    const children = Number(form.children || 0);
    const size = Number(form.sizeSqFt || 0);

    if (!form.name.trim()) {
      toast.error("Enter a room type name");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid base price");
      return;
    }

    if (!Number.isInteger(adults) || adults < 1 || adults > 50) {
      toast.error("Adult capacity must be between 1 and 50");
      return;
    }

    if (
      !Number.isInteger(children) ||
      children < 0 ||
      children > 50 ||
      !Number.isFinite(size) ||
      size < 0
    ) {
      toast.error("Enter valid capacity and room size");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      basePrice: price,
      capacity: { adults, children },
      bedType: form.bedType,
      sizeSqFt: size,
      amenities: amenitiesList,
    };

    if (isEdit) payload.removeImages = removedIds;

    const formData = new FormData();
    formData.append("data", JSON.stringify(payload));

    newImages.forEach((item) => {
      formData.append("images", item.file);
    });

    setSubmitting(true);

    try {
      if (isEdit) {
        await updateRoomType(id, formData);
        toast.success("Room type updated successfully");
      } else {
        await createRoomType(formData);
        toast.success("Room type created successfully");
      }

      navigate(BACK_PATH);
    } catch (error) {
      console.error(
        "Room type submission failed:",
        error.response?.data || error,
      );

      toast.error(error.response?.data?.message || "Something went wrong");

      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f5f7fc] text-slate-800">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8 xl:px-10">
          <Link
            to={BACK_PATH}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500"
          >
            <ArrowLeft size={16} />
            Back to Room Types
          </Link>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-black text-white">
                <BedDouble size={28} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                    {isEdit ? "Edit Room Type" : "Create Room Type"}
                  </h1>

                  <span className="rounded-full border border-indigo-100 bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                    {isEdit ? "Edit mode" : "New category"}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Define the room experience, nightly rate, guest capacity,
                  amenities and photos for your property.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3.5 sm:max-w-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white text-indigo-600">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Room category setup
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Configure once, use across rooms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
        {loading ? (
          <div className="rounded border border-slate-200 bg-white p-5 sm:p-8">
            <FormSkeleton fields={6} />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="min-w-0 space-y-6">
                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={Building2}
                    eyebrow="01 / Overview"
                    title="Room Identity"
                    description="Give this room category a clear name and description."
                  />

                  <div className="space-y-5">
                    <div>
                      <label htmlFor="name" className={labelClass}>
                        Room Type Name <span className="text-rose-500">*</span>
                      </label>

                      <input
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="e.g. Deluxe King Suite"
                        required
                        maxLength={100}
                        disabled={submitting}
                        className={inputClass}
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        Choose a name your front desk team and guests can
                        recognize easily.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="description" className={labelClass}>
                        Description
                      </label>

                      <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={(e) =>
                          updateField("description", e.target.value)
                        }
                        rows={4}
                        maxLength={1500}
                        placeholder="Describe the room, its atmosphere and key features..."
                        disabled={submitting}
                        className={`${inputClass} min-h-28 resize-y`}
                      />

                      <div className="mt-2 flex justify-end">
                        <span className="text-xs text-slate-400">
                          {form.description.length}/1500
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={CircleDollarSign}
                    eyebrow="02 / Pricing"
                    title="Pricing & Room Size"
                    description="Set the standard nightly rate and room dimensions."
                  />

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label htmlFor="basePrice" className={labelClass}>
                        Base Price / Night{" "}
                        <span className="text-rose-500">*</span>
                      </label>

                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">
                          ₹
                        </span>

                        <input
                          id="basePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          name="basePrice"
                          value={form.basePrice}
                          onChange={(e) =>
                            updateField("basePrice", e.target.value)
                          }
                          placeholder="3500"
                          required
                          disabled={submitting}
                          className={`${inputClass} pl-9 text-base font-semibold`}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Standard price before any room-specific override.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="sizeSqFt" className={labelClass}>
                        Room Area
                      </label>

                      <div className="relative">
                        <Maximize2
                          size={17}
                          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          id="sizeSqFt"
                          type="number"
                          min="0"
                          step="1"
                          name="sizeSqFt"
                          value={form.sizeSqFt}
                          onChange={(e) =>
                            updateField("sizeSqFt", e.target.value)
                          }
                          placeholder="280"
                          disabled={submitting}
                          className={`${inputClass} pr-16 pl-11`}
                        />

                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                          SQ FT
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-400">
                        Enter the approximate usable room area.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={Users}
                    eyebrow="03 / Configuration"
                    title="Guest Capacity & Bed Setup"
                    description="Configure how many guests can stay and which bed arrangement is provided."
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <label
                          htmlFor="adults"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Adults
                        </label>
                        <Users size={17} className="text-indigo-500" />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Adult capacity
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "adults",
                                Math.max(1, Number(form.adults) - 1),
                              )
                            }
                            disabled={submitting || Number(form.adults) <= 1}
                            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                            aria-label="Decrease adult capacity"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            id="adults"
                            type="number"
                            min="1"
                            max="50"
                            name="adults"
                            value={form.adults}
                            onChange={(e) =>
                              updateField("adults", e.target.value)
                            }
                            required
                            disabled={submitting}
                            className="w-12 border-0 bg-transparent p-0 text-center text-lg font-extrabold text-slate-900 outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "adults",
                                Math.min(50, Number(form.adults) + 1),
                              )
                            }
                            disabled={submitting || Number(form.adults) >= 50}
                            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                            aria-label="Increase adult capacity"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded border border-slate-200 bg-slate-50/70 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <label
                          htmlFor="children"
                          className="text-sm font-semibold text-slate-700"
                        >
                          Children
                        </label>
                        <Users size={17} className="text-violet-500" />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Child capacity
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "children",
                                Math.max(0, Number(form.children) - 1),
                              )
                            }
                            disabled={submitting || Number(form.children) <= 0}
                            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                            aria-label="Decrease child capacity"
                          >
                            <Minus size={15} />
                          </button>

                          <input
                            id="children"
                            type="number"
                            min="0"
                            max="50"
                            name="children"
                            value={form.children}
                            onChange={(e) =>
                              updateField("children", e.target.value)
                            }
                            disabled={submitting}
                            className="w-12 border-0 bg-transparent p-0 text-center text-lg font-extrabold text-slate-900 outline-none"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "children",
                                Math.min(50, Number(form.children) + 1),
                              )
                            }
                            disabled={submitting || Number(form.children) >= 50}
                            className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 disabled:opacity-40"
                            aria-label="Increase child capacity"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className={labelClass}>Bed Arrangement</label>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {BED_TYPES.map((bed) => {
                        const selected = form.bedType === bed;

                        return (
                          <button
                            key={bed}
                            type="button"
                            onClick={() => updateField("bedType", bed)}
                            disabled={submitting}
                            className={`relative flex min-w-0 flex-col items-center rounded border p-4 text-center ${
                              selected
                                ? "border-indigo-500 bg-black ring-2 ring-indigo-100"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <BedDouble
                              size={25}
                              className={
                                selected ? "text-indigo-600" : "text-slate-400"
                              }
                            />

                            <span className="mt-3 text-sm font-bold capitalize text-slate-800">
                              {BED_META[bed].label}
                            </span>

                            <span className="mt-1 text-[10px] leading-4 text-slate-500">
                              {BED_META[bed].detail}
                            </span>

                            {selected && (
                              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white">
                                <Check size={12} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={Sparkles}
                    eyebrow="04 / Experience"
                    title="Room Amenities"
                    description="Select popular amenities or enter your own comma-separated list."
                  />

                  <div className="flex flex-wrap gap-2">
                    {AMENITY_SUGGESTIONS.map(({ label, icon: Icon }) => {
                      const active = amenitiesList.some(
                        (item) => item.toLowerCase() === label.toLowerCase(),
                      );

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleAmenity(label)}
                          disabled={submitting}
                          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold ${
                            active
                              ? "border-indigo-500 bg-black text-indigo-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          <Icon size={15} />
                          {label}
                          {active && <Check size={14} />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <label htmlFor="amenities" className={labelClass}>
                      All Amenities
                    </label>

                    <input
                      id="amenities"
                      name="amenities"
                      value={form.amenities}
                      onChange={(e) => updateField("amenities", e.target.value)}
                      placeholder="WiFi, AC, TV, Mini Bar, Bathtub"
                      disabled={submitting}
                      className={inputClass}
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Separate each amenity with a comma.
                    </p>
                  </div>

                  {amenitiesList.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {amenitiesList.map((item, index) => (
                        <span
                          key={`${item}-${index}`}
                          className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-7">
                  <SectionTitle
                    icon={ImagePlus}
                    eyebrow="05 / Gallery"
                    title="Room Type Photos"
                    description="Upload up to six images to represent this room category."
                  />

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-600">
                      Gallery images
                    </p>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {totalImages} / {MAX_IMAGES}
                    </span>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!submitting) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`rounded border-2 border-dashed p-4 sm:p-6 ${
                      dragging
                        ? "border-indigo-400 bg-black"
                        : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    {totalImages > 0 && (
                      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                        {keptExisting.map((image, index) => (
                          <div
                            key={image.publicId || image.url}
                            className="relative aspect-[4/3] overflow-hidden rounded border border-slate-200 bg-white"
                          >
                            <img
                              src={image.url}
                              alt={`Room type ${index + 1}`}
                              className="h-full w-full object-cover"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                removeExistingImage(image.publicId)
                              }
                              disabled={submitting}
                              aria-label="Remove saved image"
                              className="absolute right-2 top-2 rounded bg-slate-950/75 p-2 text-white disabled:opacity-50 sm:opacity-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {newImages.map((item, index) => (
                          <div
                            key={item.preview}
                            className="relative aspect-[4/3] overflow-hidden rounded border border-indigo-200 bg-white"
                          >
                            <img
                              src={item.preview}
                              alt={`New room image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />

                            <span className="absolute bottom-2 left-2 rounded bg-black px-2 py-1 text-[10px] font-bold uppercase text-white">
                              New
                            </span>

                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              disabled={submitting}
                              aria-label="Remove new image"
                              className="absolute right-2 top-2 rounded bg-slate-950/75 p-2 text-white disabled:opacity-50"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting || totalImages >= MAX_IMAGES}
                      className="flex min-h-36 w-full flex-col items-center justify-center rounded px-4 py-6 text-center disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded bg-black text-indigo-600">
                        <ImagePlus size={23} />
                      </span>

                      <span className="mt-3 text-sm font-bold text-slate-800">
                        Click to upload or drag and drop
                      </span>

                      <span className="mt-1 text-xs text-slate-500">
                        JPG, PNG or WEBP · Up to {MAX_SIZE_MB} MB per image
                      </span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFileInput}
                      disabled={submitting || totalImages >= MAX_IMAGES}
                      className="hidden"
                    />
                  </div>
                </section>
              </div>

              <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
                <section className="overflow-hidden rounded border border-slate-200/80 bg-white">
                  <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-indigo-700 to-violet-700 p-6 text-white sm:p-7">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-white/10" />
                    <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full border border-white/10" />

                    <div className="relative flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-200">
                        Live Preview
                      </span>

                      <span className="rounded bg-white/15 p-2.5">
                        <BedDouble size={21} />
                      </span>
                    </div>

                    <div className="relative mt-8">
                      <p className="text-sm text-indigo-200">Room category</p>

                      <h2 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
                        {form.name.trim() || "Your Room Type"}
                      </h2>

                      <p className="mt-3 text-sm text-indigo-100">
                        {BED_META[form.bedType]?.detail}
                      </p>
                    </div>

                    <div className="relative mt-7 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                        {Number(form.adults) || 0} Adults
                      </span>

                      <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                        {Number(form.children) || 0} Children
                      </span>

                      {Number(form.sizeSqFt) > 0 && (
                        <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                          {form.sizeSqFt} sq ft
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Standard nightly rate
                    </p>

                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="text-3xl font-black tracking-tight text-slate-900">
                        {form.basePrice !== "" &&
                        Number.isFinite(Number(form.basePrice))
                          ? `₹${Number(form.basePrice).toLocaleString("en-IN")}`
                          : "₹—"}
                      </span>

                      <span className="text-sm text-slate-500">/ night</span>
                    </div>

                    <div className="my-5 border-t border-slate-100" />

                    <h3 className="text-sm font-bold text-slate-800">
                      Included amenities
                    </h3>

                    {amenitiesList.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {amenitiesList.map((item, index) => (
                          <span
                            key={`${item}-${index}`}
                            className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">
                        Amenities will appear here.
                      </p>
                    )}

                    <div className="mt-5 rounded bg-black p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-white text-indigo-600">
                          <Sparkles size={18} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            Room experience
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {form.description.trim() ||
                              "Your room description will appear here once you add it."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded border border-slate-200/80 bg-white p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-50 text-emerald-600">
                      <Check size={20} />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Setup checklist
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Review before saving
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        label: "Room type name",
                        complete: Boolean(form.name.trim()),
                      },
                      {
                        label: "Nightly price",
                        complete:
                          form.basePrice !== "" &&
                          Number.isFinite(Number(form.basePrice)) &&
                          Number(form.basePrice) >= 0,
                      },
                      {
                        label: "Guest capacity",
                        complete: Number(form.adults) >= 1,
                      },
                      {
                        label: "Bed arrangement",
                        complete: Boolean(form.bedType),
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            item.complete
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {" "}
                          <Check size={12} />{" "}
                        </span>{" "}
                        <span
                          className={`text-sm ${
                            item.complete
                              ? "font-medium text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            <div className="mt-6 rounded border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {isEdit
                      ? "Ready to save your changes?"
                      : "Ready to create this room category?"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your room details and pricing will be saved to your
                    property.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate(BACK_PATH)}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 disabled:opacity-60"
                  >
                    <ArrowLeft size={16} />
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded bg-black px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 size={17} className="" />
                    ) : (
                      <Save size={17} />
                    )}

                    {submitting
                      ? "Saving..."
                      : isEdit
                        ? "Update Room Type"
                        : "Create Room Type"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default RoomTypeForm;
