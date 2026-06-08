// ============================================================
// My License Page - Driver views their license details + QR code
// Backend connected + driver object/id matching fixed
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  IdCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  MapPin,
  Droplets,
  Loader2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
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

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().split("T")[0];
};

export default function MyLicensePage() {
  const currentUser = useStore((s) => s.currentUser);
  const storeLicenses = useStore((s) => s.licenses || []);

  const [apiLicenses, setApiLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUserId = currentUser?._id || currentUser?.id;

  useEffect(() => {
    let ignore = false;

    const fetchLicenses = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getToken();

        const response = await fetch(`${API_BASE_URL}/licenses`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.message || data?.error || "Failed to load license data."
          );
        }

        if (!ignore) {
          setApiLicenses(Array.isArray(data.licenses) ? data.licenses : []);
        }
      } catch (err) {
        console.error("My License fetch failed:", err);
        if (!ignore) {
          setError(err.message || "Failed to load license data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchLicenses();

    return () => {
      ignore = true;
    };
  }, []);

  const licenses = useMemo(() => {
    return apiLicenses.length > 0 ? apiLicenses : storeLicenses;
  }, [apiLicenses, storeLicenses]);

  const myLicense = useMemo(() => {
    return licenses.find((license) => {
      if (isMine(license.driver, currentUser)) return true;

      const directDriverId =
        license.driverId ||
        license.driver_id ||
        license.userId ||
        license.user_id;

      return directDriverId && currentUserId && directDriverId === currentUserId;
    });
  }, [licenses, currentUser, currentUserId]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Loader2 size={42} className="mx-auto mb-3 text-blue-500 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-700">
            Loading License...
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Please wait while we fetch your driving license information.
          </p>
        </div>
      </div>
    );
  }

  if (error && !myLicense) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 rounded-2xl border border-red-200 p-8">
          <div className="flex items-start gap-3">
            <XCircle size={26} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-700">
                Failed to Load License
              </h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!myLicense) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <IdCard size={48} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700">
            No License Found
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Your driving license is not yet registered in the system.
          </p>
        </div>
      </div>
    );
  }

  const licenseNumber = myLicense.licenseNumber || "N/A";
  const driverName =
    myLicense.holderName ||
    myLicense.driverName ||
    myLicense.driver?.name ||
    currentUser?.name ||
    "N/A";

  const category = myLicense.licenseClass || myLicense.category || "N/A";
  const nid = myLicense.nid || myLicense.driver?.nid || currentUser?.nid || "N/A";
  const bloodGroup = myLicense.bloodGroup || "N/A";
  const address = myLicense.address || "N/A";
  const issueDateRaw = myLicense.issueDate;
  const expiryDateRaw = myLicense.expiryDate || myLicense.expiry;

  const today = new Date().toISOString().split("T")[0];
  const expiryValue = toDateInputValue(expiryDateRaw);

  const status = String(myLicense.status || "").toLowerCase();
  const isExpired = expiryValue ? expiryValue < today : false;
  const isSuspended = status === "suspended";
  const isRevoked = status === "revoked";
  const isValid = status === "valid" && !isExpired;

  const statusLabel = isValid
    ? "VALID"
    : isExpired
    ? "EXPIRED"
    : isSuspended
    ? "SUSPENDED"
    : isRevoked
    ? "REVOKED"
    : status
    ? status.toUpperCase()
    : "UNKNOWN";

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          My Driving License
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Digital copy of your BRTA driving license.
        </p>
      </div>

      <div
        className={`rounded-2xl overflow-hidden border-2 ${
          isValid ? "border-green-300" : "border-red-300"
        }`}
      >
        <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-blue-200 uppercase tracking-wider">
                People's Republic of Bangladesh
              </p>
              <p className="text-lg font-bold mt-1">DRIVING LICENSE</p>
              <p className="text-xs text-blue-200 mt-0.5">
                Bangladesh Road Transport Authority (BRTA)
              </p>
            </div>

            <div className="bg-white p-2 rounded-lg shrink-0">
              <QRCodeSVG
                value={`STVES-LIC:${licenseNumber}`}
                size={64}
                level="M"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5">
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Full Name</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {driverName}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400">License Number</p>
                <p className="text-sm font-mono font-semibold text-gray-800">
                  {licenseNumber}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Category</p>
                <p className="text-sm font-medium text-gray-800">
                  {category}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">NID Number</p>
                <p className="text-sm font-mono text-gray-800">{nid}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Droplets size={16} className="text-red-400" />
                <div>
                  <p className="text-xs text-gray-400">Blood Group</p>
                  <p className="text-sm font-bold text-red-600">
                    {bloodGroup}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Issue Date</p>
                  <p className="text-sm text-gray-800">
                    {formatDate(issueDateRaw)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar
                  size={16}
                  className={isExpired ? "text-red-400" : "text-gray-400"}
                />
                <div>
                  <p className="text-xs text-gray-400">Expiry Date</p>
                  <p
                    className={`text-sm font-semibold ${
                      isExpired ? "text-red-600" : "text-gray-800"
                    }`}
                  >
                    {formatDate(expiryDateRaw)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Address</p>
                  <p className="text-sm text-gray-800">{address}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`mt-6 p-3 rounded-xl flex items-center gap-3 ${
              isValid
                ? "bg-green-50 border border-green-200"
                : isExpired
                ? "bg-red-50 border border-red-200"
                : isSuspended
                ? "bg-orange-50 border border-orange-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            {isValid ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : isExpired ? (
              <XCircle size={20} className="text-red-500" />
            ) : (
              <AlertTriangle size={20} className="text-orange-500" />
            )}

            <div>
              <p
                className={`text-sm font-semibold ${
                  isValid
                    ? "text-green-700"
                    : isExpired
                    ? "text-red-700"
                    : isSuspended
                    ? "text-orange-700"
                    : "text-red-700"
                }`}
              >
                Status: {statusLabel}
              </p>

              {isExpired && (
                <p className="text-xs text-red-600 mt-0.5">
                  Your license expired on {formatDate(expiryDateRaw)}. Please
                  renew at the nearest BRTA office.
                </p>
              )}

              {isSuspended && (
                <p className="text-xs text-orange-600 mt-0.5">
                  Your license is currently suspended. Please contact the
                  authority.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}