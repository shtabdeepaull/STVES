// ============================================================
// STVES - Police Verify Vehicle / Driver Page
// File: src/pages/police/VerifyPage.jsx
// Works with backend:
// GET /api/vehicles/verify/:registrationNumber
// GET /api/vehicles/verify/:registrationNumber?driverId=DRIVER_ID
// GET /api/licenses/verify/:licenseNumber
// ============================================================

import { useState } from "react";
import {
  Search,
  Car,
  IdCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileWarning,
  ShieldCheck,
  UserRound,
  CalendarDays,
  Loader2,
} from "lucide-react";

const RAW_API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");

const getToken = () => {
  const directKeys = [
    "token",
    "authToken",
    "stvesToken",
    "stves_token",
    "accessToken",
  ];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const possiblePersistKeys = [
    "stves-auth",
    "stves-auth-storage",
    "stves-store",
    "auth-storage",
    "user-storage",
  ];

  for (const key of possiblePersistKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const token =
        parsed?.state?.token ||
        parsed?.state?.authToken ||
        parsed?.state?.accessToken ||
        parsed?.state?.user?.token ||
        parsed?.token ||
        parsed?.authToken ||
        parsed?.accessToken;

      if (token) return token;
    } catch {
      // ignore invalid localStorage JSON
    }
  }

  return "";
};

const cleanInput = (value) => {
  return String(value || "")
    .trim()
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/^STVES-VEH:/, "")
    .replace(/^STVES-LIC:/, "");
};

const apiGet = async (path) => {
  const token = getToken();

  const cleanBaseUrl = String(API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
  const cleanPath = String(path || "").startsWith("/") ? path : `/${path}`;

  const url = `${cleanBaseUrl}${cleanPath}`;

  console.log("VERIFY API REQUEST:", url);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || `Request failed: ${response.status}`);
  }

  return data;
};

const getId = (item) => {
  if (!item) return "";
  if (typeof item === "object") return item._id || item.id || "";
  return item;
};

const getVehiclePlate = (vehicle) =>
  vehicle?.registrationNumber || vehicle?.plateNumber || "N/A";

const getDriverName = (driver) =>
  typeof driver === "object" ? driver?.name || "N/A" : "N/A";

const getIssueText = (issue) => {
  if (!issue) return "Issue detected.";

  if (typeof issue === "string") return issue;

  if (typeof issue === "object") {
    return issue.message || issue.code || "Issue detected.";
  }

  return String(issue);
};

const normalizeIssues = (issues = []) => {
  if (!Array.isArray(issues)) return [];

  return issues.map((issue) => {
    if (typeof issue === "string") return issue;

    if (issue && typeof issue === "object") {
      return issue.message || issue.code || "Issue detected.";
    }

    return String(issue || "Issue detected.");
  });
};

const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toISOString().split("T")[0];
};

const getStatusColor = (status) => {
  const value = String(status || "").toLowerCase();

  if (["valid", "active", "approved", "paid"].includes(value)) {
    return "bg-green-100 text-green-700";
  }

  if (["pending", "warning"].includes(value)) {
    return "bg-yellow-100 text-yellow-700";
  }

  if (
    ["expired", "suspended", "blacklisted", "revoked", "invalid"].includes(
      value
    )
  ) {
    return "bg-red-100 text-red-700";
  }

  return "bg-gray-100 text-gray-700";
};

