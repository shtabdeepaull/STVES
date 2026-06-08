// ============================================================
// Vehicle Owner Dashboard
// Backend connected + safe owner/vehicle/violation mapping
// ============================================================
import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Users,
  FileWarning,
  Shield,
  Plus,
  AlertTriangle,
  CheckCircle,
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

const isSameId = (a, b) => {
  return Boolean(a && b && String(a) === String(b));
};

const extractList = (response, key) => {
  const candidates = [
    response?.data,
    response?.data?.[key],
    response?.[key],
    response,
  ];

  const list = candidates.find((item) => Array.isArray(item));
  return list || [];
};

const getVehicleId = (vehicle) => vehicle?._id || vehicle?.id || "";
const getOwnerId = (vehicle) => getId(vehicle?.owner) || vehicle?.ownerId || "";
const getCurrentUserId = (user) => user?._id || user?.id || "";

const getPlateNumber = (vehicle) => {
  return (
    vehicle?.registrationNumber ||
    vehicle?.plateNumber ||
    vehicle?.plate ||
    "Unknown plate"
  );
};

const getSafetyScore = (vehicle) => {
  const score =
    vehicle?.safetyScore ??
    vehicle?.complianceScore ??
    vehicle?.verification?.score;

  if (typeof score === "number") return Math.max(0, Math.min(100, score));

  let calculated = 100;
  const today = new Date();

  const dateFields = [
    vehicle?.registrationExpiry,
    vehicle?.fitnessExpiry,
    vehicle?.taxTokenExpiry,
    vehicle?.routePermitExpiry,
    vehicle?.insuranceExpiry,
  ];

  dateFields.forEach((dateValue) => {
    if (!dateValue) return;
    const date = new Date(dateValue);
    if (!Number.isNaN(date.getTime()) && date < today) {
      calculated -= 15;
    }
  });

  if (vehicle?.status && vehicle.status !== "active") {
    calculated -= 30;
  }

  return Math.max(0, Math.min(100, calculated));
};

const isExpired = (dateValue) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
};

const hasVehicleIssues = (vehicle) => {
  return (
    vehicle?.status !== "active" ||
    isExpired(vehicle?.registrationExpiry) ||
    isExpired(vehicle?.fitnessExpiry) ||
    isExpired(vehicle?.taxTokenExpiry) ||
    isExpired(vehicle?.routePermitExpiry) ||
    isExpired(vehicle?.insuranceExpiry)
  );
};

const getAssignedDriverCount = (vehicle, assignments) => {
  const vehicleId = getVehicleId(vehicle);

  const assignmentCount = assignments.filter((assignment) => {
    const assignmentVehicleId = getId(assignment?.vehicle);
    const status = assignment?.status || "active";

    return isSameId(assignmentVehicleId, vehicleId) && status === "active";
  }).length;

  if (assignmentCount > 0) return assignmentCount;

  if (Array.isArray(vehicle?.assignedDrivers)) {
    return vehicle.assignedDrivers.length;
  }

  if (Array.isArray(vehicle?.authorizedDrivers)) {
    return vehicle.authorizedDrivers.length;
  }

  return 0;
};

const getUniqueAssignedDrivers = (assignments) => {
  const driverIds = assignments
    .filter((assignment) => (assignment?.status || "active") === "active")
    .map((assignment) => getId(assignment?.driver))
    .filter(Boolean);

  return new Set(driverIds).size;
};

