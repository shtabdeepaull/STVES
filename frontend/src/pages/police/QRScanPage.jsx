// ============================================================
// QR Scanner Page - Simulated QR code scanning for vehicles
// In a real deployment, this would use a camera-based QR reader
// ============================================================
import { useMemo, useState } from "react";
import { parseSTVESQR, buildVehicleQRFromVehicle } from "../../utils/qr";
import {
  QrCode,
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import useStore from "../../store/useStore";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

export default function QRScanPage({ onNavigate, setVerificationResult }) {
  const { vehicles = [], licenses = []} = useStore();

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedQR, setSelectedQR] = useState("");

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("stves_token") ||
      ""
    );
  };

  const apiGet = async (path) => {
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || data.error || "Request failed");
    }

    return data;
  };

  const safeText = (value, fallback = "N/A") => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "string" || typeof value === "number") return value;
    if (typeof value === "object") {
      return value.name || value.email || value._id || value.id || fallback;
    }
    return fallback;
  };

  const parseQRCode = (qrValue) => {
  return parseSTVESQR(qrValue);
};

    const normalizeVehicleResult = (data) => {
    const vehicle = data.vehicle || {};
    const verification = data.verification || {};
    const issues = Array.isArray(verification.issues)
      ? verification.issues
      : Array.isArray(data.issues)
        ? data.issues
        : [];

    const status = vehicle.status || "unknown";
    const verificationResult = verification.result || "unknown";

    const isCompliant =
      verificationResult === "valid" &&
      issues.length === 0 &&
      status !== "suspended" &&
      status !== "blacklisted";

    return {
      found: true,
      type: "vehicle",
      isCompliant,
      message: isCompliant
        ? "Vehicle is compliant"
        : "Vehicle has compliance issues",
      vehicle: {
        id: vehicle._id || vehicle.id,
        plateNumber:
          vehicle.registrationNumber ||
          vehicle.plateNumber ||
          vehicle.plate ||
          "N/A",
        brand: vehicle.brand || "N/A",
        model: vehicle.model || "N/A",
        vehicleType: vehicle.vehicleType || vehicle.type || "N/A",
        color: vehicle.color || "N/A",
        status,
      },
      owner: vehicle.owner || data.owner || null,
    safetyScore:
      verification.safetyScore ??
      verification.complianceScore ??
      verification.score ??
      vehicle.safetyScore ??
      data.safetyScore ??
      data.complianceScore ??
      0,
    riskLevel:
      verification.riskLevel ??
      vehicle.riskLevel ??
      data.riskLevel ??
      "Unknown Risk",
      issues,
      authorizedDrivers: vehicle.authorizedDrivers || [],
      raw: data,
    };
  };

    const normalizeLicenseResult = (data) => {
    const license = data.license || {};
    const verification = data.verification || {};
    const issues = Array.isArray(verification.issues)
  ? verification.issues
  : Array.isArray(data.issues)
    ? data.issues
    : [];

    const status = license.status || "unknown";
    const verificationResult = verification.result || "unknown";

    const isCompliant =
      verificationResult === "valid" &&
      ["active", "valid"].includes(String(status).toLowerCase());

    return {
      found: true,
      type: "license",
      isCompliant,
      message: isCompliant ? "License is valid" : "License has issues",
      license: {
        id: license._id || license.id,
        licenseNumber: license.licenseNumber || "N/A",
        holderName: license.holderName || "N/A",
        licenseClass: license.licenseClass || "N/A",
        status,
      },
      driver: license.driver || data.driver || null,
      safetyScore:
        verification.safetyScore ??
        verification.complianceScore ??
        verification.score ??
        license.safetyScore ??
        data.safetyScore ??
        data.complianceScore ??
        100,
      riskLevel:
        verification.riskLevel ??
        license.riskLevel ??
        data.riskLevel ??
        "Unknown Risk",
            issues,
            authorizedVehicles: data.authorizedVehicles || [],
            raw: data,
          };
        };

  const handleQRScan = async (qrValue) => {
    setSelectedQR(qrValue);
    setResult(null);
    setScanning(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const parsed = parseQRCode(qrValue);

      if (!parsed?.valid) {
        setResult({
          found: false,
          message: parsed?.message || "Invalid QR Code",
        });
        return;
      }

      let data;

      if (parsed.type === "vehicle") {
        data = await apiGet(
          `/vehicles/verify/${encodeURIComponent(parsed.value)}`
        );
        setResult(normalizeVehicleResult(data));
        return;
      }

      if (parsed.type === "license") {
        data = await apiGet(
          `/licenses/verify/${encodeURIComponent(parsed.value)}`
        );
        setResult(normalizeLicenseResult(data));
        return;
      }

      setResult({
        found: false,
        message: "Unsupported QR Code",
      });
    } catch (err) {
      console.error("QR scan failed:", err);
      setResult({
        found: false,
        message: err.message || "QR verification failed",
      });
    } finally {
      setScanning(false);
    }
  };

  const handleCreateCase = () => {
    if (result && result.found && !result.isCompliant) {
      setVerificationResult?.(result);
      onNavigate?.("create-case");
    }
  };

  const simulatedQRs = useMemo(() => {
    const sourceVehicles =
      Array.isArray(vehicles) && vehicles.length > 0
        ? vehicles
        : [
            {
              id: "demo-vehicle",
              _id: "demo-vehicle",
              registrationNumber: "SYL-METRO-GA-11-1234",
              brand: "Toyota",
              model: "Axio",
              qrCode: "STVES-VEH:SYL-METRO-GA-11-1234",
            },
          ];

    return sourceVehicles.map((v) => {
      const plate =
        v.registrationNumber || v.plateNumber || v.plate || "UNKNOWN-PLATE";

      const qrCode = buildVehicleQRFromVehicle({
      ...v,
      qrCode: "",
      registrationNumber: plate,
    });

      return {
        id: v._id || v.id || plate,
        plate,
        brand: v.brand || "N/A",
        model: v.model || "N/A",
        qrCode,
      };
    });
  }, [vehicles]);


