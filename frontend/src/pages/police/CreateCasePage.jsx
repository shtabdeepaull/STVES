// ============================================================
// Create E-Challan / Digital Case Page
// Officers can create violation cases manually or from verification
// ============================================================
import { useState } from 'react';
import { FileWarning, CheckCircle, Search, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';
import { VIOLATION_TYPES } from '../../store/database';
export default function CreateCasePage({ verificationResult }) {
    const { createViolation, addLog, currentUser, vehicles, licenses } = useStore();
    // Form fields
    const [plateNumber, setPlateNumber] = useState(verificationResult?.vehicle?.plateNumber || '');
    const [selectedViolations, setSelectedViolations] = useState([]);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState('');
    // Look up vehicle from plate number
    const vehicle = vehicles.find(v => v.plateNumber.toLowerCase().replace(/\s/g, '') === plateNumber.toLowerCase().replace(/\s/g, ''));
    const assignedDriverLicense = vehicle
        ? licenses.find(l => vehicle.assignedDrivers.includes(l.driverId))
        : null;
    const totalFine = selectedViolations.reduce((sum, code) => {
        const vt = VIOLATION_TYPES.find(v => v.code === code);
        return sum + (vt?.fine || 0);
    }, 0);
    const toggleViolation = (code) => {
        setSelectedViolations(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(null);
        if (!plateNumber) {
            setError('Please enter a plate number.');
            return;
        }
        if (!vehicle) {
            setError('Vehicle not found in database. Please verify first.');
            return;
        }
        if (selectedViolations.length === 0) {
            setError('Please select at least one violation type.');
            return;
        }
        if (!location) {
            setError('Please enter the location.');
            return;
        }
        // Create cases for each selected violation using backend API
        const caseIds = [];
        try {
            for (const code of selectedViolations) {
                const vt = VIOLATION_TYPES.find(v => v.code === code);
                if (!vt)
                    continue;
                const caseId = await createViolation({
                    vehicleId: vehicle.id,
                    driverId: assignedDriverLicense?.driverId || '',
                    licenseId: assignedDriverLicense?.id || '',
                    officerId: currentUser?.id || '',
                    plateNumber: vehicle.plateNumber,
                    driverName: assignedDriverLicense?.driverName || 'Unknown',
                    officerName: currentUser?.name || '',
                    violationType: code,
                    violationLabel: vt.label,
                    description: `${vt.label}. ${description}`.trim(),
                    fineAmount: vt.fine,
                    status: 'pending',
                    location,
                    createdAt: new Date().toISOString(),
                });
                caseIds.push(caseId);
            }
        }
        catch (err) {
            setError(err.message || 'Failed to create E-Challan.');
            return;
        }
        // Log
        if (currentUser) {
            addLog({
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'E-Challan Issued',
                details: `${caseIds.length} case(s) issued: ${caseIds.join(', ')} for vehicle ${vehicle.plateNumber}. Total fine: ৳${totalFine.toLocaleString()}`,
                type: 'case',
            });
        }
        setSuccess(`${caseIds.length} E-Challan(s) created successfully! Case IDs: ${caseIds.join(', ')}`);
        // Reset form
        setSelectedViolations([]);
        setDescription('');
        setLocation('');
    };
    // Auto-detect violations from verification result
    const autoDetect = () => {
        if (!verificationResult?.issues)
            return;
        const detected = [];
        verificationResult.issues.forEach((issue) => {
            const lower = issue.toLowerCase();
            if (lower.includes('registration expired'))
                detected.push('REG_EXP');
            if (lower.includes('fitness'))
                detected.push('FIT_EXP');
            if (lower.includes('tax token'))
                detected.push('TAX_EXP');
            if (lower.includes('route permit'))
                detected.push('ROUTE_EXP');
            if (lower.includes('insurance'))
                detected.push('INS_EXP');
            if (lower.includes('blacklisted'))
                detected.push('BLACKLIST');
            if (lower.includes('suspended'))
                detected.push('BLACKLIST');
        });
        // Also check driver license
        if (assignedDriverLicense && assignedDriverLicense.status === 'expired') {
            detected.push('DL_EXP');
        }
        setSelectedViolations([...new Set(detected)]);
    };
    return (<div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Create E-Challan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Issue a digital enforcement case for detected violations.
        </p>
      </div>

      {/* Success message */}
      {success && (<div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3 animate-fade-in">
          <CheckCircle size={24} className="text-green-500 shrink-0 mt-0.5"/>
          <div>
            <h3 className="font-semibold text-green-700">E-Challan Created Successfully!</h3>
            <p className="text-sm text-green-600 mt-1">{success}</p>
          </div>
        </div>)}

      {error && (<div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
          <AlertTriangle size={20} className="text-red-500 shrink-0"/>
          <p className="text-sm text-red-600">{error}</p>
        </div>)}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle identification */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Vehicle Identification</h3>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input type="text" value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="Enter plate number" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
            </div>
          </div>

          {/* Resolved vehicle info */}
          {vehicle && (<div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-blue-400">Vehicle</p>
                  <p className="text-sm font-medium text-blue-800">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Owner</p>
                  <p className="text-sm font-medium text-blue-800">{vehicle.ownerName}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-400">Driver</p>
                  <p className="text-sm font-medium text-blue-800">{assignedDriverLicense?.driverName || 'No driver assigned'}</p>
                </div>
              </div>
            </div>)}
        </div>

        {/* Violation type selection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Violation Type(s)</h3>
            {verificationResult?.issues?.length > 0 && (<button type="button" onClick={autoDetect} className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium">
                ⚡ Auto-Detect from Verification
              </button>)}
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {VIOLATION_TYPES.map(vt => (<label key={vt.code} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedViolations.includes(vt.code)
                ? 'border-red-400 bg-red-50'
                : 'border-gray-100 hover:border-gray-200'}`}>
                <input type="checkbox" checked={selectedViolations.includes(vt.code)} onChange={() => toggleViolation(vt.code)} className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{vt.label}</p>
                  <p className="text-xs text-gray-400">Fine: ৳{vt.fine.toLocaleString()}</p>
                </div>
              </label>))}
          </div>
        </div>

        {/* Location & description */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Case Details</h3>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Location of Violation *</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Farmgate Intersection, Dhaka" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81]"/>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Additional Notes (Optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Additional notes about the violation..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20 focus:border-[#0f4c81] resize-none"/>
          </div>
        </div>

        {/* Summary & submit */}
        {selectedViolations.length > 0 && (<div className="bg-gradient-to-r from-[#0f4c81] to-[#1a73e8] rounded-2xl p-6 text-white">
            <h3 className="font-semibold mb-2">Case Summary</h3>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-blue-200">Violations</p>
                <p className="text-xl font-bold">{selectedViolations.length}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Total Fine</p>
                <p className="text-xl font-bold">৳{totalFine.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-blue-200">Officer</p>
                <p className="text-sm font-medium">{currentUser?.name} ({currentUser?.badge})</p>
              </div>
            </div>
          </div>)}

        <button type="submit" className="w-full py-3.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
          <FileWarning size={18}/>
          Issue E-Challan ({selectedViolations.length} violation{selectedViolations.length !== 1 ? 's' : ''})
        </button>
      </form>
    </div>);
}
