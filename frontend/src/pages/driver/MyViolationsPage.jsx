// ============================================================
// My Violations Page - Driver/Owner violation history
// Backend connected + safe object/id mapping + no direct fetch
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  FileWarning,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import useStore from "../../store/useStore";
import api from "../../lib/api";

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getCurrentUserId = (currentUser) => {
  return currentUser?._id || currentUser?.id || "";
};

const isSameId = (a, b) => {
  return Boolean(a && b && String(a) === String(b));
};

const extractViolations = (response) => {
  const candidates = [
    response?.data,
    response?.data?.violations,
    response?.data?.cases,
    response?.violations,
    response?.cases,
    response,
  ];

  const list = candidates.find((item) => Array.isArray(item));
  return list || [];
};

const getViolationDriverId = (violation) => {
  return (
    getId(violation?.driver) ||
    violation?.driverId ||
    violation?.driver_id ||
    violation?.userId ||
    violation?.user_id ||
    ""
  );
};

const getViolationVehicleId = (violation) => {
  return getId(violation?.vehicle) || violation?.vehicleId || violation?.vehicle_id || "";
};

const getVehicleId = (vehicle) => {
  return vehicle?._id || vehicle?.id || "";
};

const getVehicleOwnerId = (vehicle) => {
  return getId(vehicle?.owner) || vehicle?.ownerId || vehicle?.owner_id || "";
};

const getFineAmount = (violation) => {
  return Number(
    violation?.fineAmount ??
      violation?.fine ??
      violation?.amount ??
      violation?.penalty ??
      0
  );
};

const getPlateNumber = (violation) => {
  return (
    violation?.vehicle?.registrationNumber ||
    violation?.vehicle?.plateNumber ||
    violation?.registrationNumber ||
    violation?.plateNumber ||
    "Unknown plate"
  );
};

const getOfficerName = (violation) => {
  return (
    violation?.officer?.name ||
    violation?.createdBy?.name ||
    violation?.officerName ||
    "Unknown officer"
  );
};

const getDescription = (violation) => {
  return (
    violation?.violationType ||
    violation?.violationLabel ||
    violation?.description ||
    violation?.offenseType ||
    violation?.reason ||
    "No description"
  );
};

const locationToText = (location) => {
  if (!location) return "No location provided";

  if (typeof location === "string") {
    return location;
  }

  if (typeof location === "object") {
    const parts = [
      location.address,
      location.city,
      location.lat && location.lng ? `${location.lat}, ${location.lng}` : "",
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : "No location provided";
  }

  return String(location);
};

const displayStatus = (violation) => {
  if (String(violation?.paymentStatus || "").toLowerCase() === "paid") {
    return "paid";
  }

  return String(violation?.status || "pending").toLowerCase();
};

const formatDate = (value) => {
  if (!value) return "Date missing";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date missing";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusConfig = {
  pending: {
    icon: Clock,
    color: "text-orange-600",
    bg: "bg-orange-100",
    label: "Pending",
  },
  approved: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
    label: "Approved",
  },
  dismissed: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Dismissed",
  },
  paid: {
    icon: CheckCircle,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Paid",
  },
};

export default function MyViolationsPage({ mode = "driver" }) {
  const currentUser = useStore((s) => s.currentUser);
  const storeViolations = useStore((s) => s.violations || []);
  const storeVehicles = useStore((s) => s.vehicles || []);

  const [apiViolations, setApiViolations] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUserId = getCurrentUserId(currentUser);

  const loadViolations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.getMyViolations();
      const list = extractViolations(response);

      setApiViolations(list);
      setApiLoaded(true);
    } catch (err) {
      console.error("My violations load failed:", err);
      setError(err.message || "Failed to load violations.");
      setApiLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadViolations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallbackFilteredViolations = useMemo(() => {
    if (mode === "owner") {
      const myVehicleIds = storeVehicles
        .filter((vehicle) => isSameId(getVehicleOwnerId(vehicle), currentUserId))
        .map((vehicle) => getVehicleId(vehicle))
        .filter(Boolean);

      return storeViolations.filter((violation) => {
        const violationVehicleId = getViolationVehicleId(violation);
        return myVehicleIds.some((id) => isSameId(id, violationVehicleId));
      });
    }

    return storeViolations.filter((violation) => {
      const driverId = getViolationDriverId(violation);
      return isSameId(driverId, currentUserId);
    });
  }, [mode, storeVehicles, storeViolations, currentUserId]);

  const myViolations = apiLoaded ? apiViolations : fallbackFilteredViolations;

  const totalFine = myViolations.reduce((sum, violation) => {
    return sum + getFineAmount(violation);
  }, 0);

  const pendingCount = myViolations.filter(
    (v) => displayStatus(v) === "pending"
  ).length;

  const approvedCount = myViolations.filter(
    (v) => displayStatus(v) === "approved"
  ).length;

  const paidCount = myViolations.filter((v) => displayStatus(v) === "paid").length;

  if (loading && myViolations.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Loader2
            size={42}
            className="mx-auto mb-3 text-blue-500 animate-spin"
          />
          <h3 className="text-lg font-semibold text-gray-700">
            Loading Violations...
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Please wait while we fetch your violation history.
          </p>
        </div>
      </div>
    );
  }

  if (error && myViolations.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 rounded-2xl border border-red-200 p-8">
          <div className="flex items-start gap-3">
            <XCircle size={26} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-700">
                Failed to Load Violations
              </h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={loadViolations}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {mode === "owner" ? "Vehicle Violations" : "My Violations"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {myViolations.length} violation(s) on record. Total fines: ৳
            {totalFine.toLocaleString()}
          </p>
          {error && (
            <p className="text-xs text-orange-600 mt-1">
              Backend request failed, showing available local data.
            </p>
          )}
        </div>

        <button
          onClick={loadViolations}
          disabled={loading}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-gray-800">
            {myViolations.length}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-blue-600">{paidCount}</p>
          <p className="text-xs text-gray-500">Paid</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-2xl font-bold text-red-600">
            ৳{totalFine.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Total Fines</p>
        </div>
      </div>

      {myViolations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileWarning size={48} className="mx-auto mb-3 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700">
            No Violations
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            {mode === "owner"
              ? "No violations found for your vehicles."
              : "You have a clean record. Keep it up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myViolations.map((violation, index) => {
            const status = displayStatus(violation);
            const config = statusConfig[status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const fineAmount = getFineAmount(violation);

            return (
              <div
                key={
                  violation._id ||
                  violation.id ||
                  violation.caseId ||
                  `violation-${index}`
                }
                className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0`}
                    >
                      <StatusIcon size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {violation.caseId || "Case ID missing"}
                      </p>

                      <p className="text-xs text-gray-500 mt-0.5">
                        {getDescription(violation)}
                      </p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                           {getPlateNumber(violation)}
                        </span>

                        <span className="text-xs text-gray-400">
                           {locationToText(violation.location)}
                        </span>

                        <span className="text-xs text-gray-400">
                          {getOfficerName(violation)}
                        </span>

                        <span className="text-xs text-gray-400">
                          {formatDate(violation.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-gray-800">
                      {fineAmount.toLocaleString()}
                    </p>

                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}