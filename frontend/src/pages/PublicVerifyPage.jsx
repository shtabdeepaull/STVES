// ============================================================
// Public Verify Page
// Public limited QR verification page for STVES
// Shows only safe public information
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Loader2,
  QrCode,
  Search,
} from "lucide-react";
import api from "../lib/api";
import { parseSTVESQR } from "../utils/qr";

const getQueryParam = (key) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || "";
};

const normalizePublicResult = (response, parsed) => {
  const data = response?.data || response || {};

  if (parsed?.type === "vehicle") {
    const vehicle = data.vehicle || data.data || data;

    return {
      found: response?.success !== false,
      type: "vehicle",
      title: "Vehicle Verification",
      identifier:
        vehicle.registrationNumber ||
        vehicle.plateNumber ||
        vehicle.plate ||
        parsed.value,
      status: vehicle.status || data.status || "unknown",
      valid: (() => {
        const statusValue = String(
          license.status || data.status || ""
        ).toLowerCase();

        const isStatusValid = ["active", "valid"].includes(statusValue);

        if (isStatusValid) return true;

        return Boolean(license.valid ?? data.valid);
      })(),
      brand: vehicle.brand || data.brand || "Hidden",
      model: vehicle.model || data.model || "Hidden",
      message: response?.message || "Vehicle QR verified.",
    };
  }

  if (parsed?.type === "license") {
    const license = data.license || data.data || data;

    return {
      found: response?.success !== false,
      type: "license",
      title: "License Verification",
      identifier: license.licenseNumber || data.licenseNumber || parsed.value,
      status: license.status || data.status || "unknown",
      valid:
        license.valid ??
        data.valid ??
        ["active", "valid"].includes(
          String(license.status || data.status || "").toLowerCase()
        ),
      holderName: license.holderName || data.holderName || "Hidden",
      licenseClass:
        license.licenseClass || license.licenseType || data.licenseClass || "N/A",
      message: response?.message || "License QR verified.",
    };
  }

  return {
    found: false,
    type: "unknown",
    title: "Invalid QR",
    identifier: "",
    status: "invalid",
    valid: false,
    message: "Unsupported QR format.",
  };
};

export default function PublicVerifyPage() {
  const qrFromUrl = useMemo(() => {
    return getQueryParam("qr") || getQueryParam("code") || "";
  }, []);

  const [qrValue, setQrValue] = useState(qrFromUrl);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(qrFromUrl));
  const [error, setError] = useState("");

  const verifyQR = async (value) => {
    try {
      setLoading(true);
      setError("");
      setResult(null);

      const parsed = parseSTVESQR(value);

      if (!parsed.valid) {
        setError(parsed.message || "Invalid STVES QR code.");
        return;
      }

      const response = await api.verifyByQR(parsed.raw);
      const normalized = normalizePublicResult(response, parsed);

      setResult(normalized);
    } catch (err) {
      console.error("Public QR verification failed:", err);
      setError(err.message || "QR verification failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qrFromUrl) {
      verifyQR(qrFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrFromUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!qrValue.trim()) {
      setError("Please enter a QR value.");
      return;
    }

    verifyQR(qrValue.trim());
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-[#0f4c81] px-6 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h1 className="text-xl font-bold">STVES Public Verification</h1>
                <p className="text-sm text-blue-100">
                  Limited public document validity check
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                QR Code Value
              </label>

              <div className="flex gap-2">
                <input
                  value={qrValue}
                  onChange={(e) => setQrValue(e.target.value)}
                  placeholder="STVES-VEH:SYL-METRO-GA-11-1234"
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-3 rounded-xl bg-[#0f4c81] text-white text-sm font-medium disabled:opacity-60 flex items-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Verify
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Supported: STVES-VEH:&lt;plate&gt; or STVES-LIC:&lt;license&gt;
              </p>
            </form>

            {loading && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-center">
                <Loader2
                  size={36}
                  className="mx-auto text-blue-600 animate-spin mb-2"
                />
                <p className="text-sm font-medium text-blue-700">
                  Verifying QR code...
                </p>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
                <XCircle size={24} className="text-red-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-700">
                    Verification Failed
                  </h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {!loading && result && (
              <div
                className={`rounded-2xl border p-5 ${
                  result.valid
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.valid ? (
                    <ShieldCheck size={30} className="text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={30} className="text-red-500 shrink-0" />
                  )}

                  <div className="flex-1">
                    <h3
                      className={`font-bold text-lg ${
                        result.valid ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {result.valid ? "Valid Document" : "Invalid / Not Active"}
                    </h3>

                    <p className="text-sm text-slate-600 mt-1">
                      {result.message}
                    </p>
                  </div>
                </div>

                <div className="mt-5 bg-white/80 rounded-xl border border-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <QrCode size={16} />
                    {result.title}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Identifier</p>
                      <p className="font-medium text-slate-700">
                        {result.identifier}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="font-medium text-slate-700 capitalize">
                        {result.status}
                      </p>
                    </div>

                    {result.type === "vehicle" && (
                      <>
                        <div>
                          <p className="text-xs text-slate-400">Brand</p>
                          <p className="font-medium text-slate-700">
                            {result.brand}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Model</p>
                          <p className="font-medium text-slate-700">
                            {result.model}
                          </p>
                        </div>
                      </>
                    )}

                    {result.type === "license" && (
                      <>
                        <div>
                          <p className="text-xs text-slate-400">Holder</p>
                          <p className="font-medium text-slate-700">
                            {result.holderName}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-400">Class</p>
                          <p className="font-medium text-slate-700">
                            {result.licenseClass}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  Privacy note: Public verification only displays limited
                  validity information. Sensitive personal data is hidden.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Smart Traffic Verification and Enforcement System
        </p>
      </div>
    </div>
  );
}