const StatusBadge = ({ children }) => (
  <span
    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
      children
    )}`}
  >
    {children || "N/A"}
  </span>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400">{label}</p>
    <p className="mt-1 text-sm font-semibold text-gray-800">
      {value || "N/A"}
    </p>
  </div>
);

export default function VerifyPage({ onNavigate, setVerificationResult }) {
  const [mode, setMode] = useState("vehicle");
  const [searchValue, setSearchValue] = useState("");
  const [driverLicenseValue, setDriverLicenseValue] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetResult = () => {
    setResult(null);
    setError("");
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setSearchValue("");
    setDriverLicenseValue("");
    resetResult();
  };

  const normalizeVehicleResult = (vehicleData, licenseData = null) => {
    const vehicle = vehicleData?.vehicle || null;
    const issues = normalizeIssues(
      vehicleData?.verification?.issues ||
      vehicleData?.issues ||
      vehicleData?.vehicle?.issues ||
      []
    );
    const verificationResult = vehicleData?.verification?.result || "valid";

    return {
      type: "vehicle",
      found: Boolean(vehicle),
      vehicle,
      linkedLicense: licenseData?.license || null,
      authorizedDrivers: vehicleData?.authorizedDrivers || [],
      driverAuthorization: vehicleData?.driverAuthorization || null,
      verification: vehicleData?.verification || {
        result: verificationResult,
        issues,
      },
      issues,
      isCompliant: verificationResult === "valid" && issues.length === 0,
      message: vehicleData?.message || "",
    };
  };

  const normalizeLicenseResult = (licenseData) => {
    const license = licenseData?.license || null;
    const issues = normalizeIssues(
      licenseData?.verification?.issues ||
      licenseData?.issues ||
      licenseData?.license?.issues ||
      []
    );
    const verificationResult = licenseData?.verification?.result || "valid";

    return {
      type: "license",
      found: Boolean(license),
      license,
      driver: license?.driver || licenseData?.driver || null,
      authorizedVehicles: licenseData?.authorizedVehicles || [],
      verification: licenseData?.verification || {
        result: verificationResult,
        issues,
      },
      issues,
      isCompliant: verificationResult === "valid" && issues.length === 0,
      message: licenseData?.message || "",
    };
  };

  const handleVerify = async () => {
    const cleanSearchValue = cleanInput(searchValue);
    const cleanDriverLicenseValue = cleanInput(driverLicenseValue);

    if (!cleanSearchValue) {
      setError(
        mode === "vehicle"
          ? "Please enter a vehicle plate number."
          : "Please enter a driving license number."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      if (mode === "driver") {
        const licenseData = await apiGet(
          `/licenses/verify/${encodeURIComponent(cleanSearchValue)}`
        );

        setResult(normalizeLicenseResult(licenseData));
        return;
      }

      let licenseData = null;
      let driverId = "";

      if (cleanDriverLicenseValue) {
        licenseData = await apiGet(
          `/licenses/verify/${encodeURIComponent(cleanDriverLicenseValue)}`
        );

        const driver = licenseData?.license?.driver || licenseData?.driver;
        driverId = getId(driver);
      }

      const encodedPlate = encodeURIComponent(cleanSearchValue);

      const url = driverId
        ? `/vehicles/verify/${encodedPlate}?driverId=${encodeURIComponent(
          driverId
        )}`
        : `/vehicles/verify/${encodedPlate}`;

      const vehicleData = await apiGet(url);

      setResult(normalizeVehicleResult(vehicleData, licenseData));
    } catch (err) {
      console.error("Verification failed:", err);
      setError(err.message || "Verification failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = () => {
    if (!result || result.type !== "vehicle" || !result.vehicle) return;

    const vehicle = result.vehicle;
    const linkedLicense = result.linkedLicense;

    const driver =
      result.driverAuthorization?.driver ||
      linkedLicense?.driver ||
      result.authorizedDrivers?.[0] ||
      null;

    const preparedResult = {
      ...result,
      found: true,
      vehicle: {
        ...vehicle,
        id: getId(vehicle),
        _id: getId(vehicle),
        plateNumber: getVehiclePlate(vehicle),
        registrationNumber: getVehiclePlate(vehicle),
      },
      driver,
      license: linkedLicense,
      issues: result.issues || [],
      isCompliant: result.isCompliant,
    };

    if (typeof setVerificationResult === "function") {
      setVerificationResult(preparedResult);
    }

    if (typeof onNavigate === "function") {
      onNavigate("create-case");
    }
  };

  const renderVehicleResult = () => {
    const vehicle = result?.vehicle;
    const owner = vehicle?.owner;
    const issues = result?.issues || [];
    const authorizedDrivers = result?.authorizedDrivers || [];
    const driverAuthorization = result?.driverAuthorization;

    if (!vehicle) return null;

    return (
      <div className="animate-fade-in space-y-4">
        <div
          className={`rounded-2xl border p-5 flex items-center gap-4 ${result.isCompliant
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
            }`}
        >
          {result.isCompliant ? (
            <CheckCircle size={34} className="text-green-500 shrink-0" />
          ) : (
            <AlertTriangle size={34} className="text-red-500 shrink-0" />
          )}

          <div className="flex-1">
            <h3
              className={`text-lg font-bold ${result.isCompliant ? "text-green-700" : "text-red-700"
                }`}
            >
              {result.isCompliant
                ? "Vehicle is Compliant"
                : "Vehicle Has Issues"}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {getVehiclePlate(vehicle)} — {vehicle.brand || "N/A"}{" "}
              {vehicle.model || ""}
            </p>
          </div>

          {!result.isCompliant && (
            <button
              type="button"
              onClick={handleCreateCase}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              <FileWarning size={16} />
              Issue E-Challan
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Car size={16} className="text-gray-600" />
            <h4 className="text-sm font-bold text-gray-800">
              Vehicle Information
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoItem label="Plate Number" value={getVehiclePlate(vehicle)} />
            <InfoItem
              label="Brand / Model"
              value={`${vehicle.brand || "N/A"} ${vehicle.model || ""}`}
            />
            <InfoItem label="Type" value={vehicle.vehicleType} />
            <InfoItem label="Color" value={vehicle.color} />
            <InfoItem label="Year" value={vehicle.year} />
            <InfoItem label="Engine No." value={vehicle.engineNumber} />
            <InfoItem label="Chassis No." value={vehicle.chassisNumber} />
            <InfoItem
              label="Safety Score"
              value={`${vehicle.safetyScore ?? 100}/100`}
            />

            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge>{vehicle.status}</StatusBadge>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <CalendarDays size={16} className="text-gray-600" />
            <h4 className="text-sm font-bold text-gray-800">
              Document Expiry Status
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["Registration", vehicle.registrationExpiry],
              ["Fitness Certificate", vehicle.fitnessExpiry],
              ["Tax Token", vehicle.taxTokenExpiry],
              ["Route Permit", vehicle.routePermitExpiry],
              ["Insurance", vehicle.insuranceExpiry],
            ].map(([label, date]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-green-600" />
                  <span className="text-sm font-semibold text-gray-800">
                    {label}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-green-700">VALID</p>
                  <p className="text-[11px] text-gray-500">
                    {formatDate(date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {owner && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-5">
              <UserRound size={16} className="text-gray-600" />
              <h4 className="text-sm font-bold text-gray-800">
                Owner Information
              </h4>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem label="Name" value={owner.name} />
              <InfoItem label="Email" value={owner.email} />
              <InfoItem label="Phone" value={owner.phone} />
              <InfoItem label="NID" value={owner.nid} />
              <InfoItem label="Role" value={owner.role} />

              <div>
                <p className="text-xs text-gray-400">Status</p>
                <div className="mt-1">
                  <StatusBadge>{owner.status}</StatusBadge>
                </div>
              </div>
            </div>
          </div>
        )}

        {driverAuthorization?.checked && (
          <div
            className={`rounded-2xl border p-5 ${driverAuthorization.authorized
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
              }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center ${driverAuthorization.authorized
                  ? "bg-green-100"
                  : "bg-red-100"
                  }`}
              >
                {driverAuthorization.authorized ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <AlertTriangle size={24} className="text-red-600" />
                )}
              </div>

              <div className="flex-1">
                <h3
                  className={`text-lg font-bold ${driverAuthorization.authorized
                    ? "text-green-700"
                    : "text-red-700"
                    }`}
                >
                  {driverAuthorization.authorized
                    ? "Driver Authorized"
                    : "Unauthorized Driver"}
                </h3>

                <p className="text-sm text-gray-600 mt-1">
                  {driverAuthorization.message}
                </p>

                {driverAuthorization.driver && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <InfoItem
                      label="Driver Name"
                      value={driverAuthorization.driver.name}
                    />
                    <InfoItem
                      label="Email"
                      value={driverAuthorization.driver.email}
                    />
                    <InfoItem
                      label="Phone"
                      value={driverAuthorization.driver.phone}
                    />
                    <InfoItem
                      label="NID"
                      value={driverAuthorization.driver.nid}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck size={16} className="text-gray-600" />
            <h4 className="text-sm font-bold text-gray-800">
              Authorized Drivers ({authorizedDrivers.length})
            </h4>
          </div>

          {authorizedDrivers.length === 0 ? (
            <p className="text-sm text-gray-500">No authorized driver found.</p>
          ) : (
            <div className="space-y-3">
              {authorizedDrivers.map((driver) => (
                <div
                  key={getId(driver)}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {driver.name || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {driver.email || "N/A"}{" "}
                      {driver.phone ? `• ${driver.phone}` : ""}
                    </p>
                  </div>

                  <StatusBadge>{driver.status}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <h4 className="text-sm font-bold text-red-600 mb-3">
              Issues Found ({issues.length})
            </h4>

            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={`${getIssueText(issue)}-${index}`}
                  className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3"
                >
                  <XCircle size={15} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-700">{getIssueText(issue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result.isCompliant && (
          <button
            type="button"
            onClick={handleCreateCase}
            className="sm:hidden w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            <FileWarning size={16} />
            Issue E-Challan
          </button>
        )}
      </div>
    );
  };

  const renderLicenseResult = () => {
    const license = result?.license;
    const driver = result?.driver;
    const issues = result?.issues || [];
    const authorizedVehicles = result?.authorizedVehicles || [];

    if (!license) return null;

    return (
      <div className="animate-fade-in space-y-4">
        <div
          className={`rounded-2xl border p-5 flex items-center gap-4 ${result.isCompliant
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
            }`}
        >
          {result.isCompliant ? (
            <CheckCircle size={34} className="text-green-500 shrink-0" />
          ) : (
            <AlertTriangle size={34} className="text-red-500 shrink-0" />
          )}

          <div>
            <h3
              className={`text-lg font-bold ${result.isCompliant ? "text-green-700" : "text-red-700"
                }`}
            >
              {result.isCompliant ? "License is Valid" : "License Has Issues"}
            </h3>

            <p className="text-sm text-gray-600 mt-1">
              {license.licenseNumber || "N/A"} —{" "}
              {license.holderName || "N/A"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <IdCard size={16} className="text-gray-600" />
            <h4 className="text-sm font-bold text-gray-800">
              License Information
            </h4>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <InfoItem label="License No." value={license.licenseNumber} />
            <InfoItem label="Driver Name" value={license.holderName} />
            <InfoItem label="Category" value={license.licenseClass} />
            <InfoItem label="NID" value={license.nid} />
            <InfoItem
              label="Date of Birth"
              value={formatDate(license.dateOfBirth)}
            />
            <InfoItem label="Issue Date" value={formatDate(license.issueDate)} />
            <InfoItem
              label="Expiry Date"
              value={formatDate(license.expiryDate)}
            />
            <InfoItem label="Authority" value={license.issuingAuthority} />

            <div>
              <p className="text-xs text-gray-400">Status</p>
              <div className="mt-1">
                <StatusBadge>{license.status}</StatusBadge>
              </div>
            </div>
          </div>
        </div>

        {driver && typeof driver === "object" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-5">
              <UserRound size={16} className="text-gray-600" />
              <h4 className="text-sm font-bold text-gray-800">
                Driver Account
              </h4>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoItem label="Name" value={getDriverName(driver)} />
              <InfoItem label="Email" value={driver.email} />
              <InfoItem label="Phone" value={driver.phone} />
              <InfoItem label="NID" value={driver.nid} />
              <InfoItem label="Role" value={driver.role} />

              <div>
                <p className="text-xs text-gray-400">Status</p>
                <div className="mt-1">
                  <StatusBadge>{driver.status}</StatusBadge>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Car size={16} className="text-gray-600" />
            <h4 className="text-sm font-bold text-gray-800">
              Authorized Vehicles ({authorizedVehicles.length})
            </h4>
          </div>

          {authorizedVehicles.length === 0 ? (
            <p className="text-sm text-gray-500">
              No authorized vehicle found.
            </p>
          ) : (
            <div className="space-y-3">
              {authorizedVehicles.map((vehicle) => (
                <div
                  key={getId(vehicle)}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {getVehiclePlate(vehicle)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {vehicle.brand || "N/A"} {vehicle.model || ""}
                    </p>
                  </div>

                  <StatusBadge>{vehicle.status}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>

        {issues.length > 0 && (
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            <h4 className="text-sm font-bold text-red-600 mb-3">
              Issues Found ({issues.length})
            </h4>

            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div
                  key={`${getIssueText(issue)}-${index}`}
                  className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3"
                >
                  <XCircle size={15} className="text-red-500 shrink-0" />
                  <span className="text-sm text-red-700">{getIssueText(issue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Verify Vehicle / Driver
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter a license plate number or driving license number to verify
          compliance status.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex flex-wrap gap-3 mb-5">
          <button
            type="button"
            onClick={() => handleModeChange("vehicle")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === "vehicle"
              ? "bg-[#0b4f86] text-white shadow"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            <Car size={16} />
            Vehicle Search
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("driver")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === "driver"
              ? "bg-[#0b4f86] text-white shadow"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
          >
            <IdCard size={16} />
            Driver Search
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              value={searchValue}
              onChange={(event) => {
                setSearchValue(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleVerify();
              }}
              placeholder={
                mode === "vehicle"
                  ? "Enter plate number e.g. SYL-METRO-GA-11-1234"
                  : "Enter license number e.g. DL-SYL-2026-001"
              }
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-[#0b4f86] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {mode === "vehicle" && (
            <div className="relative flex-1">
              <IdCard
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={driverLicenseValue}
                onChange={(event) => {
                  setDriverLicenseValue(event.target.value);
                  setError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleVerify();
                }}
                placeholder="Optional driver license no. for authorization check"
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm outline-none focus:border-[#0b4f86] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#0b4f86] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#083f6b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Try:</span>

          {mode === "vehicle" ? (
            <>
              <button
                type="button"
                onClick={() => setSearchValue("SYL-METRO-GA-11-1234")}
                className="text-blue-600 hover:underline"
              >
                SYL-METRO-GA-11-1234
              </button>

              <button
                type="button"
                onClick={() => setDriverLicenseValue("DL-SYL-2026-001")}
                className="text-blue-600 hover:underline"
              >
                DL-SYL-2026-001
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSearchValue("DL-SYL-2026-001")}
              className="text-blue-600 hover:underline"
            >
              DL-SYL-2026-001
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <XCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-red-700">Verification Failed</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && result?.type === "vehicle" && renderVehicleResult()}
      {!loading && result?.type === "license" && renderLicenseResult()}
    </div>
  );
}