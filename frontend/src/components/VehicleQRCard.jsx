// ============================================================
// Vehicle QR Card
// Prevents duplicate QR prefix like STVES-VEH:STVES-VEH:...
// ============================================================
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Car } from "lucide-react";
import { buildVehicleQRFromVehicle } from "../utils/qr";

const getPlateNumber = (vehicle) => {
  return (
    vehicle?.registrationNumber ||
    vehicle?.plateNumber ||
    vehicle?.plate ||
    "Unknown Plate"
  );
};

export default function VehicleQRCard({ vehicle, size = 150 }) {
  const qrValue = buildVehicleQRFromVehicle(vehicle);
  const plateNumber = getPlateNumber(vehicle);

  if (!vehicle) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
        <QrCode size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No vehicle data found</p>
      </div>
    );
  }

  if (!qrValue) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
        <QrCode size={32} className="mx-auto text-red-300 mb-2" />
        <p className="text-sm text-red-500">QR value missing</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Car size={18} className="text-blue-600" />
        <p className="text-sm font-semibold text-gray-800">{plateNumber}</p>
      </div>

      <div className="inline-block bg-white p-3 rounded-xl border border-gray-200">
        <QRCodeCanvas value={qrValue} size={size} includeMargin />
      </div>

      <p className="text-xs text-gray-400 mt-3 break-all">{qrValue}</p>
    </div>
  );
}