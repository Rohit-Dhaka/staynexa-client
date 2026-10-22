
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRDownloadButton({
  value,
  orderNumber = "",
  size = 220,
  disabled = false,
}) {
  const qrRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const getFileName = (extension) => {
    const safeName = String(orderNumber || "order-qr")
      .replace(/[^a-zA-Z0-9_-]/g, "-");

    return `${safeName}.${extension}`;
  };

  const downloadFile = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const getSvgElement = () =>
    qrRef.current?.querySelector("svg");

  const downloadSVG = () => {
    setError("");

    const svg = getSvgElement();

    if (!value || !svg) {
      setError("QR code is not available to download.");
      return;
    }

    let url;

    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const svgData = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });

      url = URL.createObjectURL(blob);
      downloadFile(url, getFileName("svg"));
    } catch {
      setError("Unable to download the SVG QR code.");
    } finally {
      if (url) {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
  };

  const downloadPNG = async () => {
    setError("");

    const svg = getSvgElement();

    if (!value || !svg) {
      setError("QR code is not available to download.");
      return;
    }

    setDownloading(true);

    let svgUrl;
    let pngUrl;

    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      const svgData = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });

      svgUrl = URL.createObjectURL(blob);

      const image = new Image();

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = svgUrl;
      });

      const canvas = document.createElement("canvas");
      const scale = 3;

      canvas.width = size * scale;
      canvas.height = size * scale;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Canvas is unavailable.");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const pngBlob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });

      if (!pngBlob) {
        throw new Error("PNG conversion failed.");
      }

      pngUrl = URL.createObjectURL(pngBlob);
      downloadFile(pngUrl, getFileName("png"));
    } catch {
      setError("Unable to download the PNG QR code.");
    } finally {
      if (svgUrl) URL.revokeObjectURL(svgUrl);

      if (pngUrl) {
        window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
      }

      setDownloading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      <div
        ref={qrRef}
        className="flex min-h-[220px] min-w-[220px] items-center justify-center rounded bg-white p-2"
      >
        {value ? (
          <QRCodeSVG
            value={value}
            size={size}
            level="H"
            includeMargin
            title={`Order ${orderNumber || ""} tracking QR code`}
          />
        ) : (
          <p className="max-w-48 text-center text-sm text-gray-500">
            QR code is not available.
          </p>
        )}
      </div>

      <div className="mt-4 grid w-full ">
        <button
          type="button"
          onClick={downloadPNG}
          disabled={disabled || !value || downloading}
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-black px-4 py-2.5 text-sm font-semibold text-white transition  disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloading ? "Preparing PNG..." : "Download PNG"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-center text-sm text-red-600"
        >
          {error}
        </p>
      )}

      <p className="mt-3 text-center text-xs text-gray-500">
        Save this QR code to access your order tracking link.
      </p>
    </div>
  );
}
