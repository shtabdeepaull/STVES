const normalizePlate = (value = "") => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^STVES-VEH:/, "");
};

const normalizeLicense = (value = "") => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^STVES-LIC:/, "");
};

const buildVehicleQR = (plate) => {
  const cleanPlate = normalizePlate(plate);
  return `STVES-VEH:${cleanPlate}`;
};

const buildLicenseQR = (licenseNumber) => {
  const cleanLicense = normalizeLicense(licenseNumber);
  return `STVES-LIC:${cleanLicense}`;
};

module.exports = {
  normalizePlate,
  normalizeLicense,
  buildVehicleQR,
  buildLicenseQR,
};