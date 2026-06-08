// ============================================================
// E-Challan View Component
// Printable violation case document
// ============================================================
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Printer, X } from 'lucide-react';
export default function EChallanView({ violation, onClose }) {
    const handlePrint = () => {
        window.print();
    };
    return (<div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 animate-fade-in">
        {/* Actions bar (hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <h3 className="font-semibold text-gray-800">E-Challan Details</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-[#0f4c81] text-white rounded-lg text-sm font-medium hover:bg-[#0a3d6a]">
              <Printer size={16}/>
              Print
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* E-Challan Document */}
        <div className="p-8 print:p-4" id="echallan-print">
          {/* Header */}
          <div className="text-center border-b-2 border-gray-200 pb-6 mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-[#0f4c81] to-[#1a73e8] rounded-xl flex items-center justify-center print:bg-gray-800">
                <Shield size={24} className="text-white"/>
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-800">STVES</h1>
                <p className="text-xs text-gray-500">Smart Traffic Verification & Enforcement System</p>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold text-red-600">TRAFFIC VIOLATION NOTICE</h2>
              <p className="text-sm text-gray-500 mt-1">E-Challan / Digital Case Document</p>
            </div>
          </div>

          {/* Case ID and QR */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Case Reference</p>
              <p className="text-2xl font-bold font-mono text-gray-800">{violation.caseId}</p>
              <p className="text-xs text-gray-400 mt-1">
                Issued: {new Date(violation.createdAt).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })}
              </p>
            </div>
            <div className="text-center">
              <QRCodeSVG value={`STVES-CASE:${violation.caseId}`} size={80} level="M"/>
              <p className="text-[10px] text-gray-400 mt-1">Scan to verify</p>
            </div>
          </div>

          {/* Vehicle & Driver Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Vehicle Information</h4>
              <div className="space-y-2">
                <InfoLine label="Plate Number" value={violation.plateNumber} highlight/>
                <InfoLine label="Vehicle ID" value={violation.vehicleId}/>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Driver Information</h4>
              <div className="space-y-2">
                <InfoLine label="Name" value={violation.driverName || 'Unknown'} highlight/>
                <InfoLine label="Driver ID" value={violation.driverId || 'N/A'}/>
              </div>
            </div>
          </div>

          {/* Violation Details */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-3">Violation Details</h4>
            <div className="space-y-2">
              <InfoLine label="Type" value={violation.violationType}/>
              <InfoLine label="Description" value={violation.description}/>
              <InfoLine label="Location" value={violation.location}/>
            </div>
          </div>

          {/* Fine Amount */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-center">
            <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Fine Amount</p>
            <p className="text-4xl font-bold text-orange-600">৳{violation.fineAmount.toLocaleString()}</p>
            <p className="text-xs text-orange-500 mt-1">Bangladesh Taka</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
            <div>
              <p className="text-xs text-gray-400">Case Status</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-bold ${violation.status === 'pending' ? 'bg-orange-100 text-orange-700' :
            violation.status === 'approved' ? 'bg-green-100 text-green-700' :
                violation.status === 'dismissed' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'}`}>
                {violation.status.toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Issuing Officer</p>
              <p className="text-sm font-medium text-gray-700">{violation.officerName}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
            <p>This is a computer-generated document from STVES.</p>
            <p className="mt-1">For queries, contact the issuing traffic zone or visit stves.gov.bd</p>
            <p className="mt-2 font-mono">{violation.id}</p>
          </div>
        </div>
      </div>
    </div>);
}
function InfoLine({ label, value, highlight }) {
    return (<div className="flex justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-gray-800' : 'text-gray-700'}`}>{value}</span>
    </div>);
}
// Print-specific styles
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  #echallan-print, #echallan-print * {
    visibility: visible;
  }
  #echallan-print {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .print\\:hidden {
    display: none !important;
  }
}
`;
// Inject print styles
if (typeof document !== 'undefined') {
    const styleEl = document.createElement('style');
    styleEl.textContent = printStyles;
    document.head.appendChild(styleEl);
}