const simulatedLicenseQRs = useMemo(() => {
  const sourceLicenses =
    Array.isArray(licenses) && licenses.length > 0
      ? licenses
      : [
          {
            id: "demo-license",
            _id: "demo-license",
            licenseNumber: "DL-SYL-2026-001",
            holderName: "Driver User",
            licenseClass: "light",
            qrCode: "STVES-LIC:DL-SYL-2026-001",
          },
        ];

  return sourceLicenses.map((lic) => {
    const licenseNumber =
      lic.licenseNumber || lic.number || "UNKNOWN-LICENSE";

    const qrCode =
      typeof lic.qrCode === "string" && lic.qrCode.startsWith("STVES-")
        ? lic.qrCode
        : `STVES-LIC:${licenseNumber}`;

    return {
      id: lic._id || lic.id || licenseNumber,
      licenseNumber,
      holderName: lic.holderName || lic.name || lic.driver?.name || "Driver",
      licenseClass: lic.licenseClass || lic.licenseType || "N/A",
      qrCode,
    };
  });
}, [licenses]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">QR Code Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan a vehicle&apos;s QR code for instant verification. Select a
          simulated QR code below.
        </p>
      </div>

      {/* Scanner simulation */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Camera size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Simulated QR Scanner
            </h3>
            <p className="text-xs text-gray-400">
              In production, this would activate the device camera
            </p>
          </div>
        </div>

        {/* Scanning animation area */}
        {scanning && (
          <div className="relative w-64 h-64 mx-auto mb-6 bg-gray-900 rounded-2xl overflow-hidden">
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400" />

            <div className="absolute left-4 right-4 h-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50 scan-line" />

            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode size={64} className="text-white/20" />
            </div>

            <p className="absolute bottom-8 left-0 right-0 text-center text-xs text-cyan-400 font-medium">
              Scanning...
            </p>
          </div>
        )}

        {/* Available QR codes */}
        <div>
          <p className="text-sm font-medium text-gray-600 mb-3">
             Select a vehicle QR code to scan:
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {simulatedQRs.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleQRScan(v.qrCode)}
                disabled={scanning}
                className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md disabled:opacity-50 ${
                  selectedQR === v.qrCode && result
                    ? result.found
                      ? result.isCompliant
                        ? "border-green-400 bg-green-50"
                        : "border-red-400 bg-red-50"
                      : "border-red-400 bg-red-50"
                    : "border-gray-200 hover:border-blue-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <QrCode size={24} className="text-gray-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700">
                      {v.plate}
                    </p>
                    <p className="text-xs text-gray-400">
                      {v.brand} {v.model}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      QR: {v.qrCode}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
  <p className="text-sm font-medium text-gray-600 mb-3">
    Select a license QR code to scan:
  </p>

  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {simulatedLicenseQRs.map((lic) => (
      <button
        key={lic.id}
        type="button"
        onClick={() => handleQRScan(lic.qrCode)}
        disabled={scanning}
        className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md disabled:opacity-50 ${
          selectedQR === lic.qrCode && result
            ? result.found
              ? result.isCompliant
                ? "border-green-400 bg-green-50"
                : "border-red-400 bg-red-50"
              : "border-red-400 bg-red-50"
            : "border-gray-200 hover:border-blue-300 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <QrCode size={24} className="text-gray-600" />
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700">
              {lic.licenseNumber}
            </p>

            <p className="text-xs text-gray-400">
              {lic.holderName} | {lic.licenseClass}
            </p>

            <p className="text-[10px] text-gray-400 mt-0.5">
              QR: {lic.qrCode}
            </p>
          </div>
        </div>
      </button>
    ))}
  </div>
</div>
      </div>

      {/* Scan Result */}
      {!scanning && result && (
        <div className="animate-fade-in space-y-4">
          {!result.found ? (
            <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
              <XCircle size={40} className="text-red-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Invalid QR Code</h3>
              <p className="text-sm text-gray-500">{result.message}</p>
            </div>
          ) : (
            <>
              {/* Status banner */}
              <div
                className={`rounded-2xl p-5 flex items-center gap-4 ${
                  result.isCompliant
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                {result.isCompliant ? (
                  <CheckCircle size={32} className="text-green-500" />
                ) : (
                  <AlertTriangle size={32} className="text-red-500" />
                )}

                <div className="flex-1">
                  <h3
                    className={`text-lg font-bold ${
                      result.isCompliant ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {result.isCompliant
                      ? result.type === "license"
                        ? "✅ License is Valid"
                        : "✅ All Clear — Vehicle Compliant"
                      : "⚠️ Issues Detected"}
                  </h3>

                  <p className="text-sm text-gray-600 mt-1">
                    {result.type === "license"
                      ? `${result.license.licenseNumber} — ${result.license.holderName}`
                      : `${result.vehicle.plateNumber} — ${result.vehicle.brand} ${result.vehicle.model}`}
                  </p>
                </div>

                {!result.isCompliant && result.type === "vehicle" && (
                  <button
                    type="button"
                    onClick={handleCreateCase}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-2 shrink-0"
                  >
                    <FileWarning size={16} />
                    Issue E-Challan
                  </button>
                )}
              </div>

              {/* Vehicle Result */}
              {result.type === "vehicle" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Vehicle</p>
                      <p className="text-sm font-medium text-gray-700">
                        {result.vehicle.plateNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {result.vehicle.vehicleType} | {result.vehicle.color}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Owner</p>
                      <p className="text-sm font-medium text-gray-700">
                        {safeText(result.owner)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {result.owner?.phone || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Safety Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              result.safetyScore >= 80
                                ? "bg-green-500"
                                : result.safetyScore >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${result.safetyScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-700">
                          {result.safetyScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* License Result */}
              {result.type === "license" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">License No.</p>
                      <p className="text-sm font-medium text-gray-700">
                        {result.license.licenseNumber}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Class: {result.license.licenseClass}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">Driver</p>
                      <p className="text-sm font-medium text-gray-700">
                        {safeText(result.driver, result.license.holderName)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Status: {result.license.status}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Authorized Vehicles
                      </p>
                      <p className="text-sm font-medium text-gray-700">
                        {result.authorizedVehicles?.length || 0}
                      </p>
                    </div>

                    <div>
                    <p className="text-xs text-gray-400">Safety Score</p>

                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            result.safetyScore >= 80
                              ? "bg-green-500"
                              : result.safetyScore >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${result.safetyScore}%` }}
                        />
                      </div>

                      <span className="text-sm font-bold text-gray-700">
                        {result.safetyScore}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* Issues */}
              {Array.isArray(result.issues) && result.issues.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h4 className="text-sm font-semibold text-red-600 mb-3">
                    Issues ({result.issues.length})
                  </h4>

                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2 bg-red-50 rounded-lg"
                      >
                        <XCircle size={14} className="text-red-500 shrink-0" />
                        <span className="text-sm text-red-700">
                          {typeof issue === "string" ? issue : issue.message || "Issue detected"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}