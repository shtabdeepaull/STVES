// ============================================================
// Assign Drivers Page - Owner assigns/removes drivers to vehicles
// ============================================================
import { useState } from "react";
import { Users, Car, Plus, X, CheckCircle, AlertTriangle } from "lucide-react";
import useStore from "../../store/useStore";

export default function AssignDriversPage() {
  const {
    currentUser,
    vehicles = [],
    users = [],
    licenses = [],
    assignments = [],
    assignDriver,
    removeDriver,
    addLog,
  } = useStore();

  // -----------------------------
  // Safe ID helpers for _id / id / object
  // -----------------------------
  const getId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value._id || value.id || "";
  };

  const isSameId = (a, b) => {
    const idA = getId(a);
    const idB = getId(b);
    return idA && idB && String(idA) === String(idB);
  };

  const getVehiclePlate = (vehicle) => {
    return vehicle?.plateNumber || vehicle?.registrationNumber || "Unknown Vehicle";
  };

  const getVehicleBrandModel = (vehicle) => {
    return `${vehicle?.brand || ""} ${vehicle?.model || ""}`.trim();
  };

  const getLicenseByDriver = (driverOrId) => {
    const driverId = getId(driverOrId);

    return licenses.find((license) => {
      return (
        isSameId(license.driverId, driverId) ||
        isSameId(license.driver, driverId) ||
        isSameId(license.userId, driverId) ||
        isSameId(license.owner, driverId)
      );
    });
  };

  const getDriverFromAssignment = (assignment) => {
    const rawDriver =
      assignment?.driver ||
      assignment?.driverId ||
      assignment?.authorizedDriver ||
      assignment;

    if (rawDriver && typeof rawDriver === "object" && (rawDriver.name || rawDriver.email)) {
      return rawDriver;
    }

    const driverId = getId(rawDriver);

    return users.find((user) => isSameId(user, driverId));
  };

  const getLicenseFromAssignment = (assignment) => {
    const directLicense = assignment?.license || assignment?.driverLicense;

    if (directLicense && typeof directLicense === "object") {
      return directLicense;
    }

    const driver = getDriverFromAssignment(assignment);
    const driverId =
      getId(driver) ||
      getId(assignment?.driver) ||
      getId(assignment?.driverId) ||
      getId(assignment);

    return getLicenseByDriver(driverId);
  };

  const getDriverName = (assignment) => {
    const driver = getDriverFromAssignment(assignment);
    const license = getLicenseFromAssignment(assignment);

    return (
      driver?.name ||
      assignment?.driverName ||
      assignment?.driver?.holderName ||
      license?.holderName ||
      assignment?.license?.holderName ||
      assignment?.driverLicense?.holderName ||
      "Unknown Driver"
    );
  };

  const getDriverEmail = (assignment) => {
    const driver = getDriverFromAssignment(assignment);
    return driver?.email || "";
  };

  const getDriverPhone = (assignment) => {
    const driver = getDriverFromAssignment(assignment);
    return driver?.phone || "";
  };

  const getLicenseNumber = (assignment) => {
    const license = getLicenseFromAssignment(assignment);

    return (
      license?.licenseNumber ||
      assignment?.license?.licenseNumber ||
      assignment?.driverLicense?.licenseNumber ||
      assignment?.driver?.licenseNumber ||
      "No license found"
    );
  };

  const getLicenseCategory = (assignment) => {
    const license = getLicenseFromAssignment(assignment);

    return (
      license?.category ||
      license?.licenseClass ||
      assignment?.license?.category ||
      assignment?.license?.licenseClass ||
      assignment?.driverLicense?.category ||
      assignment?.driverLicense?.licenseClass ||
      ""
    );
  };

  const getAssignmentsForVehicle = (vehicle) => {
    const vehicleId = getId(vehicle);

    const fromAssignmentCollection = assignments.filter((assignment) => {
      const assignmentVehicleId =
        getId(assignment.vehicle) ||
        getId(assignment.vehicleId);

      const isActive = !assignment.status || assignment.status === "active";

      return isSameId(assignmentVehicleId, vehicleId) && isActive;
    });

    if (fromAssignmentCollection.length > 0) {
      return fromAssignmentCollection;
    }

    const assignedDrivers = Array.isArray(vehicle?.assignedDrivers)
      ? vehicle.assignedDrivers
      : [];

    return assignedDrivers.map((driverItem) => {
      if (driverItem && typeof driverItem === "object" && driverItem.driver) {
        return driverItem;
      }

      return {
        vehicle,
        driver: driverItem,
      };
    });
  };

  const getAssignmentDriverId = (assignment) => {
    const driver = getDriverFromAssignment(assignment);

    return (
      getId(driver) ||
      getId(assignment?.driver) ||
      getId(assignment?.driverId) ||
      getId(assignment)
    );
  };

  const myVehicles = vehicles.filter((vehicle) => {
    const owner =
      vehicle.ownerId ||
      vehicle.owner ||
      vehicle.userId ||
      vehicle.createdBy;

    return isSameId(owner, currentUser);
  });

  const allDrivers = users.filter(
    (user) => user.role === "driver" && user.status === "active"
  );

  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    setMessage(null);

    if (!selectedVehicle || !selectedDriver) {
      setMessage({
        type: "error",
        text: "Please select both a vehicle and a driver.",
      });
      return;
    }

    const vehicle = vehicles.find((v) => isSameId(v, selectedVehicle));

    const alreadyAssigned = getAssignmentsForVehicle(vehicle).some((assignment) =>
      isSameId(getAssignmentDriverId(assignment), selectedDriver)
    );

    if (alreadyAssigned) {
      setMessage({
        type: "error",
        text: "This driver is already assigned to this vehicle.",
      });
      return;
    }

    setLoading(true);

    const result = await assignDriver(selectedVehicle, selectedDriver);

    setLoading(false);

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.message || "Driver assignment failed.",
      });
      return;
    }

    const driver = users.find((u) => isSameId(u, selectedDriver));

    if (currentUser && vehicle && driver) {
      addLog({
        userId: getId(currentUser),
        userName: currentUser.name,
        action: "Driver Assigned",
        details: `Driver ${driver.name} assigned to vehicle ${getVehiclePlate(vehicle)}.`,
        type: "system",
      });
    }

    setMessage({
      type: "success",
      text: result.message || "Driver assigned successfully!",
    });

    setSelectedDriver("");
  };

  const handleRemove = async (vehicleId, driverId, assignmentId = "") => {
    setMessage(null);

    const result = await removeDriver(vehicleId, driverId, assignmentId);

    if (!result.success) {
      setMessage({
        type: "error",
        text: result.message || "Driver removal failed.",
      });
      return;
    }

    const vehicle = vehicles.find((v) => isSameId(v, vehicleId));
    const driver = users.find((u) => isSameId(u, driverId));

    if (currentUser && vehicle && driver) {
      addLog({
        userId: getId(currentUser),
        userName: currentUser.name,
        action: "Driver Removed",
        details: `Driver ${driver.name} removed from vehicle ${getVehiclePlate(vehicle)}.`,
        type: "system",
      });
    }

    setMessage({
      type: "success",
      text: "Driver removed successfully.",
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Assign Drivers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Link authorized drivers to your vehicles.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-600"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {message.text}
        </div>
      )}

      {/* Assignment form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus size={18} />
          New Assignment
        </h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Select Vehicle
            </label>

            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            >
              <option value="">Choose...</option>

              {myVehicles.map((vehicle) => (
                <option key={getId(vehicle)} value={getId(vehicle)}>
                  {getVehiclePlate(vehicle)} — {getVehicleBrandModel(vehicle)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Select Driver
            </label>

            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
            >
              <option value="">Choose...</option>

              {allDrivers.map((driver) => {
                const dl = getLicenseByDriver(driver);

                return (
                  <option key={getId(driver)} value={getId(driver)}>
                    {driver.name}{" "}
                    {dl ? `(${dl.licenseNumber})` : "(No license)"}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleAssign}
              disabled={loading}
              className="w-full py-2.5 bg-[#0f4c81] text-white rounded-xl text-sm font-medium hover:bg-[#0a3d6a] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Users size={16} />
              {loading ? "Assigning..." : "Assign Driver"}
            </button>
          </div>
        </div>
      </div>

      {/* Current assignments */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          Current Assignments
        </h3>

        <div className="space-y-3">
          {myVehicles.map((vehicle) => {
            const vehicleAssignments = getAssignmentsForVehicle(vehicle);

            return (
              <div
                key={getId(vehicle)}
                className="bg-white rounded-xl border border-gray-100 p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Car size={18} className="text-gray-400" />
                  <p className="font-semibold text-gray-800">
                    {getVehiclePlate(vehicle)}
                  </p>
                  <span className="text-xs text-gray-400">
                    — {getVehicleBrandModel(vehicle)}
                  </span>
                </div>

                {vehicleAssignments.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    No drivers assigned
                  </p>
                ) : (
                  <div className="space-y-2">
                    {vehicleAssignments.map((assignment, index) => {
                      const driver = getDriverFromAssignment(assignment);
                      const driverId = getAssignmentDriverId(assignment);
                      const assignmentId = getId(assignment);
                      const licenseCategory = getLicenseCategory(assignment);

                      return (
                        <div
                          key={assignmentId || driverId || index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {getDriverName(assignment)?.charAt(0) || "D"}
                              </span>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {getDriverName(assignment)}
                              </p>

                              <p className="text-xs text-gray-400">
                                {getLicenseNumber(assignment)}
                                {licenseCategory ? ` | ${licenseCategory}` : ""}
                                {getDriverEmail(assignment)
                                  ? ` | ${getDriverEmail(assignment)}`
                                  : ""}
                                {getDriverPhone(assignment)
                                  ? ` | ${getDriverPhone(assignment)}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() =>
                              handleRemove(getId(vehicle), driverId, assignmentId)
                            }
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                            title="Remove driver"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}