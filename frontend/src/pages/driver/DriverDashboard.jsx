// ============================================================
// Driver Dashboard - Overview of license status, violations
// Backend connected + object/id matching fixed
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  IdCard,
  FileWarning,
  Car,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import useStore from "../../store/useStore";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Request failed.");
  }

  return data;
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const isMine = (itemDriver, currentUser) => {
  const driverId = getId(itemDriver);
  const userId = currentUser?._id || currentUser?.id;
  return Boolean(driverId && userId && driverId === userId);
};

const normalizeArray = (value) => {
  return Array.isArray(value) ? value : [];
};

const uniqueByKey = (items) => {
  const map = new Map();

  items.forEach((item) => {
    if (!item) return;

    const key =
      item._id ||
      item.id ||
      item.registrationNumber ||
      item.plateNumber ||
      JSON.stringify(item);

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().split("T")[0];
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `৳${amount.toLocaleString()}`;
};

const getFineAmount = (violation) => {
  return (
    violation?.fineAmount ??
    violation?.fine ??
    violation?.amount ??
    violation?.penalty ??
    0
  );
};

const getViolationText = (violation) => {
  return (
    violation?.description ||
    violation?.violationType ||
    violation?.offenseType ||
    violation?.reason ||
    "Traffic violation"
  );
};

export default function DriverDashboard({ onNavigate }) {
  const currentUser = useStore((s) => s.currentUser);
  const storeLicenses = useStore((s) => s.licenses || []);
  const storeViolations = useStore((s) => s.violations || []);
  const storeVehicles = useStore((s) => s.vehicles || []);

  const [apiLicenses, setApiLicenses] = useState([]);
  const [apiViolations, setApiViolations] = useState([]);
  const [apiVehicles, setApiVehicles] = useState([]);
  const [verifiedLicense, setVerifiedLicense] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    let ignore = false;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        const [licenseResult, violationResult, vehicleResult] =
          await Promise.allSettled([
            apiGet("/licenses"),
            apiGet("/violations"),
            apiGet("/vehicles"),
          ]);

        const licenseList =
          licenseResult.status === "fulfilled"
            ? normalizeArray(licenseResult.value?.licenses)
            : [];

        const violationList =
          violationResult.status === "fulfilled"
            ? normalizeArray(
                violationResult.value?.violations ||
                  violationResult.value?.cases
              )
            : [];

        const vehicleList =
          vehicleResult.status === "fulfilled"
            ? normalizeArray(vehicleResult.value?.vehicles)
            : [];

        const foundLicense = licenseList.find((license) => {
          if (isMine(license.driver, currentUser)) return true;

          const directDriverId =
            license.driverId ||
            license.driver_id ||
            license.userId ||
            license.user_id;

          return (
            directDriverId &&
            currentUserId &&
            String(directDriverId) === String(currentUserId)
          );
        });

        let verifyLicenseData = null;

        if (foundLicense?.licenseNumber) {
          try {
            const verifyResponse = await apiGet(
              `/licenses/verify/${encodeURIComponent(
                foundLicense.licenseNumber
              )}`
            );

            verifyLicenseData = {
              ...foundLicense,
              ...(verifyResponse?.license || {}),
              driver:
                verifyResponse?.license?.driver ||
                verifyResponse?.driver ||
                foundLicense?.driver,
              authorizedVehicles:
                verifyResponse?.authorizedVehicles ||
                verifyResponse?.license?.authorizedVehicles ||
                foundLicense?.authorizedVehicles ||
                [],
              verification: verifyResponse?.verification || null,
            };
          } catch (err) {
            console.warn("License verify skipped:", err.message);
          }
        }

        if (!ignore) {
          setApiLicenses(licenseList);
          setApiViolations(violationList);
          setApiVehicles(vehicleList);
          setVerifiedLicense(verifyLicenseData);
        }
      } catch (err) {
        console.error("Driver dashboard load failed:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      ignore = true;
    };
  }, [currentUser, currentUserId]);

  const licenses = useMemo(() => {
    return apiLicenses.length > 0 ? apiLicenses : storeLicenses;
  }, [apiLicenses, storeLicenses]);

  const violations = useMemo(() => {
    return apiViolations.length > 0 ? apiViolations : storeViolations;
  }, [apiViolations, storeViolations]);

  const vehicles = useMemo(() => {
    return apiVehicles.length > 0 ? apiVehicles : storeVehicles;
  }, [apiVehicles, storeVehicles]);

  const fallbackLicense = useMemo(() => {
    return licenses.find((license) => {
      if (isMine(license.driver, currentUser)) return true;

      const directDriverId =
        license.driverId ||
        license.driver_id ||
        license.userId ||
        license.user_id;

      return (
        directDriverId &&
        currentUserId &&
        String(directDriverId) === String(currentUserId)
      );
    });
  }, [licenses, currentUser, currentUserId]);

  const myLicense = verifiedLicense || fallbackLicense;

  const myViolations = useMemo(() => {
    return violations.filter((violation) => {
      if (isMine(violation.driver, currentUser)) return true;

      const directDriverId =
        violation.driverId ||
        violation.driver_id ||
        violation.userId ||
        violation.user_id;

      return (
        directDriverId &&
        currentUserId &&
        String(directDriverId) === String(currentUserId)
      );
    });
  }, [violations, currentUser, currentUserId]);

  const myVehicles = useMemo(() => {
    const vehiclesFromLicense = normalizeArray(
      myLicense?.authorizedVehicles || myLicense?.assignedVehicles
    );

    const vehicleIdsFromLicense = vehiclesFromLicense.map((vehicle) =>
      getId(vehicle)
    );

    const registrationNumbersFromLicense = vehiclesFromLicense
      .map((vehicle) => vehicle?.registrationNumber || vehicle?.plateNumber)
      .filter(Boolean);

    const vehiclesFromVehicleList = vehicles.filter((vehicle) => {
      const assignedDrivers = normalizeArray(
        vehicle.assignedDrivers || vehicle.authorizedDrivers
      );

      const assignedDriverMatched = assignedDrivers.some((driver) => {
        return getId(driver) === currentUserId || String(driver) === currentUserId;
      });

      const vehicleIdMatched = vehicleIdsFromLicense.includes(
        vehicle._id || vehicle.id
      );

      const registrationMatched = registrationNumbersFromLicense.includes(
        vehicle.registrationNumber || vehicle.plateNumber
      );

      return assignedDriverMatched || vehicleIdMatched || registrationMatched;
    });

    return uniqueByKey([...vehiclesFromLicense, ...vehiclesFromVehicleList]);
  }, [myLicense, vehicles, currentUserId]);

  const today = new Date().toISOString().split("T")[0];

  const licenseExpiry =
    myLicense?.expiryDate || myLicense?.expiry || myLicense?.validTill;

  const licenseStatus = String(myLicense?.status || "").toLowerCase();
  const licenseExpired = licenseExpiry
    ? toDateInputValue(licenseExpiry) < today
    : false;

  const licenseValid =
    Boolean(myLicense) && licenseStatus === "valid" && !licenseExpired;

  const licenseWarning =
    Boolean(myLicense) &&
    !licenseValid &&
    (licenseStatus === "suspended" ||
      licenseStatus === "revoked" ||
      licenseExpired);

  const totalFines = myViolations.reduce((sum, violation) => {
    return sum + Number(getFineAmount(violation) || 0);
  }, 0);

  if (loading && !myLicense && storeLicenses.length === 0) {
    return (
      <div className="animate-fade-in space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Loader2
            size={42}
            className="mx-auto mb-3 text-blue-500 animate-spin"
          />
          <h3 className="text-lg font-semibold text-gray-700">
            Loading Dashboard...
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Please wait while we load your latest driver information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <p className="text-blue-200 text-sm">Welcome,</p>
        <h1 className="text-2xl font-bold mt-1">
          {currentUser?.name || "Driver"}
        </h1>
        <p className="text-sm text-blue-200 mt-1">Driver Dashboard</p>
      </div>

      <div
        className={`rounded-2xl p-5 border ${
          licenseValid
            ? "bg-green-50 border-green-200"
            : licenseWarning
            ? "bg-orange-50 border-orange-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className="flex items-center gap-3">
          {licenseValid ? (
            <CheckCircle size={28} className="text-green-500" />
          ) : (
            <AlertTriangle
              size={28}
              className={licenseWarning ? "text-orange-500" : "text-red-500"}
            />
          )}

          <div>
            <h3
              className={`text-lg font-bold ${
                licenseValid
                  ? "text-green-700"
                  : licenseWarning
                  ? "text-orange-700"
                  : "text-red-700"
              }`}
            >
              {myLicense
                ? licenseValid
                  ? "✅ License is Valid"
                  : "⚠️ License Issue Detected"
                : "❌ No License Found"}
            </h3>

            {myLicense ? (
              <p className="text-sm text-gray-600 mt-0.5">
                {myLicense.licenseNumber || "N/A"} | Status:{" "}
                {(myLicense.status || "unknown").toUpperCase()} | Expires:{" "}
                {formatDate(licenseExpiry)}
              </p>
            ) : (
              <p className="text-sm text-gray-600 mt-0.5">
                Your driving license is not yet registered in the system.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigate?.("my-license")}
          className="bg-white rounded-xl p-4 border border-gray-100 text-center hover:shadow-md transition"
        >
          <IdCard size={24} className="mx-auto text-blue-500 mb-2" />
          <p className="text-xl font-bold text-gray-800">
            {myLicense ? 1 : 0}
          </p>
          <p className="text-xs text-gray-500">License</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("my-violations")}
          className="bg-white rounded-xl p-4 border border-gray-100 text-center hover:shadow-md transition"
        >
          <FileWarning size={24} className="mx-auto text-orange-500 mb-2" />
          <p className="text-xl font-bold text-gray-800">
            {myViolations.length}
          </p>
          <p className="text-xs text-gray-500">Violations</p>
        </button>

        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <Car size={24} className="mx-auto text-green-500 mb-2" />
          <p className="text-xl font-bold text-gray-800">{myVehicles.length}</p>
          <p className="text-xs text-gray-500">Assigned Vehicles</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate?.("my-license")}
          className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md text-left transition"
        >
          <IdCard size={24} className="text-blue-500 mb-2" />
          <p className="font-semibold text-gray-800">View License Details</p>
          <p className="text-xs text-gray-400 mt-1">
            Check your license information and validity
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.("my-violations")}
          className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md text-left transition"
        >
          <FileWarning size={24} className="text-orange-500 mb-2" />
          <p className="font-semibold text-gray-800">Violation History</p>
          <p className="text-xs text-gray-400 mt-1">
            View all cases and fine details
          </p>
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400">Total Fine Amount</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {formatCurrency(totalFines)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <p className="text-xs text-gray-400">Assigned Vehicle</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">
            {myVehicles.length}
          </p>
        </div>
      </div>

      {myVehicles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">
            Assigned Vehicles
          </h3>

          <div className="space-y-2">
            {myVehicles.slice(0, 3).map((vehicle, index) => (
              <div
                key={vehicle._id || vehicle.id || vehicle.registrationNumber || index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {vehicle.registrationNumber || vehicle.plateNumber || "N/A"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {vehicle.brand || "N/A"} {vehicle.model || ""}
                  </p>
                </div>

                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    vehicle.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {vehicle.status || "active"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {myViolations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-800 mb-3">
            Recent Violations
          </h3>

          <div className="space-y-2">
            {myViolations.slice(0, 3).map((violation, index) => {
              const description = getViolationText(violation);
              const status = String(violation.status || "pending").toLowerCase();

              return (
                <div
                  key={violation._id || violation.id || violation.caseId || index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {violation.caseId || violation._id || "N/A"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {description.length > 50
                        ? `${description.slice(0, 50)}...`
                        : description}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">
                      {formatCurrency(getFineAmount(violation))}
                    </p>
                    <span
                      className={`text-xs ${
                        status === "pending"
                          ? "text-orange-500"
                          : status === "approved"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}