export default function OwnerDashboard({ onNavigate = () => {} }) {
  const currentUser = useStore((s) => s.currentUser);
  const storeVehicles = useStore((s) => s.vehicles || []);
  const storeViolations = useStore((s) => s.violations || []);

  const [apiVehicles, setApiVehicles] = useState([]);
  const [apiViolations, setApiViolations] = useState([]);
  const [apiAssignments, setApiAssignments] = useState([]);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUserId = getCurrentUserId(currentUser);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [vehiclesResult, violationsResult, assignmentsResult] =
        await Promise.allSettled([
          api.getMyVehicles(),
          api.getMyViolations(),
          api.getMyAssignments(),
        ]);

      const vehicles =
        vehiclesResult.status === "fulfilled"
          ? extractList(vehiclesResult.value, "vehicles")
          : [];

      const violations =
        violationsResult.status === "fulfilled"
          ? extractList(violationsResult.value, "violations")
          : [];

      const assignments =
        assignmentsResult.status === "fulfilled"
          ? extractList(assignmentsResult.value, "assignments")
          : [];

      setApiVehicles(vehicles);
      setApiViolations(violations);
      setApiAssignments(assignments);
      setApiLoaded(true);

      const failed = [vehiclesResult, violationsResult, assignmentsResult].find(
        (item) => item.status === "rejected"
      );

      if (failed) {
        setError("Some owner dashboard data could not be loaded.");
      }
    } catch (err) {
      console.error("Owner dashboard load failed:", err);
      setError(err.message || "Failed to load owner dashboard.");
      setApiLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fallbackVehicles = useMemo(() => {
    return storeVehicles.filter((vehicle) =>
      isSameId(getOwnerId(vehicle), currentUserId)
    );
  }, [storeVehicles, currentUserId]);

  const myVehicles = apiLoaded ? apiVehicles : fallbackVehicles;

  const fallbackViolations = useMemo(() => {
    const myVehicleIds = fallbackVehicles.map(getVehicleId).filter(Boolean);

    return storeViolations.filter((violation) => {
      const violationVehicleId = getId(violation?.vehicle) || violation?.vehicleId;
      return myVehicleIds.some((id) => isSameId(id, violationVehicleId));
    });
  }, [storeViolations, fallbackVehicles]);

  const myViolations = apiLoaded ? apiViolations : fallbackViolations;

  const totalDriversFromAssignments = getUniqueAssignedDrivers(apiAssignments);

  const totalDrivers =
    totalDriversFromAssignments > 0
      ? totalDriversFromAssignments
      : myVehicles.reduce((sum, vehicle) => {
          return sum + getAssignedDriverCount(vehicle, apiAssignments);
        }, 0);

  const avgSafetyScore =
    myVehicles.length > 0
      ? Math.round(
          myVehicles.reduce((sum, vehicle) => sum + getSafetyScore(vehicle), 0) /
            myVehicles.length
        )
      : 0;

  if (loading && myVehicles.length === 0 && myViolations.length === 0) {
    return (
      <div className="animate-fade-in">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Loader2
            size={42}
            className="mx-auto mb-3 text-blue-500 animate-spin"
          />
          <h3 className="text-lg font-semibold text-gray-700">
            Loading Owner Dashboard...
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Please wait while we fetch your vehicles and violations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm">Welcome,</p>
            <h1 className="text-2xl font-bold mt-1">
              {currentUser?.name || "Vehicle Owner"}
            </h1>
            <p className="text-sm text-blue-200 mt-1">
              Vehicle Owner Dashboard
            </p>
          </div>

          <button
            onClick={loadDashboard}
            disabled={loading}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm hover:bg-white/20 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <p className="text-xs text-orange-100 mt-3">
            {error} Showing available data where possible.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer hover:shadow-md"
          onClick={() => onNavigate("my-vehicles")}
        >
          <Car size={24} className="text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{myVehicles.length}</p>
          <p className="text-xs text-gray-500">My Vehicles</p>
        </div>

        <div
          className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer hover:shadow-md"
          onClick={() => onNavigate("assign-drivers")}
        >
          <Users size={24} className="text-green-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{totalDrivers}</p>
          <p className="text-xs text-gray-500">Assigned Drivers</p>
        </div>

        <div
          className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer hover:shadow-md"
          onClick={() => onNavigate("owner-violations")}
        >
          <FileWarning size={24} className="text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">
            {myViolations.length}
          </p>
          <p className="text-xs text-gray-500">Violations</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <Shield size={24} className="text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-gray-800">{avgSafetyScore}</p>
          <p className="text-xs text-gray-500">Avg Safety Score</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">My Vehicles</h2>
          <button
            onClick={() => onNavigate("my-vehicles")}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <Plus size={14} />
            Register New Vehicle
          </button>
        </div>

        {myVehicles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Car size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No vehicles registered yet</p>
            <button
              onClick={() => onNavigate("my-vehicles")}
              className="mt-3 px-4 py-2 bg-[#0f4c81] text-white rounded-lg text-sm font-medium"
            >
              Register Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {myVehicles.map((vehicle) => {
              const vehicleId = getVehicleId(vehicle);
              const safetyScore = getSafetyScore(vehicle);
              const hasIssues = hasVehicleIssues(vehicle);
              const assignedDriverCount = getAssignedDriverCount(
                vehicle,
                apiAssignments
              );

              return (
                <div
                  key={vehicleId || getPlateNumber(vehicle)}
                  className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
                    hasIssues ? "border-red-200" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">
                        {getPlateNumber(vehicle)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {vehicle?.brand || "Unknown brand"}{" "}
                        {vehicle?.model || ""}{" "}
                        {vehicle?.year ? `(${vehicle.year})` : ""}
                      </p>
                    </div>

                    {hasIssues ? (
                      <AlertTriangle size={20} className="text-red-500" />
                    ) : (
                      <CheckCircle size={20} className="text-green-500" />
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">Safety:</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          safetyScore >= 80
                            ? "bg-green-500"
                            : safetyScore >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${safetyScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700">
                      {safetyScore}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {vehicle?.vehicleType || "Vehicle"} |{" "}
                      {vehicle?.color || "Unknown color"}
                    </span>
                    <span>{assignedDriverCount} driver(s)</span>
                  </div>

                  {hasIssues && (
                    <p className="mt-3 text-xs text-red-500">
                      This vehicle has compliance issues. Please check document
                      expiry/status.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}