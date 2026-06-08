// ============================================================
// QR Utility Helpers for STVES
// Keeps QR generation and parsing consistent across frontend
// ============================================================

export const QR_TYPES = {
  VEHICLE: "STVES-VEH",
  LICENSE: "STVES-LIC",
};

export const cleanQRInput = (value = "") => {
  return String(value || "").trim();
};

export const normalizeVehicleQR = (value = "") => {
  const raw = cleanQRInput(value);

  if (!raw) return "";

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    return raw;
  }

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    return raw;
  }

  return `${QR_TYPES.VEHICLE}:${raw}`;
};

export const normalizeLicenseQR = (value = "") => {
  const raw = cleanQRInput(value);

  if (!raw) return "";

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    return raw;
  }

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    return raw;
  }

  return `${QR_TYPES.LICENSE}:${raw}`;
};

export const parseSTVESQR = (value = "") => {
  const raw = cleanQRInput(value);

  if (!raw) {
    return {
      valid: false,
      type: null,
      value: "",
      raw,
      message: "QR value is empty.",
    };
  }

  if (raw.startsWith(`${QR_TYPES.VEHICLE}:`)) {
    const plate = raw.replace(`${QR_TYPES.VEHICLE}:`, "").trim();

    return {
      valid: Boolean(plate),
      type: "vehicle",
      value: plate,
      plate,
      raw,
      message: plate ? "Vehicle QR parsed." : "Vehicle QR value is empty.",
    };
  }

  if (raw.startsWith(`${QR_TYPES.LICENSE}:`)) {
    const licenseNumber = raw.replace(`${QR_TYPES.LICENSE}:`, "").trim();

    return {
      valid: Boolean(licenseNumber),
      type: "license",
      value: licenseNumber,
      licenseNumber,
      raw,
      message: licenseNumber
        ? "License QR parsed."
        : "License QR value is empty.",
    };
  }

  return {
    valid: false,
    type: null,
    value: raw,
    raw,
    message: "Invalid STVES QR format.",
  };
};

export const buildVehicleQRFromVehicle = (vehicle = {}) => {
  return normalizeVehicleQR(
    vehicle.qrCode ||
      vehicle.registrationNumber ||
      vehicle.plateNumber ||
      vehicle.plate ||
      ""
  );
};

export const buildLicenseQRFromLicense = (license = {}) => {
  return normalizeLicenseQR(
    license.qrCode ||
      license.licenseNumber ||
      license.number ||
      ""
  );
};