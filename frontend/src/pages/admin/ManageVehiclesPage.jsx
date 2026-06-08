// ============================================================
// Manage Vehicles Page - Admin views and controls vehicle status
// Phase 3: suspend / blacklist / activate buttons connected to backend API
// ============================================================
import { useState } from 'react';
import { Car, Search, Eye, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import useStore from '../../store/useStore';

export default function ManageVehiclesPage() {
  const {
    vehicles,
    suspendVehicle,
    blacklistVehicle,
    activateVehicle,
    addLog,
    currentUser,
  } = useStore();

  const [searchQ, setSearchQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [updatingId, setUpdatingId] = useState('');

  let filtered = statusFilter === 'all' ? vehicles : vehicles.filter(v => v.status === statusFilter);

  if (searchQ) {
    const q = searchQ.toLowerCase();
    filtered = filtered.filter(v =>
      (v.plateNumber || '').toLowerCase().includes(q) ||
      (v.ownerName || '').toLowerCase().includes(q) ||
      (v.brand || '').toLowerCase().includes(q) ||
      (v.model || '').toLowerCase().includes(q)
    );
  }

  const handleVehicleAction = async (vehicleId, plate, action) => {
    try {
      setUpdatingId(vehicleId);

      if (action === 'suspend') await suspendVehicle(vehicleId);
      else if (action === 'blacklist') await blacklistVehicle(vehicleId);
      else await activateVehicle(vehicleId);

      if (currentUser) {
        addLog({
          userId: currentUser.id,
          userName: currentUser.name,
          action: `Vehicle ${action === 'activate' ? 'Activated' : action === 'suspend' ? 'Suspended' : 'Blacklisted'}`,
          details: `Vehicle ${plate} has been ${action === 'activate' ? 'activated' : action === 'suspend' ? 'suspended' : 'blacklisted'} by ${currentUser.name}.`,
          type: 'admin',
        });
      }
    } finally {
      setUpdatingId('');
    }
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-orange-100 text-orange-700',
    blacklisted: 'bg-red-100 text-red-700',
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Manage Vehicles</h1>
        <p className="text-sm text-gray-500 mt-1">{vehicles.length} vehicles registered.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by plate, owner, brand, or model..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/20"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'suspended', 'blacklisted'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                statusFilter === s ? 'bg-[#0f4c81] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          No vehicles found
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const isUpdating = updatingId === v.id;

            return (
              <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Car size={18} className="text-gray-400" />
                    <span className="font-bold text-gray-800">{v.plateNumber}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[v.status] || 'bg-gray-100 text-gray-600'}`}>
                    {v.status || 'active'}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-600">{v.brand} {v.model} ({v.year})</p>
                  <p className="text-gray-400 text-xs">Owner: {v.ownerName || 'N/A'}</p>
                  <p className="text-gray-400 text-xs">Type: {v.vehicleType} | Color: {v.color}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Safety:</span>
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          v.safetyScore >= 80 ? 'bg-green-500' : v.safetyScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${v.safetyScore || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{v.safetyScore || 0}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedVehicle(selectedVehicle === v.id ? null : v.id)}
                    className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                  >
                    <Eye size={14} />
                    {selectedVehicle === v.id ? 'Hide Details' : 'View Details'}
                  </button>

                  {v.status !== 'active' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleVehicleAction(v.id, v.plateNumber, 'activate')}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                      title="Activate"
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}

                  {v.status !== 'suspended' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleVehicleAction(v.id, v.plateNumber, 'suspend')}
                      className="p-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                      title="Suspend"
                    >
                      <AlertTriangle size={14} />
                    </button>
                  )}

                  {v.status !== 'blacklisted' && (
                    <button
                      disabled={isUpdating}
                      onClick={() => handleVehicleAction(v.id, v.plateNumber, 'blacklist')}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                      title="Blacklist"
                    >
                      <Ban size={14} />
                    </button>
                  )}
                </div>

                {selectedVehicle === v.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs animate-fade-in">
                    <DetailRow label="Engine No." value={v.engineNumber} />
                    <DetailRow label="Chassis No." value={v.chassisNumber} />
                    <DetailRow label="Registration Expiry" value={v.registrationExpiry} />
                    <DetailRow label="Fitness Expiry" value={v.fitnessExpiry} />
                    <DetailRow label="Tax Token Expiry" value={v.taxTokenExpiry} />
                    <DetailRow label="Route Permit Expiry" value={v.routePermitExpiry} />
                    <DetailRow label="Insurance Expiry" value={v.insuranceExpiry} />
                    <DetailRow label="Drivers Assigned" value={(v.assignedDrivers || []).length.toString()} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  const displayValue = value || 'N/A';
  const today = new Date().toISOString().split('T')[0];
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(displayValue);
  const isExpired = isDate && displayValue < today;

  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400">{label}</span>
      <span className={`font-medium text-right ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
        {displayValue} {isExpired && '⚠️'}
      </span>
    </div>
  );
}
